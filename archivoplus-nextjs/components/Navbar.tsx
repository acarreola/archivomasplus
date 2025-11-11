"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';

export default function Navbar({ user }: { user: User | null }) {
  const router = useRouter();

  const onLogout = async () => {
    try {
      await api.post('/auth/logout/');
    } catch (e) {
      // ignore
    } finally {
      router.replace('/login');
    }
  };

  return (
    <nav className="w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-lg font-semibold">Archivo+</Link>
          <div className="hidden md:flex items-center gap-3 text-sm text-gray-600">
            <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
            <Link href="/repos" className="hover:text-gray-900">Repos</Link>
            <Link href="/images" className="hover:text-gray-900">Images</Link>
            <Link href="/audio" className="hover:text-gray-900">Audio</Link>
            <Link href="/broadcasts" className="hover:text-gray-900">Broadcasts</Link>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-gray-700">{user.nombre_completo || user.email}</span>
              <button onClick={onLogout} className="rounded bg-gray-900 text-white px-3 py-1.5 text-sm hover:bg-black">Salir</button>
            </>
          ) : (
            <Link href="/login" className="rounded bg-gray-900 text-white px-3 py-1.5 text-sm hover:bg-black">Entrar</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
