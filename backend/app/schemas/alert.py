import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class AlertOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    product_id: uuid.UUID
    triggered_price: Decimal
    target_price: Decimal
    notification_type: str
    message: str | None = None
    sent_at: datetime

    class Config:
        from_attributes = True
