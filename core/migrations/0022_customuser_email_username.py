# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0021_rename_comercial_sharedlink_broadcast_and_more'),
    ]

    operations = [
        # Make email unique and required
        migrations.AlterField(
            model_name='customuser',
            name='email',
            field=models.EmailField(max_length=254, unique=True, verbose_name='Email'),
        ),
        # Make username optional and nullable
        migrations.AlterField(
            model_name='customuser',
            name='username',
            field=models.CharField(blank=True, max_length=150, null=True, verbose_name='Username (opcional)'),
        ),
        # Update verbose names
        migrations.AlterField(
            model_name='customuser',
            name='nombre_completo',
            field=models.CharField(blank=True, max_length=255, verbose_name='Full Name'),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='compania',
            field=models.CharField(blank=True, max_length=255, verbose_name='Company'),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='telefono',
            field=models.CharField(blank=True, max_length=20, verbose_name='Phone'),
        ),
        # Add Meta options
        migrations.AlterModelOptions(
            name='customuser',
            options={'verbose_name': 'Usuario', 'verbose_name_plural': 'Usuarios'},
        ),
    ]
