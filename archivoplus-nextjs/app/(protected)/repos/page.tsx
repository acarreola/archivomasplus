import React from 'react';
import Link from 'next/link';
import { listRepos } from '@/lib/serverApi';

export default async function ReposPage() {
  const repos = await listRepos();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Repositorios</h1>
          <p className="text-gray-600">Listado de repositorios a los que tienes acceso.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-700 hover:text-gray-900">Volver al Dashboard</Link>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-600">
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Folio</th>
              <th className="px-4 py-2 font-medium">Clave</th>
              <th className="px-4 py-2 font-medium">Activo</th>
              <th className="px-4 py-2 font-medium">Módulos</th>
            </tr>
          </thead>
          <tbody>
            {repos.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>No hay repositorios disponibles.</td>
              </tr>
            ) : (
              repos.map(repo => (
                <tr key={String(repo.id)} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-2">{repo.nombre}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-700">{repo.folio}</td>
                  <td className="px-4 py-2">{repo.clave}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${repo.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}>
                      {repo.activo ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {repo.modulos_detalle && repo.modulos_detalle.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {repo.modulos_detalle.map(m => (
                          <span key={String(m.id)} className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                            {m.nombre}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
