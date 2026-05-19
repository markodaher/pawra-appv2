import * as Location from 'expo-location';
import { useState } from 'react';
import {
  ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import { useEnterAnim } from '../../lib/transitions';
import type { Address, AddressKind, Coords, Theme } from '../../types';
import { Icon } from '../Icon';
import { Button, Field, Input } from '../primitives';

const KIND_OPTIONS: { id: AddressKind; label: string; icon: string }[] = [
  { id: 'home',  label: 'Home',  icon: 'home' },
  { id: 'work',  label: 'Work',  icon: 'briefcase' },
  { id: 'saved', label: 'Other', icon: 'pin' },
];

export function AddressEditorSheet({ T, edit, onClose }: {
  T: Theme;
  edit: Address | null; // null = new
  onClose: () => void;
}) {
  const { addAddress, updateAddress, removeAddress, showNotif } = useApp();
  const [label, setLabel] = useState(edit?.label ?? '');
  const [kind, setKind] = useState<AddressKind>(edit?.kind ?? 'saved');
  const [line1, setLine1] = useState(edit?.line1 ?? '');
  const [area, setArea] = useState(edit?.area ?? '');
  const [floor, setFloor] = useState(edit?.floor ?? '');
  const [notes, setNotes] = useState(edit?.notes ?? '');
  const [coords, setCoords] = useState<Coords | null>(edit?.coords ?? null);
  const [pinning, setPinning] = useState(false);
  const [saving, setSaving] = useState(false);

  const valid = label.trim().length > 0 && line1.trim().length > 0;

  const save = async () => {
    if (!valid) return;
    Keyboard.dismiss();
    setSaving(true);
    const iconByKind = kind === 'home' ? 'home' : kind === 'work' ? 'briefcase' : 'pin';
    const input: Omit<Address, 'id'> = {
      label: label.trim(), kind, icon: iconByKind,
      line1: line1.trim(), area: area.trim(),
      floor: floor.trim() || undefined,
      notes: notes.trim() || undefined,
      coords,
    };
    let ok: boolean;
    if (edit) {
      // updateAddress shows its own error notif and rolls back state on failure;
      // returns void either way, so we re-read state from the next render to know.
      // Treat as success unless context surfaces an error — we keep the sheet open
      // only when the add path explicitly returns null.
      await updateAddress(edit.id, input);
      ok = true;
    } else {
      const saved = await addAddress(input);
      ok = saved !== null;
    }
    setSaving(false);
    // Stay open on failure so the user can retry or copy down the error notif.
    if (ok) onClose();
  };

  const remove = async () => {
    if (!edit) return;
    await removeAddress(edit.id);
    onClose();
  };

  const captureLocation = async () => {
    setPinning(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        showNotif({ title: "Couldn't access location", body: 'Permission denied.', icon: 'x' }, 3000);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const next: Coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(next);
      // Auto-fill area/line1 if blank — best effort.
      try {
        const places = await Location.reverseGeocodeAsync({ latitude: next.lat, longitude: next.lng });
        const first = places[0];
        if (first) {
          if (!line1.trim()) {
            const street = [first.streetNumber, first.street].filter(Boolean).join(' ') || first.name || '';
            if (street) setLine1(street);
          }
          if (!area.trim()) {
            const guess = [first.district, first.city].filter(Boolean).join(', ') || first.region || '';
            if (guess) setArea(guess);
          }
        }
      } catch { /* reverse geocode is optional */ }
    } catch {
      showNotif({ title: "Couldn't read GPS", body: 'Try again.', icon: 'x' }, 3000);
    } finally {
      setPinning(false);
    }
  };

  const anim = useEnterAnim('right');
  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 96 }, anim.sheet]}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: T.bg }}
    >
      <View style={{
        paddingTop: 14, paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <Pressable onPress={onClose} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="x" size={18} color={T.ink} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
          {edit ? 'Edit address' : 'New address'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 16 }}>
          <Field T={T} label="Type">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {KIND_OPTIONS.map(o => {
                const sel = kind === o.id;
                return (
                  <Pressable key={o.id} onPress={() => setKind(o.id)} style={{
                    flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12,
                    backgroundColor: sel ? T.brandSoft : T.surface,
                    borderWidth: 1.5, borderColor: sel ? T.brand : T.hairline,
                    alignItems: 'center', gap: 4,
                  }}>
                    <Icon name={o.icon} size={18} color={sel ? T.brand : T.inkSoft} />
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: sel ? T.brandInk : T.inkSoft }}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field T={T} label="Label">
            <Input T={T} value={label} onChangeText={setLabel} placeholder={kind === 'home' ? 'Home' : kind === 'work' ? 'Work' : "Mom's place"} autoCapitalize="words" />
          </Field>

          <Field T={T} label="Address">
            <Input T={T} value={line1} onChangeText={setLine1} placeholder="Street, building" />
          </Field>

          <Field T={T} label="Area / Neighborhood">
            <Input T={T} value={area} onChangeText={setArea} placeholder="e.g. Mar Mikhael, Beirut" />
          </Field>

          <Field T={T} label="Floor / Apartment (optional)">
            <Input T={T} value={floor} onChangeText={setFloor} placeholder="e.g. Floor 3 · Apt 7" />
          </Field>

          <Field T={T} label="Notes for the provider (optional)" hint="Gate code, doorbell, landmark…">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              inputAccessoryViewID={Platform.OS === 'ios' ? 'pawra-done-bar' : undefined}
              placeholder="Blue door, ring twice"
              placeholderTextColor={T.inkMuted}
              style={{
                minHeight: 80, padding: 14, borderRadius: 14,
                backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                fontFamily: FONT.sans, fontSize: 14.5, color: T.ink, textAlignVertical: 'top',
              }}
            />
          </Field>

          <Field T={T} label="Location pin" hint="Pin lets the app sort shops by distance from you.">
            {coords ? (
              <View style={{
                padding: 14, borderRadius: 16,
                backgroundColor: T.brandSoft, borderWidth: 1, borderColor: T.brand,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 12, backgroundColor: T.brand,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="pin" size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.brandInk, letterSpacing: -0.2 }}>
                    Pinned
                  </Text>
                  <Text style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 2, fontFamily: FONT.mono }}>
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={captureLocation} disabled={pinning} hitSlop={6} style={{
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
                    backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                  }}>
                    <Text style={{ color: T.ink, fontSize: 12, fontWeight: '700' }}>
                      {pinning ? '…' : 'Update'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setCoords(null)} hitSlop={6} style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="x" size={12} color={T.ink} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable onPress={pinning ? undefined : captureLocation} style={{
                borderRadius: 16, borderWidth: 2, borderColor: T.hairline, borderStyle: 'dashed',
                backgroundColor: T.surface,
                paddingVertical: 18, paddingHorizontal: 16,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 12, backgroundColor: T.brandSoft,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {pinning
                    ? <ActivityIndicator color={T.brand} />
                    : <Icon name="navigation" size={18} color={T.brand} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
                    {pinning ? 'Reading GPS…' : 'Pin from current location'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 2, lineHeight: 16 }}>
                    Stand at the address and tap to drop a pin.
                  </Text>
                </View>
              </Pressable>
            )}
          </Field>

          {edit ? (
            <Pressable onPress={remove} hitSlop={6} style={{ alignSelf: 'center', marginTop: 6, paddingVertical: 8, paddingHorizontal: 14 }}>
              <Text style={{ color: T.danger, fontSize: 13, fontWeight: '600' }}>Remove address</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: 16, paddingTop: 12, paddingBottom: 28,
        backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.hairline,
      }}>
        <Button T={T} full size="lg" onPress={save} disabled={!valid || saving}>
          {saving ? 'Saving…' : (edit ? 'Save changes' : 'Save address')}
        </Button>
      </View>
    </KeyboardAvoidingView>
    </Animated.View>
  );
}
