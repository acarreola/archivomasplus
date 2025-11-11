import React from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/serverApi';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-gray-600">Bienvenido{user?.nombre_completo ? `, ${user.nombre_completo}` : ''}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Tu cuenta</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><strong>Email:</strong> {user?.email}</li>
            <li><strong>Tipo:</strong> {user?.tipo}</li>
            <li><strong>Repos permitidos:</strong> {user?.permisos_repositorios?.length ?? 0}</li>
          </ul>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Accesos rápidos</h2>
          <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
            <li><Link className="underline underline-offset-2 hover:text-gray-900" href="/repos">Ir a Repos</Link></li>
            <li><span className="text-gray-500">Ir a Broadcasts</span></li>
            <li><span className="text-gray-500">Ir a Audio</span></li>
            <li><span className="text-gray-500">Ir a Images</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
