// Identificación de jugadores.
//
// - Con Supabase configurado (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en
//   server/.env): el cliente manda el token de su sesión (un JWT) y aquí le
//   preguntamos a Supabase de quién es. Si no es válido, no entra.
// - Sin Supabase: todos entran como invitados (útil para desarrollar).
//
// La clave service_role da acceso TOTAL a la base de datos: solo puede estar
// en el servidor, nunca en el cliente ni en el repositorio.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface PlayerIdentity {
  id: string;
  name: string;
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Cliente de Supabase con permisos de servidor, o null si no está configurado. */
export const supabase: SupabaseClient | null =
  url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;

let guestCounter = 0;

/** Nombre visible: 3-16 caracteres, solo letras, números, espacios, guiones. */
export function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/[^\p{L}\p{N} _-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return name.length >= 3 ? name : null;
}

/** Averigua quién es el jugador. Devuelve null si el token no es válido. */
export async function identify(token: unknown): Promise<PlayerIdentity | null> {
  if (!supabase) {
    guestCounter++;
    return { id: `guest-${guestCounter}`, name: `Invitado ${guestCounter}` };
  }
  if (typeof token !== 'string') return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  const user = data.user;
  const name =
    sanitizeName(user.user_metadata?.name) ?? sanitizeName(user.email?.split('@')[0]) ?? 'Viajero';
  return { id: user.id, name };
}
