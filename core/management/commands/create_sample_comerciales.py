# core/management/commands/create_sample_comerciales.py
from django.core.management.base import BaseCommand
from core.models import Repositorio, Comercial
from datetime import datetime, timedelta
import random


class Command(BaseCommand):
    help = 'Crea comerciales de ejemplo con datos realistas de los repositorios importados'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=50,
            help='Número de comerciales a crear (default: 50)'
        )

    def handle(self, *args, **options):
        count = options['count']
        
        # Obtener repositorios activos
        repositorios = list(Repositorio.objects.filter(activo=True))
        
        if not repositorios:
            self.stdout.write(self.style.ERROR('No hay repositorios activos'))
            return

        # Datos de ejemplo basados en repositorios reales importados
        productos_por_repo = {
            'PML': ['Producto A', 'Producto B', 'Campaña Principal'],
            'Grupo Modelo': ['Corona Extra', 'Victoria', 'Modelo Especial', 'Pacifico'],
            'Liverpool': ['Sale Primavera', 'Black Friday', 'Campaña Navidad'],
            'Sabritas': ['Sabritas Original', 'Ruffles', 'Doritos', 'Cheetos'],
            'Publicis': ['Campaña Digital', 'Campaña TV', 'Campaña Radio'],
            'BBDO': ['Spot Principal', 'Teaser', 'Campaña Integrada'],
            'Leo Burnett': ['Campaña Anual', 'Spot Verano', 'Spot Invierno'],
        }
        
        agencias = [
            'BBDO México',
            'Leo Burnett',
            'Publicis',
            'JWT',
            'Teran TBWA',
            'Lowe',
            'McCann',
            'Ogilvy'
        ]
        
        versiones = ['v1', 'v2', 'v3', 'Final', 'Corte 1', 'Corte 2', 'Master']
        duraciones = ['00:00:20', '00:00:30', '00:00:60', '00:01:00', '00:01:30']
        formatos = ['16:9 HD', '16:9 4K', '4:3 SD', '1:1 Instagram', '9:16 Stories']
        
        created_count = 0
        
        for i in range(count):
            repo = random.choice(repositorios)
            
            # Buscar productos específicos para este repo
            productos = productos_por_repo.get(repo.nombre, [f'Producto {i+1}'])
            producto = random.choice(productos)
            
            # Crear pizarra con datos realistas
            pizarra = {
                'cliente': repo.nombre,
                'agencia': random.choice(agencias),
                'producto': producto,
                'version': random.choice(versiones),
                'duracion': random.choice(duraciones),
                'formato': random.choice(formatos),
                'fecha_produccion': (datetime.now() - timedelta(days=random.randint(0, 365))).strftime('%Y-%m-%d'),
            }
            
            # Fecha de subida aleatoria en los últimos 2 años
            fecha_subida = datetime.now() - timedelta(days=random.randint(0, 730))
            
            # Estado aleatorio (mayoría completados)
            estados = ['COMPLETADO'] * 7 + ['PROCESANDO'] * 2 + ['PENDIENTE'] * 1
            estado = random.choice(estados)
            
            # Crear comercial
            comercial = Comercial.objects.create(
                repositorio=repo,
                estado_transcodificacion=estado,
                pizarra=pizarra,
                fecha_subida=fecha_subida
            )
            
            created_count += 1
            
            if (i + 1) % 10 == 0:
                self.stdout.write(f'  Creados {i + 1}/{count}...')
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ {created_count} comerciales creados exitosamente'))
        self.stdout.write(f'   Distribuidos en {len(repositorios)} repositorios')
