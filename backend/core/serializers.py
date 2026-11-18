from rest_framework import serializers
from .models import Category, StudentProfile, EquipmentItem, Checkout, OverdueFine, ReturnInspection

class CategorySerializer(serializers.ModelSerializer):
    class Meta: model = Category; fields = "__all__"

class StudentSerializer(serializers.ModelSerializer):
    class Meta: model = StudentProfile; fields = "__all__"

class EquipmentSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    is_checked_out = serializers.SerializerMethodField()
    class Meta: model = EquipmentItem; fields = "__all__"
    def get_is_checked_out(self, obj):
        return obj.checkouts.filter(status="active").exists()

class InspectionSerializer(serializers.ModelSerializer):
    class Meta: model = ReturnInspection; fields = ["condition", "notes"]

class CheckoutSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source="equipment.name", read_only=True)
    barcode = serializers.CharField(source="equipment.barcode", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_code = serializers.CharField(source="student.student_id", read_only=True)
    fine_amount = serializers.SerializerMethodField()
    class Meta:
        model = Checkout
        fields = ["id", "equipment", "equipment_name", "barcode", "student", "student_name",
                  "student_code", "checked_out_at", "due_date", "returned_at", "status", "notes", "fine_amount"]
        read_only_fields = ["id", "checked_out_at", "returned_at", "status"]
    def get_fine_amount(self, obj):
        fine = getattr(obj, "fine", None)
        return str(fine.amount) if fine else "0.00"

class FineSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="checkout.student.full_name", read_only=True)
    equipment_name = serializers.CharField(source="checkout.equipment.name", read_only=True)
    class Meta: model = OverdueFine; fields = ["id", "checkout", "student_name", "equipment_name", "overdue_days", "amount", "paid", "calculated_at"]
