import { useState } from 'react';
import { Animated, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import { useEnterAnim } from '../../lib/transitions';
import type { HealthRecord, HealthRecordType, Theme } from '../../types';
import { Icon } from '../Icon';
import { Button } from '../primitives';

// ─── Config ───────────────────────────────────────────────────────────────────

type RecordTypeMeta = {
  label: string;
  icon: string;
  color: (T: Theme) => string;
};

const TYPE_META: Record<HealthRecordType, RecordTypeMeta> = {
  vaccination: { label: 'Vaccination',  icon: 'shield',        color: T => T.brand    },
  medication:  { label: 'Medication',   icon: 'plus-medical',  color: T => T.accent   },
  vet_visit:   { label: 'Vet Visit',    icon: 'stethoscope',   color: T => T.success  },
  deworming:   { label: 'Deworming',    icon: 'check-circle',  color: T => T.brand    },
  weight:      { label: 'Weight',       icon: 'tag',           color: T => T.inkSoft  },
  allergy:     { label: 'Allergy',      icon: 'sparkle',       color: T => T.warn     },
};

const ALL_TYPES = Object.keys(TYPE_META) as HealthRecordType[];

// ─── Draft ────────────────────────────────────────────────────────────────────

type Draft = {
  type: HealthRecordType;
  title: string;
  date: string;
  notes: string;
  nextDue: string;
  dosage: string;
  frequency: string;
  weightKg: string;
  severity: '' | 'mild' | 'moderate' | 'severe';
};

function emptyDraft(type: HealthRecordType = 'vaccination'): Draft {
  return { type, title: '', date: '', notes: '', nextDue: '', dosage: '', frequency: '', weightKg: '', severity: '' };
}

function recordToDraft(r: HealthRecord): Draft {
  return {
    type:      r.type,
    title:     r.title,
    date:      r.date      ?? '',
    notes:     r.notes     ?? '',
    nextDue:   r.nextDue   ?? '',
    dosage:    r.dosage    ?? '',
    frequency: r.frequency ?? '',
    weightKg:  r.weightKg  != null ? String(r.weightKg) : '',
    severity:  r.severity  ?? '',
  };
}

function draftToRecord(d: Draft): Omit<HealthRecord, 'id' | 'ownerId' | 'petId' | 'createdAt'> {
  return {
    type:      d.type,
    title:     d.type === 'weight' ? (d.weightKg ? `${d.weightKg} kg` : 'Weight') : d.title.trim(),
    date:      d.date.trim()      || undefined,
    notes:     d.notes.trim()     || undefined,
    nextDue:   d.nextDue.trim()   || undefined,
    dosage:    d.dosage.trim()    || undefined,
    frequency: d.frequency.trim() || undefined,
    weightKg:  d.weightKg ? parseFloat(d.weightKg) : undefined,
    severity:  d.severity || undefined,
  };
}

function isDraftValid(d: Draft): boolean {
  if (d.type === 'weight') return !!d.weightKg && !isNaN(parseFloat(d.weightKg));
  return d.title.trim().length > 0;
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function Field({ label, T, children }: { label: string; T: Theme; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.3, textTransform: 'uppercase' }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function Input({ value, onChange, placeholder, T, multiline, keyboardType }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  T: Theme; multiline?: boolean; keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={T.inkMuted}
      multiline={multiline}
      keyboardType={keyboardType}
      style={{
        fontFamily: FONT.sans, fontSize: 15, color: T.ink,
        paddingHorizontal: 14, paddingVertical: 12,
        borderRadius: 12, backgroundColor: T.surfaceAlt,
        borderWidth: 1, borderColor: T.hairline,
        minHeight: multiline ? 80 : undefined,
        textAlignVertical: multiline ? 'top' : undefined,
      }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HealthLogSheet({ T, petId, editRecord, onClose }: {
  T: Theme;
  petId: string;
  editRecord: HealthRecord | null;
  onClose: () => void;
}) {
  const { addHealthRecord, updateHealthRecord, removeHealthRecord } = useApp();

  const [draft, setDraft]       = useState<Draft>(editRecord ? recordToDraft(editRecord) : emptyDraft());
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState('');

  const set = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }));

  const save = async () => {
    if (!isDraftValid(draft)) return;
    setSaving(true);
    setError('');
    try {
      if (editRecord) {
        await updateHealthRecord(editRecord.id, draftToRecord(draft));
      } else {
        await addHealthRecord(petId, draftToRecord(draft));
      }
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save. Please try again.';
      setError(msg.includes('does not exist')
        ? 'Migration not applied — run 0024_pet_health_records.sql in Supabase first.'
        : msg);
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!editRecord) return;
    setDeleting(true);
    try {
      await removeHealthRecord(editRecord.id);
      onClose();
    } catch {
      setDeleting(false);
    }
  };

  const meta = TYPE_META[draft.type];
  const anim = useEnterAnim('right');

  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 95, backgroundColor: T.bg }, anim.sheet]}>
      {/* Header */}
      <View style={{
        paddingTop: 14, paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <Pressable onPress={onClose} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline, alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="chevron-left" size={20} color={T.ink} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
          {editRecord ? 'Edit record' : 'Add health record'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 120, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type selector */}
        <Field label="Type" T={T}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {ALL_TYPES.map(t => {
              const m   = TYPE_META[t];
              const sel = draft.type === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => set({ type: t })}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: sel ? m.color(T) + '18' : T.surface,
                    borderWidth: 1, borderColor: sel ? m.color(T) : T.hairline,
                  }}
                >
                  <Icon name={m.icon} size={13} color={sel ? m.color(T) : T.inkMuted} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? m.color(T) : T.inkMuted }}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>

        {/* Weight */}
        {draft.type === 'weight' ? (
          <Field label="Weight (kg)" T={T}>
            <Input value={draft.weightKg} onChange={v => set({ weightKg: v })} placeholder="e.g. 12.5" T={T} keyboardType="decimal-pad" />
          </Field>
        ) : (
          <Field label="Name / Title" T={T}>
            <Input
              value={draft.title}
              onChange={v => set({ title: v })}
              placeholder={
                draft.type === 'vaccination' ? 'e.g. Rabies vaccine' :
                draft.type === 'medication'  ? 'e.g. Heartgard' :
                draft.type === 'vet_visit'   ? 'e.g. Annual checkup' :
                draft.type === 'deworming'   ? 'e.g. Milbemax' :
                'e.g. Chicken'
              }
              T={T}
            />
          </Field>
        )}

        {/* Allergy severity */}
        {draft.type === 'allergy' ? (
          <Field label="Severity" T={T}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['mild', 'moderate', 'severe'] as const).map(s => {
                const sel = draft.severity === s;
                const c   = s === 'severe' ? T.danger : s === 'moderate' ? T.warn : T.success;
                return (
                  <Pressable key={s} onPress={() => set({ severity: s })} style={{
                    flex: 1, height: 36, borderRadius: 10,
                    backgroundColor: sel ? c + '18' : T.surface,
                    borderWidth: 1, borderColor: sel ? c : T.hairline,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? c : T.inkMuted }}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
        ) : null}

        {/* Medication fields */}
        {draft.type === 'medication' ? (
          <>
            <Field label="Dosage" T={T}>
              <Input value={draft.dosage} onChange={v => set({ dosage: v })} placeholder="e.g. 1 tablet" T={T} />
            </Field>
            <Field label="Frequency" T={T}>
              <Input value={draft.frequency} onChange={v => set({ frequency: v })} placeholder="e.g. Once daily" T={T} />
            </Field>
          </>
        ) : null}

        {/* Date */}
        {draft.type !== 'allergy' ? (
          <Field label={draft.type === 'medication' ? 'Start date' : 'Date'} T={T}>
            <Input value={draft.date} onChange={v => set({ date: v })} placeholder="DD/MM/YYYY" T={T} />
          </Field>
        ) : null}

        {/* Next due */}
        {(draft.type === 'vaccination' || draft.type === 'deworming' || draft.type === 'medication') ? (
          <Field label={draft.type === 'medication' ? 'End date' : 'Next due'} T={T}>
            <Input value={draft.nextDue} onChange={v => set({ nextDue: v })} placeholder="DD/MM/YYYY" T={T} />
          </Field>
        ) : null}

        {/* Notes */}
        {(draft.type === 'vet_visit' || draft.type === 'allergy' || draft.type === 'medication') ? (
          <Field label="Notes" T={T}>
            <Input value={draft.notes} onChange={v => set({ notes: v })} placeholder="Any additional details…" T={T} multiline />
          </Field>
        ) : null}

        {/* Delete */}
        {editRecord ? (
          <Pressable onPress={del} disabled={deleting} style={{ alignItems: 'center', paddingTop: 8 }}>
            <Text style={{ color: T.danger, fontSize: 14, fontWeight: '600' }}>
              {deleting ? 'Deleting…' : 'Delete this record'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Save CTA */}
      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: 16, paddingTop: 12, paddingBottom: 28,
        backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.hairline,
        gap: 8,
      }}>
        {error ? (
          <Text style={{ fontSize: 13, color: T.danger, fontWeight: '600', textAlign: 'center' }}>
            {error}
          </Text>
        ) : null}
        <Button T={T} full size="lg" onPress={save} disabled={!isDraftValid(draft) || saving}>
          {saving ? 'Saving…' : editRecord ? 'Save changes' : 'Add record'}
        </Button>
      </View>
    </Animated.View>
  );
}

// ─── Exported helpers (used in PetSheet and ActivityDetailSheet) ──────────────
export { TYPE_META };
export type { RecordTypeMeta };
