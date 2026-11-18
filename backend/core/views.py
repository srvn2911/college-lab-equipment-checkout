from datetime import date
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from .models import Category, StudentProfile, EquipmentItem, Checkout, OverdueFine, ReturnInspection
from .serializers import CategorySerializer, StudentSerializer, EquipmentSerializer, CheckoutSerializer, FineSerializer, InspectionSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer

class StudentViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.all().order_by("full_name")
    serializer_class = StudentSerializer
    search_fields = ["student_id", "full_name", "department"]

class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = EquipmentItem.objects.select_related("category").all().order_by("name")
    serializer_class = EquipmentSerializer
    search_fields = ["name", "barcode", "location"]
    def get_queryset(self):
        qs = super().get_queryset()
        barcode = self.request.query_params.get("barcode")
        if barcode: qs = qs.filter(barcode__iexact=barcode.strip())
        return qs

class CheckoutViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Checkout.objects.select_related("equipment", "student").all().order_by("-checked_out_at")
    serializer_class = CheckoutSerializer

    def create(self, request):
        equipment_id = request.data.get("equipment")
        student_id = request.data.get("student")
        due_date = request.data.get("due_date")
        if not equipment_id or not student_id or not due_date:
            return Response({"detail": "equipment, student and due_date are required."}, status=400)
        try:
            with transaction.atomic():
                # Lock the equipment row so simultaneous requests cannot check out the same item.
                equipment = EquipmentItem.objects.select_for_update().get(pk=equipment_id)
                student = StudentProfile.objects.get(pk=student_id)
                if equipment.status != "available":
                    return Response({"detail": "This equipment is not available."}, status=409)
                if Checkout.objects.filter(equipment=equipment, status="active").exists():
                    return Response({"detail": "This equipment is already checked out."}, status=409)
                checkout = Checkout.objects.create(
                    equipment=equipment, student=student, due_date=due_date,
                    notes=request.data.get("notes", "")
                )
            return Response(CheckoutSerializer(checkout).data, status=201)
        except (EquipmentItem.DoesNotExist, StudentProfile.DoesNotExist):
            return Response({"detail": "Equipment or student was not found."}, status=404)
        except ValueError:
            return Response({"detail": "Invalid due date."}, status=400)

    @action(detail=True, methods=["post"], url_path="return_item")
    def return_item(self, request, pk=None):
        condition = request.data.get("condition", "good")
        if condition not in dict(ReturnInspection.CONDITION_CHOICES):
            return Response({"detail": "Invalid return condition."}, status=400)
        with transaction.atomic():
            checkout = get_object_or_404(Checkout.objects.select_for_update().select_related("equipment"), pk=pk)
            if checkout.status == "returned":
                return Response({"detail": "This checkout has already been returned."}, status=409)
            today = timezone.localdate()
            overdue_days = max((today - checkout.due_date).days, 0)
            amount = Decimal(overdue_days * settings.FINE_PER_DAY)
            checkout.status = "returned"
            checkout.returned_at = timezone.now()
            checkout.save(update_fields=["status", "returned_at"])
            ReturnInspection.objects.update_or_create(
                checkout=checkout, defaults={"condition": condition, "notes": request.data.get("notes", "")}
            )
            if overdue_days:
                OverdueFine.objects.update_or_create(
                    checkout=checkout, defaults={"overdue_days": overdue_days, "amount": amount}
                )
            if condition != "good":
                checkout.equipment.status = "maintenance"
                checkout.equipment.save(update_fields=["status"])
        return Response({"detail": "Return recorded.", "overdue_days": overdue_days, "fine_amount": str(amount)})

@api_view(["GET"])
def fines_list(request):
    today = timezone.localdate()
    # Refresh outstanding overdue amounts for currently active checkouts.
    for checkout in Checkout.objects.filter(status="active", due_date__lt=today).select_related("equipment", "student"):
        days = (today - checkout.due_date).days
        OverdueFine.objects.update_or_create(
            checkout=checkout, defaults={"overdue_days": days, "amount": Decimal(days * settings.FINE_PER_DAY)}
        )
    return Response(FineSerializer(OverdueFine.objects.select_related("checkout__student", "checkout__equipment").order_by("-amount"), many=True).data)

@api_view(["GET"])
def dashboard(request):
    today = timezone.localdate()
    active = Checkout.objects.filter(status="active")
    overdue = active.filter(due_date__lt=today)
    total_fines = sum((f.amount for f in OverdueFine.objects.filter(paid=False)), Decimal("0.00"))
    return Response({
        "equipment_total": EquipmentItem.objects.count(),
        "available": EquipmentItem.objects.filter(status="available").exclude(checkouts__status="active").distinct().count(),
        "active_checkouts": active.count(),
        "overdue": overdue.count(),
        "students": StudentProfile.objects.count(),
        "unpaid_fines": str(total_fines),
    })
