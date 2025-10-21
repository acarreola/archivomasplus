# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0023_rename_comercial_sharedlink_broadcast_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='SistemaInformacion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('version', models.CharField(help_text='Número de versión (e.g., 1.0.0)', max_length=50, unique=True)),
                ('release_date', models.CharField(help_text='Fecha de lanzamiento (e.g., October 2025)', max_length=100)),
                ('updates', models.TextField(help_text='Notas de actualización (una línea por cambio)')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('is_current', models.BooleanField(default=False, help_text='Es la versión actual del sistema')),
            ],
            options={
                'verbose_name': 'Información del Sistema',
                'verbose_name_plural': 'Información del Sistema',
                'ordering': ['-fecha_creacion'],
            },
        ),
    ]
