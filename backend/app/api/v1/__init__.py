from fastapi import APIRouter
from . import auth, users, products, price_history, alerts

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(users.router, prefix="/users", tags=["Users"])
router.include_router(products.router, prefix="/products", tags=["Products"])
router.include_router(price_history.router, prefix="/price-history", tags=["Price History"])
router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
