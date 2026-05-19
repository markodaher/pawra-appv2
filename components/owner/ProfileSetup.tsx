import { forwardRef, useRef, useState } from 'react';
import {
  Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import type { Theme } from '../../types';
import { Icon } from '../Icon';
import { Button, Field, Input } from '../primitives';
import { draftToPet, EMPTY_PET_DRAFT, isPetDraftValid, PetDraft, PetForm } from './PetForm';

type Mode = 'setup' | 'edit';

export function OwnerProfileSetup({ T, mode = 'setup', onComplete }: {
  T: Theme; mode?: Mode; onComplete: () => void;
}) {
  const { user, updateProfile, addPet } = useApp();
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState(user.name);
  const [dd, setDd] = useState(user.dob ? user.dob.slice(0, 2) : '');
  const [mm, setMm] = useState(user.dob ? user.dob.slice(3, 5) : '');
  const [yyyy, setYyyy] = useState(user.dob ? user.dob.slice(6, 10) : '');
  const [pet, setPet] = useState<PetDraft>(EMPTY_PET_DRAFT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ddRef = useRef<TextInput | null>(null);
  const mmRef = useRef<TextInput | null>(null);
  const yyyyRef = useRef<TextInput | null>(null);

  const dob = `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
  // DOB rules: DD 1-31, MM 1-12, YYYY 1900-2099. Each component validated separately
  // so we can show a precise error message when the user fills in something out of range.
  const ddNum   = Number(dd);
  const mmNum   = Number(mm);
  const yyyyNum = Number(yyyy);
  const ddValid   = dd.length === 2   && ddNum   >= 1    && ddNum   <= 31;
  const mmValid   = mm.length === 2   && mmNum   >= 1    && mmNum   <= 12;
  const yyyyValid = yyyy.length === 4 && yyyyNum >= 1900 && yyyyNum <= 2099;
  const dobValid  = ddValid && mmValid && yyyyValid;
  const dobFullyTyped = dd.length === 2 && mm.length === 2 && yyyy.length === 4;
  const dobError =
    !dobFullyTyped ? '' :
    !ddValid   ? 'Day must be 1–31.' :
    !mmValid   ? 'Month must be 1–12.' :
    !yyyyValid ? 'Year must be 1900–2099.' :
    '';
  const aboutValid = name.trim().length > 0 && dobValid;

  const TOTAL = mode === 'setup' ? 2 : 1;

  const handleAdvance = async () => {
    if (!aboutValid) return;
    Keyboard.dismiss();

    if (mode === 'edit') {
      // Persist immediately on save (no pet step in edit mode).
      setError(null);
      setLoading(true);
      try {
        await updateProfile({ name: name.trim(), dob });
      } catch (e) {
        setLoading(false);
        setError('Could not save your profile.');
        return;
      }
      setLoading(false);
      onComplete();
      return;
    }

    setStep(1);
  };

  const handleFinish = async (skipPet: boolean) => {
    Keyboard.dismiss();
    setError(null);
    setLoading(true);
    try {
      await updateProfile({ name: name.trim(), dob });
      if (!skipPet && isPetDraftValid(pet)) {
        const draft = draftToPet(pet, '');
        const { id: _drop, ...input } = draft;
        await addPet(input);
      }
    } catch {
      setLoading(false);
      setError('Could not save your profile.');
      return;
    }
    setLoading(false);
    onComplete();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ position: 'absolute', inset: 0, backgroundColor: T.bg, zIndex: 92 }}
    >
      {/* Header — back / step counter */}
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {mode === 'edit' || step === 0 ? (
          <Pressable onPress={mode === 'edit' ? onComplete : (step === 0 ? onComplete : () => setStep(0))} style={backBtn(T)}>
            <Icon name={mode === 'edit' ? 'x' : (step === 0 ? 'x' : 'chevron-left')} size={18} color={T.ink} />
          </Pressable>
        ) : (
          <Pressable onPress={() => setStep(0)} style={backBtn(T)}>
            <Icon name="chevron-left" size={18} color={T.ink} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600' }}>
            {mode === 'edit' ? 'Edit profile' : `Set up · ${step + 1}/${TOTAL}`}
          </Text>
        </View>
      </View>

      {mode === 'setup' ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', gap: 4 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= step ? T.brand : T.surfaceAlt }} />
          ))}
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 140, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 ? (
          <>
            <Text style={{ fontSize: 28, fontWeight: '700', color: T.ink, letterSpacing: -0.5, marginBottom: 6 }}>
              {mode === 'edit' ? 'Your profile' : 'Tell us about you'}
            </Text>
            <Text style={{ fontSize: 14.5, color: T.inkSoft, marginBottom: 24, lineHeight: 20 }}>
              Providers will see your name when you book. Your date of birth stays private.
            </Text>

            <View style={{ gap: 16 }}>
              <Field T={T} label="Full name">
                <Input
                  T={T}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Layla Khoury"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => ddRef.current?.focus()}
                />
              </Field>

              <Field T={T} label="Date of birth" hint="DD / MM / YYYY">
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <DobBox T={T} ref={ddRef} value={dd} onChangeText={(v) => {
                    const cleaned = v.replace(/\D/g, '').slice(0, 2);
                    setDd(cleaned);
                    if (cleaned.length === 2) mmRef.current?.focus();
                  }} placeholder="DD" maxLength={2} />
                  <DobBox T={T} ref={mmRef} value={mm} onChangeText={(v) => {
                    const cleaned = v.replace(/\D/g, '').slice(0, 2);
                    setMm(cleaned);
                    if (cleaned.length === 2) yyyyRef.current?.focus();
                  }} placeholder="MM" maxLength={2} />
                  <DobBox T={T} ref={yyyyRef} value={yyyy} onChangeText={(v) => {
                    setYyyy(v.replace(/\D/g, '').slice(0, 4));
                  }} placeholder="YYYY" maxLength={4} flex={1.6} />
                </View>
                {dobError ? (
                  <Text style={{ marginTop: 6, fontSize: 12, color: T.danger, fontWeight: '600' }}>
                    {dobError}
                  </Text>
                ) : null}
              </Field>
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={{ fontSize: 28, fontWeight: '700', color: T.ink, letterSpacing: -0.5, marginBottom: 6 }}>
              Add your first pet
            </Text>
            <Text style={{ fontSize: 14.5, color: T.inkSoft, marginBottom: 24, lineHeight: 20 }}>
              This becomes their digital passport — providers see it when you book.
            </Text>
            <PetForm T={T} value={pet} onChange={(patch) => setPet(p => ({ ...p, ...patch }))} />
          </>
        ) : null}

        {error ? (
          <View style={{
            marginTop: 14, padding: 12, borderRadius: 12,
            backgroundColor: 'rgba(200,74,72,0.10)',
            borderWidth: 1, borderColor: 'rgba(200,74,72,0.25)',
          }}>
            <Text style={{ color: T.danger, fontSize: 13, fontWeight: '600' }}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: 16, paddingTop: 12, paddingBottom: 28,
        backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.hairline,
      }}>
        {step === 0 ? (
          <Button T={T} full size="lg" onPress={handleAdvance} disabled={!aboutValid || loading}>
            {loading ? 'Saving…' : (mode === 'edit' ? 'Save changes' : 'Continue')}
          </Button>
        ) : (
          <View style={{ gap: 8 }}>
            <Button T={T} full size="lg" onPress={() => handleFinish(false)} disabled={!isPetDraftValid(pet) || loading}>
              {loading ? 'Saving…' : 'Save pet & finish'}
            </Button>
            <Pressable onPress={() => !loading && handleFinish(true)} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: T.inkMuted, fontSize: 13, fontWeight: '600' }}>Skip for now</Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

type DobBoxProps = {
  T: Theme;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  maxLength: number;
  flex?: number;
};

const DobBox = forwardRef<TextInput, DobBoxProps>(function DobBox(
  { T, value, onChangeText, placeholder, maxLength, flex },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={T.inkMuted}
      keyboardType="number-pad"
      maxLength={maxLength}
      style={{
        flex: flex ?? 1,
        height: 56, paddingHorizontal: 12, borderRadius: 14,
        backgroundColor: T.surface, borderWidth: 1.5,
        borderColor: value.length === maxLength ? T.brand : T.hairline,
        textAlign: 'center',
        fontFamily: FONT.sans, fontSize: 22, fontWeight: '700',
        color: T.ink, letterSpacing: 1,
      }}
    />
  );
});

const backBtn = (T: Theme) => ({
  width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
  borderWidth: 1, borderColor: T.hairline,
  alignItems: 'center' as const, justifyContent: 'center' as const,
});
