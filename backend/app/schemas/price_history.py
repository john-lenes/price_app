import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class PriceHistoryOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    price: Decimal
    is_available: bool
    checked_at: datetime

    class Config:
        from_attributes = True
