/**
 * PM2 Ecosystem Configuration - ArchivoPlus (Mac M4 Nativo)
 * 
 * Configuración para gestión de procesos en instalación nativa
 * Optimizado para Mac M4 Apple Silicon
 * 
 * Uso:
 *   pm2 start ecosystem.config.js
 *   pm2 status
 *   pm2 logs
 *   pm2 restart all
 *   pm2 stop all
 */

const os = require('os');
const path = require('path');

// Detectar usuario y home directory
const USER_HOME = os.homedir();
const APP_DIR = path.join(USER_HOME, 'Servers', 'ArchivoPlus');
const VENV_PYTHON = path.join(APP_DIR, 'venv_archivoplus', 'bin', 'python');

// Detectar número de CPUs para optimización
const CPU_COUNT = os.cpus().length;
const CELERY_WORKERS = Math.min(CPU_COUNT - 2, 8); // Dejar 2 cores libres, máximo 8 workers

module.exports = {
  apps: [
    // =========================================================================
    // Django Backend Server
    // =========================================================================
    {
      name: 'archivoplus-backend',
      script: VENV_PYTHON,
      args: 'manage.py runserver 127.0.0.1:8000 --noreload',
      cwd: APP_DIR,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        PYTHONUNBUFFERED: '1',
        DJANGO_SETTINGS_MODULE: 'archivoplus_backend.settings',
      },
      error_file: path.join(APP_DIR, 'logs', 'backend-error.log'),
      out_file: path.join(APP_DIR, 'logs', 'backend-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },

    // =========================================================================
    // Celery Worker - Procesamiento de Video/Audio
    // =========================================================================
    {
      name: 'archivoplus-celery-worker',
      script: VENV_PYTHON,
      args: `-m celery -A archivoplus_backend worker --loglevel=info --concurrency=${CELERY_WORKERS} --max-tasks-per-child=10`,
      cwd: APP_DIR,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '4G',
      kill_timeout: 30000, // 30 segundos para terminar tareas antes de matar el proceso
      env: {
        PYTHONUNBUFFERED: '1',
        DJANGO_SETTINGS_MODULE: 'archivoplus_backend.settings',
        CELERY_WORKER_CONCURRENCY: CELERY_WORKERS.toString(),
        // Optimizaciones para Mac M4
        FFMPEG_THREADS: '10',
        FFMPEG_HWACCEL: 'videotoolbox',
        OMP_NUM_THREADS: '10',
      },
      error_file: path.join(APP_DIR, 'logs', 'celery-worker-error.log'),
      out_file: path.join(APP_DIR, 'logs', 'celery-worker-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },

    // =========================================================================
    // Celery Beat - Tareas Programadas
    // =========================================================================
    {
      name: 'archivoplus-celery-beat',
      script: VENV_PYTHON,
      args: '-m celery -A archivoplus_backend beat --loglevel=info',
      cwd: APP_DIR,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        PYTHONUNBUFFERED: '1',
        DJANGO_SETTINGS_MODULE: 'archivoplus_backend.settings',
      },
      error_file: path.join(APP_DIR, 'logs', 'celery-beat-error.log'),
      out_file: path.join(APP_DIR, 'logs', 'celery-beat-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },

    // =========================================================================
    // Flower - Monitor de Celery (Opcional)
    // =========================================================================
    {
      name: 'archivoplus-flower',
      script: VENV_PYTHON,
      args: '-m celery -A archivoplus_backend flower --port=5555',
      cwd: APP_DIR,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        PYTHONUNBUFFERED: '1',
        DJANGO_SETTINGS_MODULE: 'archivoplus_backend.settings',
      },
      error_file: path.join(APP_DIR, 'logs', 'flower-error.log'),
      out_file: path.join(APP_DIR, 'logs', 'flower-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Flower es opcional, se puede deshabilitar si no se necesita
      // Para deshabilitarlo, comentar esta app completa o usar: pm2 stop archivoplus-flower
    },
  ],

  // ===========================================================================
  // Configuración de despliegue (opcional)
  // ===========================================================================
  deploy: {
    production: {
      user: os.userInfo().username,
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:tu-usuario/archivoplus.git',
      path: APP_DIR,
      'post-deploy': 'source venv_archivoplus/bin/activate && pip install -r requirements.txt && python manage.py migrate && pm2 reload ecosystem.config.js',
    },
  },
};
