#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'archivoplus_backend.settings')
django.setup()

from django.contrib.auth.models import User

print("\n=== USUARIOS EN LA BASE DE DATOS ===\n")
users = User.objects.all()

if users.exists():
    for user in users:
        print(f"Usuario: {user.username}")
        print(f"  Email: {user.email}")
        print(f"  Staff: {user.is_staff}")
        print(f"  Superuser: {user.is_superuser}")
        print(f"  Activo: {user.is_active}")
        print()
else:
    print("No hay usuarios en la base de datos")
    print("\nCreando usuario admin...")
    User.objects.create_superuser('admin', 'admin@admin.com', 'admin123')
    print("✓ Usuario admin creado con password: admin123")
