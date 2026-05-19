import { useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { useEnterAnim } from '../../lib/transitions';
import type { HealthRecord, Pet, Theme } from '../../types';
import { Icon } from '../Icon';
import { Button } from '../primitives';
import { draftToPet, EMPTY_PET_DRAFT, isPetDraftValid, PetDraft, PetForm, petToDraft } from './PetForm';
import { HealthLogSheet, TYPE_META } from './HealthLogSheet';

export function PetSheet({ T, edit, onClose }: {
  T: Theme; edit: Pet | null; onClose: () => void;
}) {
  const { addPet, updatePet, removePet, healthRecords } = useApp();
  const [draft, setDraft] = useState<PetDraft>(edit ? petToDraft(edit) : EMPTY_PET_DRAFT);
  const [healthEdit, setHealthEdit] = useState<HealthRecord | null | 'new'>(null);

  const petRecords = edit ? healthRecords.filter(r => r.petId === edit.id) : [];

  const save = async () => {
    if (!isPetDraftValid(draft)) return;
    if (edit) {
      await updatePet(edit.id, draftToPet(draft, edit.id));
    } else {
      const { id: _drop, ...input } = draftToPet(draft, '');
      await addPet(input);
    }
    onClose();
  };

  const remove = async () => {
    if (!edit) return;
    await removePet(edit.id);
    onClose();
  };

  const anim = useEnterAnim('right');

  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 80, backgroundColor: T.bg }, anim.sheet]}>
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={onClose} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline, alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="x" size={18} color={T.ink} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
          {edit ? 'Edit pet' : 'Add a pet'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <PetForm T={T} value={draft} onChange={(patch) => setDraft(d => ({ ...d, ...patch }))} />

        {/* Health Log — only shown when editing an existing pet */}
        {edit ? (
          <View style={{ marginTop: 28 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <Text style={{
                fontSize: 13, fontWeight: '700', color: T.inkMuted,
                letterSpacing: 0.4, textTransform: 'uppercase',
              }}>
                Health Log
              </Text>
              <Pressable
                onPress={() => setHealthEdit('new')}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                  backgroundColor: pressed ? T.brandSoft : T.surfaceAlt,
                })}
              >
                <Icon name="plus" size={13} color={T.brand} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: T.brand }}>Add</Text>
              </Pressable>
            </View>

            {petRecords.length === 0 ? (
              <View style={{
                padding: 16, borderRadius: 14,
                backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                borderStyle: 'dashed', alignItems: 'center', gap: 6,
              }}>
                <Icon name="plus-medical" size={18} color={T.inkMuted} />
                <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center' }}>
                  No health records yet.{'\n'}Tap Add to log a vaccination, medication, or vet visit.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {petRecords.map(r => {
                  const meta = TYPE_META[r.type];
                  const c = meta.color(T);
                  const detail =
                    r.type === 'weight'    ? `${r.weightKg} kg` :
                    r.type === 'allergy'   ? (r.severity ?? '') :
                    r.nextDue              ? `Due ${r.nextDue}` :
                    r.date                 ? r.date : '';
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setHealthEdit(r)}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        padding: 12, borderRadius: 14,
                        backgroundColor: pressed ? T.surfaceAlt : T.surface,
                        borderWidth: 1, borderColor: T.hairline,
                      })}
                    >
                      <View style={{
                        width: 34, height: 34, borderRadius: 10,
                        backgroundColor: c + '18',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name={meta.icon} size={15} color={c} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: T.ink }}>{r.title}</Text>
                        {detail ? (
                          <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>{detail}</Text>
                        ) : null}
                      </View>
                      <Icon name="chevron-right" size={14} color={T.inkMuted} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {edit ? (
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <Pressable onPress={remove}>
              <Text style={{ color: T.danger, fontSize: 14, fontWeight: '600' }}>Remove this pet</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: 16, paddingTop: 12, paddingBottom: 28,
        backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.hairline,
      }}>
        <Button T={T} full size="lg" onPress={save} disabled={!isPetDraftValid(draft)}>
          {edit ? 'Save changes' : 'Save pet'}
        </Button>
      </View>

      {/* Health Log sub-sheet — slides over PetSheet */}
      {healthEdit !== null && edit ? (
        <HealthLogSheet
          T={T}
          petId={edit.id}
          editRecord={healthEdit === 'new' ? null : healthEdit}
          onClose={() => setHealthEdit(null)}
        />
      ) : null}
    </Animated.View>
  );
}
