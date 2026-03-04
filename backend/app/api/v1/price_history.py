import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.product import Product
from app.models.price_history import PriceHistory
from app.models.user import User
from app.schemas.price_history import PriceHistoryOut
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/{product_id}", response_model=List[PriceHistoryOut])
async def get_price_history(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(500, ge=1, le=2000),
):
    # Verify product ownership
    prod_result = await db.execute(
        select(Product).where(Product.id == product_id, Product.user_id == current_user.id)
    )
    if not prod_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    result = await db.execute(
        select(PriceHistory)
        .where(PriceHistory.product_id == product_id)
        .order_by(PriceHistory.checked_at.asc())
        .limit(limit)
    )
    return result.scalars().all()
