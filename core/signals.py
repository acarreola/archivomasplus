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
    """
    Signal DESHABILITADO para permitir uploads masivos sin procesamiento automático.
    
    El procesamiento ahora se dispara manualmente via:
    - Botón "Procesar Pendientes" en el frontend
    - Endpoint /api/broadcasts/process-pending/
    - Action force_transcode para broadcasts individuales
    
    Esto permite:
    1. Subir muchos videos rápidamente (quedan en PENDIENTE)
    2. Cerrar el uploader cuando terminen todas las cargas
    3. Disparar procesamiento en batch
    4. Ver progreso en tiempo real con polling
    """
    # Signal deshabilitado - procesamiento manual solamente
    return
