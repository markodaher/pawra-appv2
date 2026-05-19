import type { AuthChangeEvent, Session, Subscription } from '@supabase/supabase-js';
import type { Role } from '../types';
import { supabase } from './supabase';

export type SimpleResult = { success: boolean; error?: string };
export type SendOtpResult = SimpleResult;
export type VerifyOtpResult = { success: boolean; session?: Session; error?: string };

export async function sendOtp(email: string): Promise<SendOtpResult> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function verifyOtp(email: string, token: string): Promise<VerifyOtpResult> {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) return { success: false, error: error.message };
  if (!data.session) return { success: false, error: 'No session returned from server.' };
  return { success: true, session: data.session };
}

export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      // Stale / revoked refresh token — clear it so the user goes back to
      // sign-in cleanly instead of being stuck in a crash loop.
      if (
        error.message?.toLowerCase().includes('refresh token') ||
        error.message?.toLowerCase().includes('invalid') ||
        error.status === 400 ||
        error.status === 401
      ) {
        await supabase.auth.signOut({ scope: 'local' });
      }
      return null;
    }
    return data.session ?? null;
  } catch {
    // Belt-and-suspenders: also catch thrown exceptions from the underlying
    // fetch, which can happen when the stored token is completely corrupt.
    try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* ignore */ }
    return null;
  }
}

export async function signOut(): Promise<SimpleResult> {
  const { error } = await supabase.auth.signOut();
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Persists the role on the user account via auth metadata so it survives logouts.
export async function setUserRole(role: Role): Promise<SimpleResult> {
  const { error } = await supabase.auth.updateUser({ data: { role } });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Generic metadata writer — Supabase merges the patch into existing user_metadata,
// so passing { name } leaves role and other fields intact.
export async function updateUserMetadata(patch: Record<string, unknown>): Promise<SimpleResult> {
  const { error } = await supabase.auth.updateUser({ data: patch });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export function readRole(session: Session | null): Role | null {
  const r = session?.user?.user_metadata?.role;
  return r === 'owner' || r === 'provider' ? r : null;
}

export function onAuthStateChange(
  cb: (event: AuthChangeEvent, session: Session | null) => void,
): Subscription {
  const { data } = supabase.auth.onAuthStateChange(cb);
  return data.subscription;
}
