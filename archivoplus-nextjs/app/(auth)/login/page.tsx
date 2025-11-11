"use client";

import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const search = useSearchParams();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/login/', { email, password, remember_me: remember });
      // Redirect to next or dashboard
      const next = search.get('next') || '/dashboard';
      router.replace(next);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Entrar a Archivo+</h1>
        <p className="text-sm text-gray-600 mb-6">Usa tu email y contraseña para acceder.</p>
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 focus:outline-none focus:ring"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 focus:outline-none focus:ring"
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Recordar sesión
            </label>
            <a href="#" className="text-sm text-gray-600 hover:text-gray-900">¿Olvidaste tu contraseña?</a>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-gray-900 text-white px-4 py-2 font-medium hover:bg-black disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
