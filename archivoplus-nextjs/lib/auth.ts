import Cookies from 'js-cookie';
import { setAuthToken } from './api';

export function getToken() {
  return Cookies.get('sessionid') || Cookies.get('token');
}

export function initAuthFromCookies() {
  const t = getToken();
  if (t) setAuthToken(t);
}
