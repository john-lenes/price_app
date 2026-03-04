import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.alert import Alert
from app.models.user import User
from app.schemas.alert import AlertOut
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[AlertOut])
async def list_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    product_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    query = select(Alert).where(Alert.user_id == current_user.id)
    if product_id:
        query = query.where(Alert.product_id == product_id)
    query = query.order_by(Alert.sent_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
