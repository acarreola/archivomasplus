from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        # Importar señales para enganchar post_save de modelos
        try:
            import core.signals  # noqa: F401
        except Exception as e:
            # Evitar que un error en import bloquee el arranque completo
            import logging
            logging.getLogger(__name__).warning(f"No se pudieron cargar señales de core: {e}")
