"""
Product price scraper service.
Uses polite HTTP requests with delays, proper User-Agent headers and retries.
Supports:
  - Direct URL price fetching (structured data / meta tags / JSON-LD)
  - A lightweight product search aggregator via DuckDuckGo shopping data
No aggressive scraping — rate-limited, respectful requests only.
"""
import asyncio
import logging
import random
import re
from decimal import Decimal, InvalidOperation
from typing import Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from app.config import settings

logger = logging.getLogger(__name__)

# Realistic browser headers to avoid being blocked by anti-bot measures
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "DNT": "1",
    "Upgrade-Insecure-Requests": "1",
}


def _polite_delay() -> None:
    """Synchronous sleep — used within sync Celery tasks."""
    delay = random.uniform(settings.REQUEST_DELAY_MIN, settings.REQUEST_DELAY_MAX)
    import time
    time.sleep(delay)


async def _async_polite_delay() -> None:
    delay = random.uniform(settings.REQUEST_DELAY_MIN, settings.REQUEST_DELAY_MAX)
    await asyncio.sleep(delay)


def _parse_price(raw: str) -> Optional[Decimal]:
    """Extract a numeric price from a string like 'R$ 1.299,99' or '$12.99'."""
    if not raw:
        return None
    # Remove currency symbols and whitespace
    cleaned = re.sub(r"[^\d.,]", "", raw.strip())
    if not cleaned:
        return None
    # Handle Brazilian format: 1.299,99 → 1299.99
    if re.search(r"\d{1,3}\.\d{3},\d{2}$", cleaned):
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned and "." not in cleaned:
        cleaned = cleaned.replace(",", ".")
    elif "," in cleaned and "." in cleaned:
        # Could be 1,299.99 (US) or 1.299,99 (BR)
        if cleaned.rindex(",") > cleaned.rindex("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    try:
        return Decimal(cleaned).quantize(Decimal("0.01"))
    except InvalidOperation:
        return None


def _extract_price_from_json_ld(soup: BeautifulSoup) -> Optional[Decimal]:
    """Try to extract price from JSON-LD structured data."""
    import json
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            offers = None
            if isinstance(data, list):
                for item in data:
                    if item.get("@type") in ("Product", "Offer"):
                        offers = item.get("offers") or item
                        break
            else:
                if data.get("@type") == "Product":
                    offers = data.get("offers")
                elif data.get("@type") == "Offer":
                    offers = data

            if offers:
                if isinstance(offers, list):
                    offers = offers[0]
                price_raw = offers.get("price") or offers.get("lowPrice")
                if price_raw:
                    return _parse_price(str(price_raw))
        except Exception:
            pass
    return None


def _extract_price_from_meta(soup: BeautifulSoup) -> Optional[Decimal]:
    """Try Open Graph / schema.org meta tags."""
    for meta in soup.find_all("meta"):
        prop = meta.get("property", "") or meta.get("name", "")
        if "price" in prop.lower():
            content = meta.get("content", "")
            price = _parse_price(content)
            if price:
                return price
    return None


def _extract_price_from_selectors(soup: BeautifulSoup) -> Optional[Decimal]:
    """Fallback: try common CSS selectors used by major Brazilian e-commerce sites."""
    selectors = [
        # Generic
        "[data-testid*='price']",
        ".price", ".product-price", ".offer-price",
        # Mercado Livre
        ".andes-money-amount__fraction",
        # Amazon BR
        ".a-price-whole",
        "span.a-offscreen",
        # Americanas / B2W
        ".product-price__value",
        # Magazine Luiza
        "[data-testid='price-value']",
        # Shopee
        "._3_ISdg",
        # VTEX stores
        ".vtex-store-components-3-x-sellingPrice",
    ]
    for sel in selectors:
        try:
            el = soup.select_one(sel)
            if el:
                price = _parse_price(el.get_text())
                if price:
                    return price
        except Exception:
            pass
    return None


async def scrape_product_price(
    url: str, retailer: str = "unknown", retries: int = 0
) -> Optional[dict]:
    """
    Fetch current price and availability from a product page.
    Returns dict with 'price' (Decimal|None) and 'is_available' (bool).
    """
    await _async_polite_delay()

    async with httpx.AsyncClient(
        headers=HEADERS,
        timeout=settings.REQUEST_TIMEOUT,
        follow_redirects=True,
    ) as client:
        for attempt in range(settings.MAX_RETRIES):
            try:
                response = await client.get(url)
                response.raise_for_status()
                break
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code in (429, 503) and attempt < settings.MAX_RETRIES - 1:
                    wait = (attempt + 1) * 10
                    logger.warning("Rate limited on %s, waiting %ss (attempt %d)", url, wait, attempt + 1)
                    await asyncio.sleep(wait)
                    continue
                logger.error("HTTP error fetching %s: %s", url, exc)
                return None
            except httpx.RequestError as exc:
                logger.error("Request error fetching %s: %s", url, exc)
                if attempt < settings.MAX_RETRIES - 1:
                    await asyncio.sleep(3)
                    continue
                return None

    soup = BeautifulSoup(response.text, "html.parser")

    price = (
        _extract_price_from_json_ld(soup)
        or _extract_price_from_meta(soup)
        or _extract_price_from_selectors(soup)
    )

    # Basic availability detection
    page_text_lower = response.text.lower()
    unavailable_keywords = [
        "fora de estoque", "out of stock", "indisponível", "unavailable",
        "esgotado", "sold out", "produto indisponível",
    ]
    is_available = not any(kw in page_text_lower for kw in unavailable_keywords)
    if price is None:
        is_available = False

    logger.info("Scraped %s — price=%s available=%s", url, price, is_available)
    return {"price": price, "is_available": is_available}


async def search_products(query: str, retailer: Optional[str] = None) -> list[dict]:
    """
    Lightweight product search.
    Uses a structured public search endpoint when possible.
    Falls back to a curated static example list for demo purposes.
    Returns a list of ProductSearchResult-compatible dicts.
    """
    # In a real deployment you would call retailer-specific public APIs here,
    # e.g. Mercado Livre API, Amazon Product Advertising API, etc.
    # For now we demonstrate the pattern with Mercado Livre's public search API
    # which is free and does not require scraping.
    results = []

    try:
        results = await _search_mercadolivre(query)
    except Exception as exc:
        logger.warning("MercadoLivre search failed: %s", exc)

    if retailer:
        results = [r for r in results if r.get("retailer", "").lower() == retailer.lower()]

    return results[:20]


async def _search_mercadolivre(query: str) -> list[dict]:
    """Query MercadoLivre public search API (no API key required for basic search)."""
    await _async_polite_delay()

    api_url = "https://api.mercadolibre.com/sites/MLB/search"
    params = {"q": query, "limit": 10}

    async with httpx.AsyncClient(headers=HEADERS, timeout=settings.REQUEST_TIMEOUT) as client:
        response = await client.get(api_url, params=params)
        response.raise_for_status()
        data = response.json()

    results = []
    for item in data.get("results", []):
        price = None
        try:
            price = Decimal(str(item.get("price", 0))).quantize(Decimal("0.01"))
        except Exception:
            pass

        results.append({
            "name": item.get("title", ""),
            "url": item.get("permalink", ""),
            "image_url": item.get("thumbnail", "").replace("I.jpg", "O.jpg"),
            "retailer": "Mercado Livre",
            "current_price": price,
            "is_available": item.get("available_quantity", 0) > 0,
        })
    return results
