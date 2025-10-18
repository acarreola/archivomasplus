import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import Login from './components/Login';
import RequireAuth from './components/RequireAuth';
import Navbar from './components/Navbar';
import RepositoriosManager from './components/RepositoriosManager';
import UsuariosManager from './components/UsuariosManager';
import ComercialesManager from './components/ComercialesManager';
import ConfiguracionManager from './components/ConfiguracionManager';
import SharedPlayer from './components/SharedPlayer';

// Admin area component
function AdminArea() {
  return (
    <div className="bg-gray-100 min-h-screen flex flex-col">
      <Navbar isAdminArea={true} />
      <main className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <div className="bg-white rounded-lg shadow-lg h-full">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button className="px-6 py-4 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
                  Repositorios
                </button>
                <button className="px-6 py-4 text-sm font-medium text-gray-600 hover:text-gray-800">
                  Usuarios
                </button>
                <button className="px-6 py-4 text-sm font-medium text-gray-600 hover:text-gray-800">
                  Configuración
                </button>
              </nav>
            </div>
            <div className="p-6">
              <RepositoriosManager />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  const router = createBrowserRouter([
    // Public routes
    { path: '/shared/:linkId', element: <SharedPlayer /> },
    { path: '/login', element: <Login /> },

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
        <RequireAuth requireAdmin={true}>
          <AdminArea />
        </RequireAuth>
      ),
    },

    // Catch-all -> redirect to home
    { path: '*', element: <Navigate to="/" replace /> },
  ]);

  return (
    <RouterProvider
      router={router}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    />
  );
}

export default App;


