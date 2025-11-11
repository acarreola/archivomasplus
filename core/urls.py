from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RepositorioViewSet, AgenciaViewSet, BroadcastViewSet, AudioViewSet,
    UserViewSet, DirectorioViewSet, RepositorioPermisoViewSet, ModuloViewSet,
    PerfilViewSet, SistemaInformacionViewSet, current_user, shared_link_public, 
    login_view, logout_view, forgot_password, reset_password, smtp_config, smtp_test,
    ImageAssetViewSet, StorageAssetViewSet, purge_all, ffmpeg_health, ProcessingErrorViewSet
)
from . import csv_views

router = DefaultRouter()
router.register(r'repositorios', RepositorioViewSet, basename='repositorio')
router.register(r'agencias', AgenciaViewSet)
router.register(r'broadcasts', BroadcastViewSet, basename='broadcast')
router.register(r'audios', AudioViewSet, basename='audio')
router.register(r'directorios', DirectorioViewSet, basename='directorio')
router.register(r'users', UserViewSet)
router.register(r'repositorio-permisos', RepositorioPermisoViewSet, basename='repositorio-permiso')
router.register(r'modulos', ModuloViewSet, basename='modulo')
router.register(r'perfiles', PerfilViewSet, basename='perfil')
router.register(r'system-info', SistemaInformacionViewSet, basename='system-info')
# Images module endpoint (independent)
router.register(r'images', ImageAssetViewSet, basename='imageasset')
# Storage module endpoint (accepts all file types)
router.register(r'storage', StorageAssetViewSet, basename='storageasset')
router.register(r'processing-errors', ProcessingErrorViewSet, basename='processing-error')

urlpatterns = [
    path('', include(router.urls)),
    path('admin/purge-all/', purge_all, name='purge-all'),
    path('auth/me/', current_user, name='current-user'),
    path('health/ffmpeg/', ffmpeg_health, name='ffmpeg-health'),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/forgot-password/', forgot_password, name='forgot-password'),
    path('auth/reset-password/', reset_password, name='reset-password'),
    path('smtp-config/', smtp_config, name='smtp-config'),
    path('smtp-config/test/', smtp_test, name='smtp-test'),
    path('shared/<uuid:link_id>/', shared_link_public, name='shared-link-public'),
    
    # CSV endpoints
    path('csv/export-broadcasts/', csv_views.export_broadcasts_csv, name='export-broadcasts-csv'),
    path('csv/import-broadcasts/', csv_views.import_broadcasts_csv, name='import-broadcasts-csv'),
    path('csv/template/', csv_views.export_csv_template, name='export-csv-template'),
    path('csv/compare/', csv_views.compare_csv_structure, name='compare-csv-structure'),
]
