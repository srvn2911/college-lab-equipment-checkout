from django.db import models
from django.utils import timezone

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    def __str__(self): return self.name

class StudentProfile(models.Model):
    student_id = models.CharField(max_length=30, unique=True)
    full_name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    department = models.CharField(max_length=100, blank=True)
    year_of_study = models.PositiveSmallIntegerField(default=1)
    phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"{self.student_id} - {self.full_name}"

class EquipmentItem(models.Model):
    STATUS_CHOICES = [("available", "Available"), ("maintenance", "Maintenance"), ("retired", "Retired")]
    name = models.CharField(max_length=150)
    barcode = models.CharField(max_length=100, unique=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="equipment")
    description = models.TextField(blank=True)
    location = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="available")
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"{self.name} ({self.barcode})"

class Checkout(models.Model):
    STATUS_CHOICES = [("active", "Active"), ("returned", "Returned")]
    equipment = models.ForeignKey(EquipmentItem, on_delete=models.PROTECT, related_name="checkouts")
    student = models.ForeignKey(StudentProfile, on_delete=models.PROTECT, related_name="checkouts")
    checked_out_at = models.DateTimeField(default=timezone.now)
    due_date = models.DateField()
    returned_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    notes = models.TextField(blank=True)
    def __str__(self): return f"{self.equipment} → {self.student}"

class ReturnInspection(models.Model):
    CONDITION_CHOICES = [("good", "Good"), ("damaged", "Damaged"), ("missing_parts", "Missing parts")]
    checkout = models.OneToOneField(Checkout, on_delete=models.CASCADE, related_name="inspection")
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES)
    notes = models.TextField(blank=True)
    inspected_at = models.DateTimeField(auto_now_add=True)

class OverdueFine(models.Model):
    checkout = models.OneToOneField(Checkout, on_delete=models.CASCADE, related_name="fine")
    overdue_days = models.PositiveIntegerField(default=0)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid = models.BooleanField(default=False)
    calculated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return f"Fine #{self.pk}: ₹{self.amount}"
