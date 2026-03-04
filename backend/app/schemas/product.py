import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, HttpUrl, Field
from typing import Optional


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    url: str
    image_url: Optional[str] = None
    retailer: str = Field(..., min_length=1, max_length=100)
    target_price: Decimal = Field(..., gt=0)
    check_interval_minutes: int = Field(default=30, ge=5, le=1440)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=500)
    target_price: Optional[Decimal] = Field(None, gt=0)
    check_interval_minutes: Optional[int] = Field(None, ge=5, le=1440)
    is_active: Optional[bool] = None


class ProductOut(ProductBase):
    id: uuid.UUID
    user_id: uuid.UUID
    current_price: Optional[Decimal] = None
    lowest_price: Optional[Decimal] = None
    highest_price: Optional[Decimal] = None
    is_available: bool
    is_active: bool
    alert_sent: bool
    last_checked_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductSearchResult(BaseModel):
    """Returned when searching for a product from a retailer."""
    name: str
    url: str
    image_url: Optional[str] = None
    retailer: str
    current_price: Optional[Decimal] = None
    is_available: bool = True
