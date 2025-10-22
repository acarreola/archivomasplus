# Generated manually for Audio model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid
import core.models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0024_add_sistema_informacion'),
    ]

    operations = [
        migrations.CreateModel(
            name='Audio',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('archivo_original', models.FileField(blank=True, help_text='Original audio file uploaded by user', max_length=512, null=True, upload_to=core.models.upload_to_originals)),
                ('nombre_original', models.CharField(blank=True, help_text='Original filename uploaded', max_length=512, null=True)),
                ('ruta_mp3', models.CharField(blank=True, help_text='Path to converted MP3 file for playback', max_length=1024, null=True)),
                ('thumbnail', models.ImageField(blank=True, help_text='Audio icon thumbnail to display in frontend', null=True, upload_to='thumbnails/')),
                ('pizarra_thumbnail', models.ImageField(blank=True, help_text='Audio icon for edit view', null=True, upload_to='pizarra/')),
                ('estado_procesamiento', models.CharField(choices=[('PENDIENTE', 'Pending'), ('PROCESANDO', 'Processing'), ('COMPLETADO', 'Completed'), ('ERROR', 'Error')], default='PENDIENTE', max_length=20)),
                ('id_content', models.CharField(blank=True, db_index=True, help_text='Folio único del contenido (ej: AUD-asdfg)', max_length=15, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict, help_text='Audio metadata (title, artist, album, etc.)')),
                ('fecha_subida', models.DateTimeField(auto_now_add=True)),
                ('creado_por', models.ForeignKey(blank=True, help_text='Usuario que registró/subió el audio', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audios_creados', to=settings.AUTH_USER_MODEL)),
                ('directorio', models.ForeignKey(blank=True, help_text='Directory/folder where the audio is located', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audios', to='core.directorio')),
                ('modulo', models.ForeignKey(blank=True, help_text='Module this file belongs to (Audio)', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audios', to='core.modulo')),
                ('repositorio', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audios', to='core.repositorio')),
            ],
        ),
    ]
