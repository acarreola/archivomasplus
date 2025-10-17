from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RepositorioViewSet, AgenciaViewSet, BroadcastViewSet, 
    UserViewSet, SharedLinkViewSet, DirectorioViewSet, RepositorioPermisoViewSet, ModuloViewSet,
    PerfilViewSet, current_user, shared_link_public, login_view, logout_view
)

router = DefaultRouter()
router.register(r'repositorios', RepositorioViewSet, basename='repositorio')
router.register(r'agencias', AgenciaViewSet)
router.register(r'broadcasts', BroadcastViewSet, basename='broadcast')
router.register(r'directorios', DirectorioViewSet, basename='directorio')
router.register(r'users', UserViewSet)
router.register(r'repositorio-permisos', RepositorioPermisoViewSet, basename='repositorio-permiso')
router.register(r'modulos', ModuloViewSet, basename='modulo')
router.register(r'perfiles', PerfilViewSet, basename='perfil')
router.register(r'shared-links', SharedLinkViewSet, basename='shared-link')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/me/', current_user, name='current-user'),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('shared/<uuid:link_id>/', shared_link_public, name='shared-link-public'),
]
