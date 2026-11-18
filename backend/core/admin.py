from django.contrib import admin
from .models import Category, StudentProfile, EquipmentItem, Checkout, OverdueFine, ReturnInspection

admin.site.register(Category)
admin.site.register(StudentProfile)
admin.site.register(EquipmentItem)
admin.site.register(Checkout)
admin.site.register(OverdueFine)
admin.site.register(ReturnInspection)
