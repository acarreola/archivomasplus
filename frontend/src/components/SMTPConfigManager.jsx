import { useState, useEffect } from 'react';
import axios from '../utils/axios';

// Iconos SVG inline
const EnvelopeIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
  </svg>
);

const ServerIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 0 0-.12-1.03l-2.268-9.64a3.375 3.375 0 0 0-3.285-2.602H7.923a3.375 3.375 0 0 0-3.285 2.602l-2.268 9.64a4.5 4.5 0 0 0-.12 1.03v.228m19.5 0a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3m19.5 0a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3m16.5 0h.008v.008h-.008v-.008Zm-3 0h.008v.008h-.008v-.008Z" />
  </svg>
);

const KeyIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const ExclamationTriangleIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);

const InformationCircleIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
  </svg>
);

const EyeIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const EyeSlashIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

function SMTPConfigManager() {
  const [config, setConfig] = useState({
    email_backend: 'console',
    email_host: 'smtp.gmail.com',
    email_port: '587',
    email_use_tls: true,
    email_host_user: '',
    email_host_password: '',
    default_from_email: 'noreply@archivoplus.local',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get('/api/smtp-config/');
      if (response.data) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error('Error fetching SMTP config:', error);
      // Si no existe endpoint, mostrar configuración por defecto
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post('/api/smtp-config/', config);
      
      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'Configuración SMTP guardada exitosamente'
        });
      }
    } catch (error) {
      console.error('Error saving SMTP config:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error al guardar la configuración'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setMessage({
        type: 'error',
        text: 'Por favor ingresa un email de prueba'
      });
      return;
    }

    setTestingEmail(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post('/api/smtp-config/test/', {
        email: testEmail,
        config: config
      });

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: `Email de prueba enviado a ${testEmail}`
        });
      }
    } catch (error) {
      console.error('Error testing email:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error al enviar email de prueba'
      });
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-t-lg">
          <div className="flex items-center">
            <EnvelopeIcon className="h-8 w-8 text-white mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-white">Configuración SMTP</h2>
              <p className="text-blue-100 text-sm mt-1">
                Configurar servidor de email para recuperación de contraseñas
              </p>
            </div>
          </div>
        </div>

        {/* Información importante */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 m-6">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Configuración de Gmail
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p className="mb-2">Para usar Gmail como servidor SMTP:</p>
                <ol className="list-decimal ml-5 space-y-1">
                  <li>Ve a tu cuenta de Google: <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="underline">Security Settings</a></li>
                  <li>Activa "2-Step Verification" si no está activado</li>
                  <li>Ve a "App Passwords" y genera una contraseña para "Mail"</li>
                  <li>Usa esa contraseña de 16 caracteres en el campo "Password" abajo</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        {message.text && (
          <div className={`m-6 rounded-lg p-4 border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex">
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              )}
              <p className={`ml-3 text-sm font-medium ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Email Backend */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backend de Email
            </label>
            <select
              value={config.email_backend}
              onChange={(e) => handleChange('email_backend', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="console">Console (Development - muestra en logs)</option>
              <option value="smtp">SMTP (Production - envía emails reales)</option>
            </select>
          </div>

          {/* SMTP Host */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ServerIcon className="inline h-4 w-4 mr-1" />
              SMTP Host
            </label>
            <input
              type="text"
              value={config.email_host}
              onChange={(e) => handleChange('email_host', e.target.value)}
              placeholder="smtp.gmail.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={config.email_backend === 'console'}
            />
          </div>

          {/* Port y TLS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Puerto SMTP
              </label>
              <input
                type="number"
                value={config.email_port}
                onChange={(e) => handleChange('email_port', e.target.value)}
                placeholder="587"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={config.email_backend === 'console'}
              />
              <p className="mt-1 text-xs text-gray-500">587 para TLS, 465 para SSL</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usar TLS
              </label>
              <div className="flex items-center h-10">
                <input
                  type="checkbox"
                  checked={config.email_use_tls}
                  onChange={(e) => handleChange('email_use_tls', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={config.email_backend === 'console'}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Activar TLS (recomendado)
                </span>
              </div>
            </div>
          </div>

          {/* Email User */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <EnvelopeIcon className="inline h-4 w-4 mr-1" />
              Email Usuario (cuenta Gmail)
            </label>
            <input
              type="email"
              value={config.email_host_user}
              onChange={(e) => handleChange('email_host_user', e.target.value)}
              placeholder="tu-cuenta@gmail.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={config.email_backend === 'console'}
            />
          </div>

          {/* Email Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <KeyIcon className="inline h-4 w-4 mr-1" />
              Password (App Password de Gmail)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={config.email_host_password}
                onChange={(e) => handleChange('email_host_password', e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={config.email_backend === 'console'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Usa la App Password generada en Google, no tu contraseña normal
            </p>
          </div>

          {/* Default From Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Remitente (From)
            </label>
            <input
              type="email"
              value={config.default_from_email}
              onChange={(e) => handleChange('default_from_email', e.target.value)}
              placeholder="noreply@archivoplus.local"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Email que aparecerá como remitente de los correos
            </p>
          </div>

          {/* Test Email Section */}
          {config.email_backend === 'smtp' && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Probar Configuración
              </h3>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  {testingEmail ? 'Enviando...' : 'Enviar Prueba'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Envía un email de prueba para verificar la configuración
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium rounded-lg hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
            >
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SMTPConfigManager;
