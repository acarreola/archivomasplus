from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0026_seed_defaults'),
    ]

    operations = [
        migrations.AddField(
            model_name='broadcast',
            name='last_error',
            field=models.TextField(blank=True, null=True, help_text='Último error de transcodificación (stderr o mensaje)'),
        ),
    ]
