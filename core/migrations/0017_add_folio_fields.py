# Generated manually on 2025-10-18

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0016_fix_sharedlink_broadcast_fk'),
    ]

    operations = [
        migrations.AddField(
            model_name='modulo',
            name='id_mod',
            field=models.CharField(blank=True, db_index=True, help_text='Folio único del módulo (ej: MOD-abcde)', max_length=15),
        ),
        migrations.AddField(
            model_name='repositorio',
            name='id_repo',
            field=models.CharField(blank=True, db_index=True, help_text='Folio único del repositorio (ej: REP-xyzab)', max_length=15),
        ),
        migrations.AddField(
            model_name='customuser',
            name='id_usr',
            field=models.CharField(blank=True, db_index=True, help_text='Folio único del usuario (ej: USR-qwert)', max_length=15),
        ),
        migrations.AddField(
            model_name='directorio',
            name='id_dir',
            field=models.CharField(blank=True, null=True, db_index=True, help_text='Folio único del directorio (ej: DIR-mnopq)', max_length=15),
        ),
        migrations.AddField(
            model_name='broadcast',
            name='id_content',
            field=models.CharField(blank=True, null=True, db_index=True, help_text='Folio único del contenido (ej: CNT-asdfg)', max_length=15),
        ),
    ]
