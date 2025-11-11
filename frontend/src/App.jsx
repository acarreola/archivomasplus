import { useState } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import RequireAuth from './components/RequireAuth';
import Navbar from './components/Navbar';
import RepositoriosManager from './components/RepositoriosManager';
import RepoContentPage from './components/RepoContentPage';
import UsuariosManager from './components/UsuariosManager';
import ComercialesManager from './components/ComercialesManager';
import ModulosManager from './components/ModulosManager';
import PerfilesManager from './components/PerfilesManager';
import SystemInfoManager from './components/SystemInfoManager';
import VinculacionesManager from './components/VinculacionesManager';
import HistoryManager from './components/HistoryManager';
import SharedPlayer from './components/SharedPlayer';
import SMTPConfigManager from './components/SMTPConfigManager';

// Root layout - just outlet, providers are in App
function RootLayout() {
  return <Outlet />;
}

// Admin area component
function AdminArea() {
  const [activeTab, setActiveTab] = useState('repositorios');

  const renderContent = () => {
    switch (activeTab) {
      case 'repositorios':
        return <RepositoriosManager />;
      case 'usuarios':
        return <UsuariosManager />;
      case 'modulos':
        return <ModulosManager />;
      case 'perfiles':
        return <PerfilesManager />;
      case 'system-info':
        return <SystemInfoManager />;
      case 'vinculaciones':
        return <VinculacionesManager />;
      case 'history':
        return <HistoryManager />;
      case 'smtp':
        return <SMTPConfigManager />;
      default:
        return <RepositoriosManager />;
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col">
      <Navbar isAdminArea={true} />
      <main className="flex-1 overflow-hidden">
        <div className="h-full">
          <div className="bg-white h-full flex flex-col">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px overflow-x-auto">
                <button 
                  onClick={() => setActiveTab('repositorios')}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === 'repositorios' 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Repositories
                </button>
                <button 
                  onClick={() => setActiveTab('usuarios')}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === 'usuarios' 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Users
                </button>
                <button 
                  onClick={() => setActiveTab('modulos')}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === 'modulos' 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Modules
                </button>
                <button 
                  onClick={() => setActiveTab('perfiles')}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === 'perfiles' 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Profiles
                </button>
                <button 
                  onClick={() => setActiveTab('system-info')}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === 'system-info' 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  System Information
                </button>
                <button 
                  onClick={() => setActiveTab('vinculaciones')}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === 'vinculaciones' 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Connections
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === 'history' 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  History
                </button>
                <button 
                  onClick={() => setActiveTab('smtp')}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === 'smtp' 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  SMTP Config
                </button>
              </nav>
            </div>
            <div className="flex-1 overflow-auto">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  const router = createBrowserRouter([
    {
      element: <RootLayout />,
      children: [
        // Public routes
        { path: '/shared/:linkId', element: <SharedPlayer /> },
        { path: '/login', element: <Login /> },
        { path: '/reset-password/:uid/:token', element: <ResetPassword /> },

        // Protected home route
        {
          path: '/',
          element: (
            <RequireAuth>
              <div className="h-screen w-screen overflow-hidden flex flex-col">
                <Navbar isAdminArea={false} />
                <div className="flex-1 overflow-hidden">
                  <ComercialesManager />
                </div>
              </div>
            </RequireAuth>
          ),
        },

        // Admin route
        {
          path: '/admin',
          element: (
            <RequireAuth>
              <AdminArea />
            </RequireAuth>
          ),
        },

        // Nueva ruta para el contenido del repositorio
        {
          path: '/repositorio/:repoId',
          element: (
            <RequireAuth>
              <div className="bg-gray-100 min-h-screen">
                <Navbar isAdminArea={true} />
                <main className="flex-1 overflow-hidden p-6">
                  <div className="bg-white rounded-lg shadow-lg h-full">
                    <RepoContentPage />
                  </div>
                </main>
              </div>
            </RequireAuth>
          ),
        },

        // Catch-all -> redirect to home
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ]);

  return (
    <LanguageProvider>
      <AuthProvider>
        <RouterProvider
          router={router}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;


