// Login con Supabase Auth (email y contraseña).
//
// El cliente solo usa la clave PÚBLICA (anon). Supabase le devuelve una sesión
// con un token (JWT) que mandamos al servidor del juego al conectar; el
// servidor lo verifica con Supabase y así sabe quién somos.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Cliente de Supabase, o null si no está configurado (entonces se entra como invitado).
 * La sesión se guarda en sessionStorage, que es de cada pestaña: así se puede
 * jugar con una cuenta distinta en cada pestaña del mismo navegador. Sobrevive
 * a recargar la página, pero al cerrar la pestaña hay que volver a entrar.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { storage: sessionStorage } }) : null;

/** Token de la sesión guardada en esta pestaña, si la hay. */
export async function currentToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signIn(email: string, password: string): Promise<string> {
  const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(translate(error?.message));
  return data.session.access_token;
}

/**
 * Crea la cuenta. El nombre se guarda en los metadatos del usuario y el
 * servidor lo usará como nombre del avatar. Devuelve null si Supabase pide
 * confirmar el email antes de entrar.
 */
export async function signUp(email: string, password: string, name: string): Promise<string | null> {
  const { data, error } = await supabase!.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw new Error(translate(error.message));
  return data.session?.access_token ?? null;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

/** Mensajes de error de Supabase más comunes, en español. */
function translate(message: string | undefined): string {
  if (!message) return 'No se ha podido iniciar sesión.';
  if (message.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (message.includes('already registered')) return 'Ya existe una cuenta con ese email.';
  if (message.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (message.includes('Email not confirmed')) return 'Confirma tu email antes de entrar.';
  return message;
}
