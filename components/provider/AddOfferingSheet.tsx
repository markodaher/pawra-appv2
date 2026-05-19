import { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SERVICE_TYPES } from '../../constants/data';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import type { ServiceCategoryId, Theme } from '../../types';
import { Icon } from '../Icon';
import { Button, Field, Input } from '../primitives';

const DEFAULT_UNITS: Record<ServiceCategoryId, string> = {
  walk: '/walk', groom: '/groom', vet: '/visit', board: '/night',
  taxi: '/trip', funeral: '/service',
};

export function AddOfferingSheet({ T, cat, onClose }: { T: Theme; cat: ServiceCategoryId; onClose: () => void }) {
  const { addOffering } = useApp();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState(DEFAULT_UNITS[cat]);
  const [desc, setDesc] = useState('');
  const meta = SERVICE_TYPES.find(s => s.id === cat);

  const save = () => {
    const p = parseFloat(price);
    if (!name || !Number.isFinite(p) || p <= 0) return;
    addOffering(cat, name.trim(), p, unit, desc.trim());
    onClose();
  };

  return (
    <Pressable onPress={onClose} style={{ position: 'absolute', inset: 0, zIndex: 80, backgroundColor: 'rgba(0,0,0,0.45)' }}>
      <Pressable onPress={() => {}} style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: T.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 20, paddingBottom: 28,
      }}>
        <View style={{ alignItems: 'center', paddingBottom: 8 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: T.hairline }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 14 }}>
          <View style={{
            width: 36, height: 36, borderRadius: 12, backgroundColor: T.brandSoft,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={meta?.icon || 'tag'} size={18} color={T.brand} />
          </View>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
            New {meta?.label.toLowerCase() || cat} offering
          </Text>
          <Pressable onPress={onClose} style={{
            width: 36, height: 36, borderRadius: 18, backgroundColor: T.surfaceAlt,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="x" size={16} color={T.ink} />
          </Pressable>
        </View>

        <View style={{ gap: 14 }}>
          <Field T={T} label="Name">
            <Input T={T} value={name} onChangeText={setName} placeholder="e.g. 30-min solo walk" />
          </Field>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field T={T} label="Price (USD)">
                <Input T={T} value={price} onChangeText={setPrice} placeholder="0" keyboardType="decimal-pad" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field T={T} label="Unit">
                <Input T={T} value={unit} onChangeText={setUnit} placeholder="/walk" />
              </Field>
            </View>
          </View>
          <Field T={T} label="Description (optional)">
            <TextInput
              value={desc}
              onChangeText={setDesc}
              multiline
              inputAccessoryViewID={Platform.OS === 'ios' ? 'pawra-done-bar' : undefined}
              placeholder="Anything owners should know — duration, location, what's included…"
              placeholderTextColor={T.inkMuted}
              style={{
                minHeight: 80, padding: 14, borderRadius: 14,
                backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                fontFamily: FONT.sans, fontSize: 14.5, color: T.ink, textAlignVertical: 'top',
              }}
            />
          </Field>
        </View>

        <View style={{ marginTop: 18 }}>
          <Button T={T} full size="lg" onPress={save} disabled={!name || !price}>Add offering</Button>
        </View>
      </Pressable>
    </Pressable>
  );
}
