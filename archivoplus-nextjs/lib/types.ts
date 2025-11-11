export type PermisoRepositorio = {
  id: number;
  repositorio_id: number;
  repositorio_nombre: string;
  repositorio_folio: string;
  puede_ver: boolean;
  puede_editar: boolean;
  puede_borrar: boolean;
};

export type PerfilInfo = {
  id: number;
  clave: string;
  nombre: string;
};

export type User = {
  id: number | string;
  email: string;
  perfil: number | null;
  perfil_info: PerfilInfo | null;
  nombre_completo: string;
  compania: string | null;
  telefono: string | null;
  is_active: boolean;
  is_superuser: boolean;
  date_joined: string;
  permisos_repositorios: PermisoRepositorio[];
  tipo: 'administrador' | 'operador' | 'cliente';
};

export type Modulo = {
  id: number | string;
  nombre: string;
  tipo: string;
  descripcion?: string;
  formatos_permitidos?: string[];
  activo: boolean;
};

export type Repositorio = {
  id: number | string;
  nombre: string;
  folio: string;
  position: number;
  clave: string;
  activo: boolean;
  fecha_creacion: string;
  modulos: number[]; // ids
  modulos_detalle?: Modulo[];
};
