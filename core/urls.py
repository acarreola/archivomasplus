from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RepositorioViewSet, AgenciaViewSet, BroadcastViewSet, 
    UserViewSet, DirectorioViewSet, RepositorioPermisoViewSet, ModuloViewSet,
    PerfilViewSet, SistemaInformacionViewSet, current_user, shared_link_public, login_view, logout_view
)
from . import csv_views

router = DefaultRouter()
router.register(r'repositorios', RepositorioViewSet, basename='repositorio')
router.register(r'agencias', AgenciaViewSet)
router.register(r'broadcasts', BroadcastViewSet, basename='broadcast')
router.register(r'directorios', DirectorioViewSet, basename='directorio')
router.register(r'users', UserViewSet)
router.register(r'repositorio-permisos', RepositorioPermisoViewSet, basename='repositorio-permiso')
router.register(r'modulos', ModuloViewSet, basename='modulo')
router.register(r'perfiles', PerfilViewSet, basename='perfil')
router.register(r'system-info', SistemaInformacionViewSet, basename='system-info')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/me/', current_user, name='current-user'),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('shared/<uuid:link_id>/', shared_link_public, name='shared-link-public'),
    
    # CSV endpoints
    path('csv/export-broadcasts/', csv_views.export_broadcasts_csv, name='export-broadcasts-csv'),
    path('csv/import-broadcasts/', csv_views.import_broadcasts_csv, name='import-broadcasts-csv'),
    path('csv/template/', csv_views.export_csv_template, name='export-csv-template'),
    path('csv/compare/', csv_views.compare_csv_structure, name='compare-csv-structure'),
]
