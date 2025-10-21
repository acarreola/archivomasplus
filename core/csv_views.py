"""
CSV Import/Export views for Broadcast model
"""
import csv
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import Broadcast, Repositorio, Directorio, Modulo


@api_view(['GET'])
@permission_classes([AllowAny])
def export_broadcasts_csv(request):
    """
    Export all broadcasts to CSV format.
    Includes all fields for comparison with external system.
    Supports filtering by repositorio with ?repositorio=<id>
    """
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    
    # Get repositorio filter if provided
    repositorio_id = request.GET.get('repositorio')
    
    # Build filename based on filter
    if repositorio_id:
        try:
            repo = Repositorio.objects.get(id=repositorio_id)
            filename = f"broadcasts_{repo.clave}_{repo.nombre.replace(' ', '_')}.csv"
        except Repositorio.DoesNotExist:
            filename = f"broadcasts_{repositorio_id}.csv"
    else:
        filename = "broadcasts_all.csv"
    
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    writer = csv.writer(response)
    
    # Header row - matching your CSV structure
    writer.writerow([
        # Vista Simple
        'id_content',            # Folio contenido
        'Nombre de archivo',     # original name (ruta/nombre)
        'Parent',                # key (id_dir del directorio)
        'Folio',                 # folio del repositorio
        'Tipo',                  # tipo (Broadcast)
        'Tamaño',                # file size (legible)
        'Username',              # registrado por
        'Fecha de registro',     # upload date (yyyy-mm-dd)
        'Status',                # estado amigable
        # Vista Full
        'Client',                # client
        'Agency',                # agency
        'Product',               # product
        'Version',               # version
        'Duration',              # time/duration
        'Type',                  # 1/2/3 = master/generic/intergeneric
        'Expedition',            # date
        # Extras
        'id_uuid',               # UUID original
        'repositorio',           # Repositorio name
        'modulo',                # Modulo name
    ])
    
    # Data rows - filter by repositorio if provided
    broadcasts = Broadcast.objects.all().select_related('repositorio', 'directorio', 'modulo')
    
    if repositorio_id:
        broadcasts = broadcasts.filter(repositorio_id=repositorio_id)
    
    for b in broadcasts:
        # Get pizarra data with defaults
        pizarra = b.pizarra or {}

        # Calculate file size
        file_size = ''
        if b.archivo_original:
            try:
                size_bytes = b.archivo_original.size
                size_mb = size_bytes / (1024 * 1024)
                file_size = f"{size_mb:.2f} MB"
            except Exception:
                file_size = 'N/A'

        # Fallbacks for instances where folio fields are not present in current model
        try:
            folio_content = getattr(b, 'id_content', None) or (b.id.hex[:5] if hasattr(b, 'id') else '')
        except Exception:
            folio_content = ''

        try:
            dir_folio = ''
            if b.directorio:
                dir_folio = getattr(b.directorio, 'id_dir', None) or b.directorio.nombre or ''
        except Exception:
            dir_folio = ''

        status_map = {
            'PENDIENTE': 'Pending',
            'PROCESANDO': 'Processing',
            'COMPLETADO': 'Completed',
            'ERROR': 'Error'
        }
        status_display = status_map.get(b.estado_transcodificacion, b.estado_transcodificacion)

        writer.writerow([
            # Simple
            folio_content,
            b.nombre_original or '',
            dir_folio,
            b.repositorio.folio if b.repositorio else '',
            'Broadcast',
            file_size,
            (b.creado_por.username if getattr(b, 'creado_por', None) else ''),
            b.fecha_subida.strftime('%Y-%m-%d') if b.fecha_subida else '',
            status_display,
            # Full
            pizarra.get('cliente', ''),
            pizarra.get('agencia', ''),
            pizarra.get('producto', ''),
            pizarra.get('version', ''),
            pizarra.get('duracion', ''),
            pizarra.get('vtype', ''),
            pizarra.get('expedition', ''),
            # Extras
            str(b.id),
            b.repositorio.nombre if b.repositorio else '',
            b.modulo.nombre if b.modulo else '',
        ])
    
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def export_csv_template(request):
    """
    Export a CSV template showing the expected format for import.
    This helps users understand what fields are required.
    """
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="broadcast_import_template.csv"'
    
    writer = csv.writer(response)
    
    # Header row
    writer.writerow([
        'id_content',        # Required: Folio único (ej: XUTFe)
        'Nombre de archivo', # Required: File name/path
        'Tamaño',           # Optional: File size
        'id_dir',           # Optional: Directory folio (parent directory)
        'product',          # Required: Product name
        'client',           # Required: Client name
        'version',          # Required: Version/title
        'duration',         # Required: Duration (ej: 20 SEG, 30 SEG)
        'expedition',       # Optional: Expedition date (YYYY-MM-DD)
        'agency',           # Required: Agency name
        'vtype',            # Optional: Video type (1=master, 2=generico, 3=intergenerico)
    ])
    
    # Example row
    writer.writerow([
        'XUTFe',
        '/COMERCIALES 2000/Example_Product_Version_20.mov',
        '134.84 MB',
        'pxtAU',
        'EXAMPLE PRODUCT',
        'EXAMPLE CLIENT',
        'EXAMPLE VERSION',
        '20 SEG',
        '2000-01-16',
        'EXAMPLE AGENCY',
        '1',
    ])
    
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def compare_csv_structure(request):
    """
    Returns a JSON comparison of your CSV structure vs our database structure.
    Helps identify field mapping and differences.
    """
    your_structure = {
        'id_content': 'Folio único del contenido (5 letras)',
        'Nombre de archivo': 'Ruta completa del archivo con carpetas',
        'Tamaño': 'Tamaño del archivo (ej: 134.84 MB)',
        'id_dir': 'Folio del directorio padre (5 letras)',
        'product': 'Nombre del producto',
        'client': 'Nombre del cliente',
        'version': 'Versión o título del comercial',
        'duration': 'Duración (ej: 20 SEG, 30 SEG, 60 SEG)',
        'expedition': 'Fecha de expedición (YYYY-MM-DD)',
        'agency': 'Nombre de la agencia',
        'vtype': 'Tipo de video (1=master, 2=generico, 3=intergenerico)',
    }
    
    our_structure = {
        'id (UUID)': 'Primary key - UUID auto-generado',
        'id_content': '✅ NUEVO - Folio único (5 letras, ej: CNT-abcde)',
        'repositorio': 'Cliente/Proyecto (FK)',
        'directorio': 'Carpeta/Folder donde está ubicado (FK, opcional)',
        'modulo': 'Módulo del sistema (Storage/Reel/Broadcast/Audio/Images)',
        'archivo_original': 'Archivo master subido (FileField)',
        'nombre_original': 'Nombre original del archivo',
        'ruta_h264': 'Ruta al archivo H.264 transcodificado',
        'ruta_proxy': 'Ruta al archivo H.265 proxy',
        'encoded_files': 'Lista JSON de archivos codificados personalizados',
        'thumbnail': 'Thumbnail principal (frame 07:03)',
        'pizarra_thumbnail': 'Thumbnail de pizarra/slate (frame 00:02)',
        'estado_transcodificacion': 'PENDIENTE/PROCESANDO/COMPLETADO/ERROR',
        'pizarra': 'JSON con metadata: {producto, cliente, version, duracion, agencia, etc}',
        'fecha_subida': 'Fecha de creación del registro',
    }
    
    mapping = {
        'id_content': {
            'your_field': 'id_content',
            'our_field': 'id_content',
            'mapping': 'DIRECTO - Mismo campo',
            'notes': 'Ahora ambos sistemas usan id_content con 5 letras'
        },
        'Nombre de archivo': {
            'your_field': 'Nombre de archivo',
            'our_field': 'nombre_original',
            'mapping': 'nombre_original = extraer nombre de la ruta',
            'notes': 'Tu ruta completa: /COMERCIALES 2000/File.mov → nuestro: File.mov'
        },
        'id_dir': {
            'your_field': 'id_dir',
            'our_field': 'directorio.id_dir',
            'mapping': 'Buscar directorio por id_dir',
            'notes': 'Folio del directorio padre (5 letras). Necesitamos crear/relacionar directorios primero'
        },
        'product': {
            'your_field': 'product',
            'our_field': 'pizarra.producto',
            'mapping': 'pizarra["producto"] = product',
            'notes': 'Campo JSON dentro de pizarra'
        },
        'client': {
            'your_field': 'client',
            'our_field': 'pizarra.cliente',
            'mapping': 'pizarra["cliente"] = client',
            'notes': 'Campo JSON dentro de pizarra'
        },
        'version': {
            'your_field': 'version',
            'our_field': 'pizarra.version',
            'mapping': 'pizarra["version"] = version',
            'notes': 'Campo JSON dentro de pizarra'
        },
        'duration': {
            'your_field': 'duration',
            'our_field': 'pizarra.duracion',
            'mapping': 'pizarra["duracion"] = duration',
            'notes': 'Formato: "20 SEG", "30 SEG", etc'
        },
        'expedition': {
            'your_field': 'expedition',
            'our_field': 'pizarra.expedition',
            'mapping': 'pizarra["expedition"] = expedition',
            'notes': 'Fecha en formato YYYY-MM-DD o 0000-00-00'
        },
        'agency': {
            'your_field': 'agency',
            'our_field': 'pizarra.agencia',
            'mapping': 'pizarra["agencia"] = agency',
            'notes': 'Campo JSON dentro de pizarra'
        },
        'vtype': {
            'your_field': 'vtype',
            'our_field': 'pizarra.vtype',
            'mapping': 'pizarra["vtype"] = vtype',
            'notes': '1=master, 2=generico, 3=intergenerico. Campo JSON dentro de pizarra'
        },
    }
    
    differences = [
        {
            'campo': 'Estructura de carpetas',
            'tu_sistema': 'Ruta completa en "Nombre de archivo" (/COMERCIALES 2000/...)',
            'nuestro_sistema': 'Relación FK con modelo Directorio',
            'solucion': 'Extraer carpetas de la ruta y crear/relacionar directorios'
        },
        {
            'campo': 'Metadata',
            'tu_sistema': 'Campos separados en CSV (product, client, version, etc)',
            'nuestro_sistema': 'Todo en campo JSON "pizarra"',
            'solucion': 'Mapear cada campo CSV a pizarra[campo]'
        },
        {
            'campo': 'Tamaño de archivo',
            'tu_sistema': 'Campo "Tamaño" (ej: 134.84 MB)',
            'nuestro_sistema': 'Calculado desde archivo_original.size',
            'solucion': 'Informativo solamente, no se importa'
        },
        {
            'campo': 'ID/Folio',
            'tu_sistema': 'id_content con 5 letras',
            'nuestro_sistema': 'UUID + id_content (5 letras)',
            'solucion': 'Usar tu id_content directamente'
        },
    ]
    
    return Response({
        'your_csv_structure': your_structure,
        'our_database_structure': our_structure,
        'field_mapping': mapping,
        'main_differences': differences,
        'recommendations': [
            '1. Exporta nuestro CSV actual para ver el formato exacto',
            '2. Compara tu CSV con el nuestro campo por campo',
            '3. Prepara un script de importación que mapee los campos',
            '4. Las carpetas deben crearse primero (parent → directorio)',
            '5. El campo pizarra agrupa toda la metadata en JSON'
        ]
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def import_broadcasts_csv(request):
    """
    Import broadcasts from CSV file.
    Expected format matches the export format.
    Creates/updates broadcasts based on id_content (folio).
    """
    # Accept multiple possible file field names from frontends
    csv_file = request.FILES.get('file') or request.FILES.get('csv_file')
    if not csv_file:
        return Response(
            {'error': 'No file provided. Please upload a CSV file.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate file extension
    if not csv_file.name.endswith('.csv'):
        return Response(
            {'error': 'File must be a CSV file'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get repositorio_id accepting multiple param names
    repositorio_id = request.data.get('repositorio') or request.data.get('repositorio_id')
    if not repositorio_id:
        return Response(
            {'error': 'repositorio parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        repositorio = Repositorio.objects.get(id=repositorio_id)
    except Repositorio.DoesNotExist:
        return Response(
            {'error': f'Repositorio with id {repositorio_id} does not exist'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Parse CSV with multiple encoding attempts
    try:
        # Try different encodings
        csv_content = csv_file.read()
        decoded_file = None
        
        encodings_to_try = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252', 'utf-8-sig']
        
        for encoding in encodings_to_try:
            try:
                decoded_file = csv_content.decode(encoding).splitlines()
                break
            except UnicodeDecodeError:
                continue
        
        if decoded_file is None:
            return Response(
                {'error': 'Unable to decode CSV file. Please ensure the file is in UTF-8, Latin-1, or Windows-1252 encoding.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reader = csv.DictReader(decoded_file)
        
        created_count = 0
        updated_count = 0
        errors = []
        
        # Detect model optional fields for compatibility across branches
        def model_has_field(model, field_name: str) -> bool:
            try:
                return any(getattr(f, 'name', None) == field_name for f in model._meta.get_fields())
            except Exception:
                return False

        supports_id_dir = model_has_field(Directorio, 'id_dir')
        supports_id_content = model_has_field(Broadcast, 'id_content')

        for row_num, row in enumerate(reader, start=2):  # start=2 because row 1 is header
            try:
                # Extract data from CSV
                # Accept aliases from "Vista Simple" and "Vista Full"
                id_content = (row.get('id_content') or row.get('Folio') or '').strip()
                nombre_archivo = (row.get('Nombre de archivo') or row.get('original name') or '').strip()
                id_dir = (row.get('id_dir') or row.get('Parent') or row.get('key') or '').strip()
                status_csv = (row.get('Status') or '').strip()
                username_csv = (row.get('Username') or row.get('register') or '').strip()
                
                # Required fields validation
                if not id_content:
                    errors.append(f"Row {row_num}: id_content is required")
                    continue
                
                if not nombre_archivo:
                    errors.append(f"Row {row_num}: Nombre de archivo is required")
                    continue
                
                # Extract directory name from path if available
                # Example: /COMERCIALES 2000/File.mov → COMERCIALES 2000
                directorio = None
                directorio_nombre = None
                
                if '/' in nombre_archivo:
                    path_parts = nombre_archivo.strip('/').split('/')
                    if len(path_parts) > 1:
                        directorio_nombre = path_parts[0]
                
                # Find or create directory
                if id_dir and supports_id_dir:
                    # Try to find by id_dir first
                    try:
                        directorio = Directorio.objects.get(id_dir=id_dir, repositorio=repositorio)
                    except Directorio.DoesNotExist:
                        # If not found and we have a directory name, create it
                        if directorio_nombre:
                            modulo_broadcast = Modulo.objects.filter(tipo='broadcast').first()
                            if modulo_broadcast:
                                directorio = Directorio.objects.create(
                                    nombre=directorio_nombre,
                                    repositorio=repositorio,
                                    modulo=modulo_broadcast,
                                    id_dir=id_dir
                                )
                        else:
                            errors.append(f"Row {row_num}: Directory with id_dir={id_dir} not found")
                            continue
                elif directorio_nombre:
                    # Try to find by name
                    directorio = Directorio.objects.filter(
                        nombre=directorio_nombre,
                        repositorio=repositorio
                    ).first()
                    
                    # If not found, create it
                    if not directorio:
                        modulo_broadcast = Modulo.objects.filter(tipo='broadcast').first()
                        if modulo_broadcast:
                            directorio = Directorio.objects.create(
                                nombre=directorio_nombre,
                                repositorio=repositorio,
                                modulo=modulo_broadcast
                            )
                
                # Build pizarra JSON from CSV fields
                pizarra = {
                    'producto': (row.get('product') or row.get('Product') or '').strip(),
                    'cliente': (row.get('client') or row.get('Client') or '').strip(),
                    'version': (row.get('version') or row.get('Version') or '').strip(),
                    'duracion': (row.get('duration') or row.get('Duration') or '').strip(),
                    'expedition': (row.get('expedition') or row.get('Expedition') or '').strip(),
                    'agencia': (row.get('agency') or row.get('Agency') or '').strip(),
                    'vtype': (row.get('vtype') or row.get('Type') or '').strip(),
                }
                
                # Get broadcast module (assuming Broadcast type)
                try:
                    modulo = Modulo.objects.get(tipo='broadcast')
                except Modulo.DoesNotExist:
                    errors.append(f"Row {row_num}: Broadcast module not found in system")
                    continue
                
                # Create or update broadcast depending on model capabilities
                if supports_id_content and id_content:
                    broadcast, created = Broadcast.objects.update_or_create(
                        id_content=id_content,
                        defaults={
                            'repositorio': repositorio,
                            'directorio': directorio,
                            'modulo': modulo,
                            'nombre_original': nombre_archivo,
                            'pizarra': pizarra,
                            'estado_transcodificacion': 'METADATA_ONLY',  # Solo metadata, no procesar
                        }
                    )
                else:
                    # Fallback: always create a new record (no unique id_content field available)
                    broadcast = Broadcast.objects.create(
                        repositorio=repositorio,
                        directorio=directorio,
                        modulo=modulo,
                        nombre_original=nombre_archivo,
                        pizarra=pizarra,
                        estado_transcodificacion='METADATA_ONLY',
                    )
                    created = True

                # Optional: set estado from Status
                if status_csv:
                    smap = {
                        'Pending': 'PENDIENTE',
                        'Processing': 'PROCESANDO',
                        'Completed': 'COMPLETADO',
                        'Error': 'ERROR'
                    }
                    estado_val = smap.get(status_csv, None)
                    if estado_val:
                        broadcast.estado_transcodificacion = estado_val
                        broadcast.save(update_fields=['estado_transcodificacion'])

                # Optional: set creado_por from Username
                if username_csv:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    user_obj = User.objects.filter(username=username_csv).first()
                    if user_obj:
                        broadcast.creado_por = user_obj
                        broadcast.save(update_fields=['creado_por'])
                
                if created:
                    created_count += 1
                else:
                    updated_count += 1
                    
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        # Build response
        response_data = {
            'success': True,
            'created': created_count,
            'updated': updated_count,
            'total_processed': created_count + updated_count,
            'errors': errors if errors else None
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error processing CSV file: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
