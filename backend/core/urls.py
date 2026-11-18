from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import CategoryViewSet, StudentViewSet, EquipmentViewSet, CheckoutViewSet, fines_list, dashboard

router = DefaultRouter()
router.register("categories", CategoryViewSet)
router.register("students", StudentViewSet)
router.register("equipment", EquipmentViewSet)
router.register("checkouts", CheckoutViewSet, basename="checkout")

urlpatterns = [
    path("", include(router.urls)),
    path("fines/", fines_list),
    path("dashboard/", dashboard),
]
