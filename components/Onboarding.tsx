import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform,
  Pressable, Text, TextInput, View,
} from 'react-native';
import { FONT } from '../constants/theme';
import { sendOtp, setUserRole, verifyOtp } from '../lib/auth';
import type { Role, Theme } from '../types';
import { Icon } from './Icon';
import { Button, Field, Input } from './primitives';

type Props = {
  T: Theme;
  /** True when there's already a Supabase session but no role on the account yet — start at role pick. */
  startAtRolePick: boolean;
  /** Pre-fill the OTP screen's email line for already-signed-in users. */
  initialEmail?: string;
  /**
   * Called when the user is fully authenticated.
   * `isNewUser` is true only when the user just picked their role for the
   * first time — false for returning users who already had one in metadata.
   */
  onComplete: (r: Role, email: string, isNewUser: boolean) => void;
};

export function Onboarding({ T, startAtRolePick, initialEmail = '', onComplete }: Props) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(startAtRolePick ? 3 : 0);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  // If the parent flips startAtRolePick after auth (rare race), respect it.
  useEffect(() => {
    if (startAtRolePick && step < 3) setStep(3);
  }, [startAtRolePick, step]);

  const handleOtp = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const n = [...otp]; n[i] = v; setOtp(n);
    if (v && i < 5) {
      otpRefs.current[i + 1]?.focus();
      return;
    }
    // 6th digit just landed — dismiss the keyboard and auto-verify with the
    // assembled code (we can't read state synchronously after setOtp).
    if (v && i === 5) {
      const code = n.join('');
      if (code.length === 6) {
        Keyboard.dismiss();
        void runVerify(code);
      }
    }
  };

  const handleSendCode = async () => {
    Keyboard.dismiss();
    setError(null);
    setLoading(true);
    const res = await sendOtp(email.trim());
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Could not send code. Check the email and try again.');
      return;
    }
    setStep(2);
  };

  const handleResend = async () => {
    Keyboard.dismiss();
    setError(null);
    setLoading(true);
    const res = await sendOtp(email.trim());
    setLoading(false);
    if (!res.success) setError(res.error || 'Could not resend code.');
    setOtp(['', '', '', '', '', '']);
    otpRefs.current[0]?.focus();
  };

  const runVerify = async (code: string) => {
    setError(null);
    setLoading(true);
    const res = await verifyOtp(email.trim(), code);
    setLoading(false);
    if (!res.success || !res.session) {
      setError(res.error || 'That code didn\'t work. Try again.');
      return;
    }
    // Returning user — has a role saved in metadata. Skip role pick + setup.
    const meta = res.session.user.user_metadata as { role?: string } | undefined;
    if (meta?.role === 'owner' || meta?.role === 'provider') {
      onComplete(meta.role, email.trim(), false /* isNewUser */);
      return;
    }
    setStep(3);
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter all 6 digits.'); return; }
    Keyboard.dismiss();
    void runVerify(code);
  };

  const handleConfirmRole = async () => {
    if (!role) return;
    setError(null);
    setLoading(true);
    const res = await setUserRole(role);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Could not save your role. Try again.');
      return;
    }
    onComplete(role, email.trim() || initialEmail, true /* isNewUser */);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ position: 'absolute', inset: 0, backgroundColor: T.bg, zIndex: 90 }}
    >
      {step === 0 && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <View style={{
            width: 92, height: 92, borderRadius: 28, backgroundColor: T.brand,
            alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          }}>
            <Icon name="logo" size={52} color="#fff" />
          </View>
          <Text style={{ fontFamily: FONT.serif, fontSize: 44, fontWeight: '600', color: T.ink, letterSpacing: -1 }}>pawra</Text>
          <Text style={{ fontSize: 16, color: T.inkSoft, lineHeight: 24, marginTop: 14, maxWidth: 280, textAlign: 'center' }}>
            Lebanon's home for pet care.{'\n'}Walks, vets, grooming and supplies — booked in one tap.
          </Text>
          <View style={{ marginTop: 56, width: '100%', gap: 10 }}>
            <Button T={T} full size="lg" onPress={() => setStep(1)}>Get started</Button>
            <Button T={T} full size="md" variant="ghost" onPress={() => setStep(1)}>I already have an account</Button>
          </View>
        </View>
      )}

      {step === 1 && (
        <View style={{ flex: 1, paddingTop: 80, paddingHorizontal: 24, paddingBottom: 24 }}>
          <Pressable onPress={() => setStep(0)} style={backBtn(T)}><Icon name="chevron-left" size={20} color={T.ink} /></Pressable>
          <Text style={{ fontSize: 30, fontWeight: '700', color: T.ink, letterSpacing: -0.6, marginTop: 32, marginBottom: 8 }}>What's your email?</Text>
          <Text style={{ fontSize: 15, color: T.inkSoft, marginBottom: 28 }}>We'll send you a 6-digit code. No password needed.</Text>
          <Field T={T} label="Email">
            <Input
              T={T}
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={() => { if (email.includes('@') && !loading) void handleSendCode(); }}
            />
          </Field>
          {error ? <ErrorText T={T} text={error} /> : null}
          <View style={{ flex: 1 }} />
          <Button
            T={T} full size="lg"
            onPress={handleSendCode}
            icon={loading ? undefined : 'mail'}
            disabled={!email.includes('@') || loading}
          >
            {loading ? 'Sending…' : 'Send code'}
          </Button>
        </View>
      )}

      {step === 2 && (
        <View style={{ flex: 1, paddingTop: 80, paddingHorizontal: 24, paddingBottom: 24 }}>
          <Pressable onPress={() => setStep(1)} style={backBtn(T)}><Icon name="chevron-left" size={20} color={T.ink} /></Pressable>
          <Text style={{ fontSize: 30, fontWeight: '700', color: T.ink, letterSpacing: -0.6, marginTop: 32, marginBottom: 8 }}>Enter the code</Text>
          <Text style={{ fontSize: 15, color: T.inkSoft, marginBottom: 32 }}>
            Sent to <Text style={{ color: T.ink, fontWeight: '600' }}>{email}</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
            {otp.map((d, i) => (
              <TextInput
                key={i}
                ref={el => { otpRefs.current[i] = el; }}
                value={d}
                onChangeText={v => handleOtp(i, v)}
                onKeyPress={e => {
                  if (e.nativeEvent.key === 'Backspace' && !d && i > 0) otpRefs.current[i - 1]?.focus();
                }}
                maxLength={1}
                keyboardType="number-pad"
                editable={!loading}
                style={{
                  width: 48, height: 60, borderRadius: 14, textAlign: 'center',
                  fontFamily: FONT.sans, fontSize: 26, fontWeight: '700', color: T.ink,
                  backgroundColor: T.surface, borderWidth: 1.5, borderColor: d ? T.brand : T.hairline,
                }}
              />
            ))}
          </View>
          {error ? <ErrorText T={T} text={error} /> : null}
          <Pressable
            onPress={handleResend}
            disabled={loading}
            style={{ marginTop: 16, alignSelf: 'flex-start', opacity: loading ? 0.5 : 1 }}
          >
            <Text style={{ color: T.brand, fontSize: 14, fontWeight: '600' }}>Resend code</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Button
            T={T} full size="lg"
            onPress={handleVerify}
            disabled={otp.some(d => !d) || loading}
          >
            {loading ? 'Verifying…' : 'Verify'}
          </Button>
        </View>
      )}

      {step === 3 && (
        <View style={{ flex: 1, paddingTop: 80, paddingHorizontal: 24, paddingBottom: 24 }}>
          <Text style={{ fontSize: 30, fontWeight: '700', color: T.ink, letterSpacing: -0.6, marginTop: 32, marginBottom: 8 }}>How will you use Pawra?</Text>
          <Text style={{ fontSize: 15, color: T.inkSoft, marginBottom: 24 }}>This is set at signup and can't be changed later.</Text>
          <View style={{ gap: 12 }}>
            {([
              { id: 'owner' as const, icon: 'paw', title: 'I have pets', sub: 'Book services, shop supplies, keep their passport', accent: T.brand },
              { id: 'provider' as const, icon: 'stethoscope', title: 'I offer pet services', sub: 'Receive bookings, sell products, manage your schedule', accent: T.accent },
            ]).map(o => {
              const sel = role === o.id;
              return (
                <Pressable key={o.id} onPress={() => setRole(o.id)} style={{
                  padding: 18, borderRadius: 20,
                  backgroundColor: sel ? T.brandSoft : T.surface,
                  borderWidth: 1.5, borderColor: sel ? T.brand : T.hairline,
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                }}>
                  <View style={{
                    width: 56, height: 56, borderRadius: 16, backgroundColor: o.accent,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={o.icon} size={28} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>{o.title}</Text>
                    <Text style={{ fontSize: 13, color: T.inkSoft, marginTop: 3, lineHeight: 18 }}>{o.sub}</Text>
                  </View>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: sel ? T.brand : 'transparent',
                    borderWidth: 1.5, borderColor: sel ? T.brand : T.inkMuted,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sel ? <Icon name="check" size={12} color="#fff" strokeWidth={2.5} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          {error ? <ErrorText T={T} text={error} /> : null}
          <View style={{ flex: 1 }} />
          <Button T={T} full size="lg" onPress={handleConfirmRole} disabled={!role || loading}>
            {loading ? 'Saving…' : 'Continue'}
          </Button>
        </View>
      )}

      {loading ? (
        <View pointerEvents="none" style={{
          position: 'absolute', top: 24, alignSelf: 'center', left: 0, right: 0, alignItems: 'center',
        }}>
          <ActivityIndicator color={T.brand} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function ErrorText({ T, text }: { T: Theme; text: string }) {
  return (
    <View style={{
      marginTop: 14, padding: 12, borderRadius: 12,
      backgroundColor: 'rgba(200,74,72,0.10)',
      borderWidth: 1, borderColor: 'rgba(200,74,72,0.25)',
    }}>
      <Text style={{ color: T.danger, fontSize: 13, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

const backBtn = (T: Theme) => ({
  width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
  borderWidth: 1, borderColor: T.hairline,
  alignItems: 'center' as const, justifyContent: 'center' as const, alignSelf: 'flex-start' as const,
});
