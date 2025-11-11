import os
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Broadcast


logger = logging.getLogger(__name__)


def _celery_workers_online() -> bool:
    try:
        from celery import current_app
        insp = current_app.control.inspect()
        stats = insp.stats() if insp else None
        return bool(stats)
    except Exception:
        return False


def _enqueue_or_sync_transcode(broadcast: Broadcast) -> str:
    """Encola transcodificación con Celery o ejecuta en modo síncrono.
    Regresa 'queued' si se encoló, 'sync' si se ejecutó directamente.
    """
    from .tasks import transcode_video

    sync_env = os.getenv('SYNC_TRANSCODE', '').strip() == '1'
    if _celery_workers_online() and not sync_env:
        transcode_video.delay(str(broadcast.id))
        logger.info(f"🎬 [signals] Broadcast {broadcast.id} queued for transcoding (Celery)")
        return 'queued'

    logger.warning(f"⚠️ [signals] Sin workers Celery o SYNC_TRANSCODE=1; ejecutando transcode síncrono para {broadcast.id}")
    transcode_video(str(broadcast.id))
    return 'sync'


@receiver(post_save, sender=Broadcast)
def broadcast_auto_transcode(sender, instance: Broadcast, created: bool, **kwargs):
    """Auto-dispara transcodificación cuando hay archivo y el estado es PENDIENTE.
    Previene doble disparo porque la vista setea PROCESANDO antes de encolar.
    Este hook cubre rutas alternativas (admin, cargas por otro serializer, etc.).
    """
    try:
        if not instance.archivo_original:
            return

        if instance.estado_transcodificacion != 'PENDIENTE':
            return

        # Marcar en PROCESANDO y disparar
        instance.estado_transcodificacion = 'PROCESANDO'
        instance.save(update_fields=['estado_transcodificacion'])
        mode = _enqueue_or_sync_transcode(instance)
        logger.info(f"🎬 [signals] Broadcast {instance.id} transcoding started via: {mode}")
    except Exception as e:
        logger.error(f"Error en señal broadcast_auto_transcode: {e}")
