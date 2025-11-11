import axios from 'axios';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

// Helper para codificación personalizada de un broadcast
export async function encodeBroadcast(params: {
  broadcastId: string;
  settings: any;
  presetId?: string;
}) {
  return api.post('/broadcasts/encode/', {
    broadcast_id: params.broadcastId,
    settings: params.settings,
    preset_id: params.presetId || 'custom',
  });
}
