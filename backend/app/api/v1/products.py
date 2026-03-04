import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductSearchResult
from app.api.deps import get_current_user
from app.services.scraper import scrape_product_price, search_products

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/search", response_model=List[ProductSearchResult])
async def search_product(
    q: str = Query(..., min_length=2, description="Product name or URL to search"),
    retailer: Optional[str] = Query(None, description="Filter by retailer"),
    current_user: User = Depends(get_current_user),
):
    """
    Search for products across supported retailers.
    Returns metadata including current prices.
    """
    results = await search_products(query=q, retailer=retailer)
    return results


@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a product to monitor."""
    # Fetch initial price
    price_data = await scrape_product_price(product_in.url, product_in.retailer)

    product = Product(
        user_id=current_user.id,
        name=product_in.name,
        url=str(product_in.url),
        image_url=product_in.image_url,
        retailer=product_in.retailer,
        target_price=product_in.target_price,
        check_interval_minutes=product_in.check_interval_minutes,
        current_price=price_data.get("price") if price_data else None,
        is_available=price_data.get("is_available", True) if price_data else True,
        lowest_price=price_data.get("price") if price_data else None,
        highest_price=price_data.get("price") if price_data else None,
    )
    db.add(product)
    await db.flush()
    await db.refresh(product)

    # Schedule periodic Celery task
    from app.workers.tasks import schedule_product_check
    schedule_product_check.delay(str(product.id))

    logger.info(
        "Product created: %s (id=%s) for user %s", product.name, product.id, current_user.email
    )
    return product


@router.get("/", response_model=List[ProductOut])
async def list_products(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    result = await db.execute(
        select(Product)
        .where(Product.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .order_by(Product.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.user_id == current_user.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: uuid.UUID,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.user_id == current_user.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    # Reset alert_sent if target_price changed
    if "target_price" in update_data:
        product.alert_sent = False

    db.add(product)
    await db.flush()
    await db.refresh(product)
    logger.info("Product updated: %s", product_id)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.user_id == current_user.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    await db.delete(product)
    await db.flush()
    logger.info("Product deleted: %s", product_id)


@router.post("/{product_id}/check-now", response_model=ProductOut)
async def check_price_now(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger an immediate price check for this product."""
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.user_id == current_user.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    from app.workers.tasks import check_product_price
    check_product_price.delay(str(product.id))

    return product
