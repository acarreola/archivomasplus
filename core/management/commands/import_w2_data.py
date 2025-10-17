"""
Django management command para importar datos desde el sistema legacy w2.
Extrae usuarios y repositorios del archivo databases.sql de w2.

Uso:
    python manage.py import_w2_data /path/to/databases.sql
"""

import re
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.hashers import make_password
from core.models import CustomUser, Repositorio


class Command(BaseCommand):
    help = 'Importa usuarios y repositorios desde el sistema legacy w2'

    def add_arguments(self, parser):
        parser.add_argument(
            'sql_file',
            type=str,
            help='Ruta al archivo databases.sql de w2'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Ejecuta sin guardar cambios en la base de datos'
        )

    def handle(self, *args, **options):
        sql_file = options['sql_file']
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('Modo DRY RUN: No se guardarán cambios'))

        try:
            with open(sql_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
        except FileNotFoundError:
            raise CommandError(f'Archivo no encontrado: {sql_file}')
        except UnicodeDecodeError:
            # Intentar con latin1 si UTF-8 falla
            try:
                with open(sql_file, 'r', encoding='latin1') as f:
                    sql_content = f.read()
            except Exception as e:
                raise CommandError(f'Error al leer el archivo: {e}')

        self.stdout.write('Iniciando importación de datos de w2...\n')

        # Importar usuarios
        users_imported = self.import_users(sql_content, dry_run)
        self.stdout.write(self.style.SUCCESS(f'✓ {users_imported} usuarios importados'))

        # Importar repositorios
        repos_imported = self.import_repositories(sql_content, dry_run)
        self.stdout.write(self.style.SUCCESS(f'✓ {repos_imported} repositorios importados'))

        # Mapear relaciones usuario-repositorio
        if not dry_run:
            relations_created = self.map_user_repositories(sql_content)
            self.stdout.write(self.style.SUCCESS(f'✓ {relations_created} relaciones usuario-repositorio creadas'))

        self.stdout.write(self.style.SUCCESS('\n¡Importación completada!'))

    def import_users(self, sql_content, dry_run):
        """Importa usuarios desde el INSERT INTO `users` del SQL."""
        # Buscar el bloque INSERT INTO `users`
        users_pattern = r"INSERT INTO `users` VALUES (.+?);"
        users_match = re.search(users_pattern, sql_content, re.DOTALL)
        
        if not users_match:
            self.stdout.write(self.style.ERROR('No se encontró INSERT INTO `users`'))
            return 0

        users_data = users_match.group(1)
        
        # Parsear cada tupla de usuario
        # Formato: ('username','password','name','email','company','type','start','finish','status')
        user_tuples = re.findall(r"\('([^']*?)','([^']*?)','([^']*?)','([^']*?)','([^']*?)','([^']*?)','([^']*?)','([^']*?)','?([^']*?)'?\)", users_data)
        
        imported_count = 0
        skipped_count = 0
        
        for user_tuple in user_tuples:
            username, password, name, email, company, user_type, start_date, finish_date, status = user_tuple
            
            # Saltar usuarios inactivos (status != '1')
            if status != '1':
                skipped_count += 1
                continue

            # Verificar si el usuario ya existe
            if CustomUser.objects.filter(username=username).exists():
                self.stdout.write(self.style.WARNING(f'  • Usuario {username} ya existe, saltando...'))
                skipped_count += 1
                continue

            # Dividir nombre en first_name y last_name
            name_parts = name.split(maxsplit=1)
            first_name = name_parts[0] if len(name_parts) > 0 else ''
            last_name = name_parts[1] if len(name_parts) > 1 else ''

            # Determinar permisos según el tipo de usuario en w2
            # 'admin' = superusuario, 'moderator' = staff, otros = usuario normal
            is_superuser = (user_type.lower() == 'admin')
            is_staff = (user_type.lower() in ['admin', 'moderator'])

            if not dry_run:
                try:
                    user = CustomUser.objects.create(
                        username=username,
                        email=email or f'{username}@legacy.local',  # Email por defecto si está vacío
                        first_name=first_name,
                        last_name=last_name,
                        nombre_compania=company,
                        is_active=True,
                        is_staff=is_staff,
                        is_superuser=is_superuser,
                        # Las contraseñas del legacy están en texto plano, las hasheamos
                        password=make_password(password) if password else make_password('changeme123')
                    )
                    imported_count += 1
                    self.stdout.write(f'  • Importado: {username} ({company}) - tipo: {user_type}')
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  • Error al importar {username}: {e}'))
                    skipped_count += 1
            else:
                imported_count += 1
                self.stdout.write(f'  • [DRY RUN] Importaría: {username} ({company}) - tipo: {user_type}')

        self.stdout.write(f'\nTotal: {imported_count} importados, {skipped_count} saltados\n')
        return imported_count

    def import_repositories(self, sql_content, dry_run):
        """Importa repositorios desde el INSERT INTO `repositories` del SQL."""
        # Buscar el bloque INSERT INTO `repositories`
        repos_pattern = r"INSERT INTO `repositories` VALUES (.+?);"
        repos_match = re.search(repos_pattern, sql_content, re.DOTALL)
        
        if not repos_match:
            self.stdout.write(self.style.ERROR('No se encontró INSERT INTO `repositories`'))
            return 0

        repos_data = repos_match.group(1)
        
        # Parsear cada tupla de repositorio
        # Formato: ('id_repository','title','folio','status',position)
        repo_tuples = re.findall(r"\('([^']+?)','([^']*?)','([^']*?)','?([^']*?)'?,(\d+)\)", repos_data)
        
        imported_count = 0
        skipped_count = 0
        
        for repo_tuple in repo_tuples:
            id_repository, title, folio, status, position = repo_tuple
            
            # Saltar repositorios inactivos (status != '1')
            if status != '1':
                skipped_count += 1
                continue

            # Verificar si el repositorio ya existe (por folio/código)
            if Repositorio.objects.filter(folio=id_repository).exists():
                self.stdout.write(self.style.WARNING(f'  • Repositorio {id_repository} ({title}) ya existe, saltando...'))
                skipped_count += 1
                continue

            if not dry_run:
                try:
                    repo = Repositorio.objects.create(
                        nombre=title,
                        folio=id_repository,  # Usar id_repository como folio
                        descripcion=f'Repositorio migrado desde w2 (folio original: {folio})',
                        activo=True
                    )
                    imported_count += 1
                    self.stdout.write(f'  • Importado: {id_repository} - {title}')
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  • Error al importar {id_repository}: {e}'))
                    skipped_count += 1
            else:
                imported_count += 1
                self.stdout.write(f'  • [DRY RUN] Importaría: {id_repository} - {title}')

        self.stdout.write(f'\nTotal: {imported_count} importados, {skipped_count} saltados\n')
        return imported_count

    def map_user_repositories(self, sql_content):
        """
        Mapea relaciones ManyToMany entre usuarios y repositorios.
        Extrae de repositories_users_flags la relación única (repo, user).
        """
        self.stdout.write('\nCreando relaciones usuario-repositorio...')
        
        # Buscar el bloque INSERT INTO `repositories_users_flags`
        flags_pattern = r"INSERT INTO `repositories_users_flags` VALUES (.+?);"
        flags_match = re.search(flags_pattern, sql_content, re.DOTALL)
        
        if not flags_match:
            self.stdout.write(self.style.WARNING('No se encontró INSERT INTO `repositories_users_flags`'))
            return 0

        flags_data = flags_match.group(1)
        
        # Parsear tuplas (id_repository, username, flag, type)
        # Solo nos interesan repo y user, ignoramos los permisos específicos
        flag_tuples = re.findall(r"\('([^']+?)','([^']+?)','[^']+?','[^']+?'\)", flags_data)
        
        # Crear set de relaciones únicas (repo_folio, username)
        unique_relations = set(flag_tuples)
        
        created_count = 0
        skipped_count = 0
        
        for repo_folio, username in unique_relations:
            try:
                # Buscar repositorio por folio
                repo = Repositorio.objects.get(folio=repo_folio)
                # Buscar usuario por username
                user = CustomUser.objects.get(username=username)
                
                # Agregar relación si no existe
                if not user.repositorios.filter(id=repo.id).exists():
                    user.repositorios.add(repo)
                    created_count += 1
                else:
                    skipped_count += 1
                    
            except Repositorio.DoesNotExist:
                # Repositorio no existe (probablemente estaba inactivo y no se importó)
                skipped_count += 1
            except CustomUser.DoesNotExist:
                # Usuario no existe (probablemente estaba inactivo y no se importó)
                skipped_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  • Error al mapear {repo_folio}-{username}: {e}'))
                skipped_count += 1

        self.stdout.write(f'Total: {created_count} relaciones creadas, {skipped_count} saltadas\n')
        return created_count
