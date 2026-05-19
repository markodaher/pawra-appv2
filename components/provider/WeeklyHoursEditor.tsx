import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { FONT } from '../../constants/theme';
import { DAY_LABEL } from '../../lib/hours';
import type { DayKey, Theme, WeeklyHours } from '../../types';
import { Icon } from '../Icon';

const ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * Per-day open/closed toggle plus from/to time fields. Owners use this in the
 * Inbox/Browse/Shop "open now?" badges; the booking sheet uses it to filter
 * pickable slots; the cart uses it to flip into pre-order mode after hours.
 */
export function WeeklyHoursEditor({ T, value, onChange }: {
  T: Theme;
  value: WeeklyHours;
  onChange: (next: WeeklyHours) => void;
}) {
  const update = (k: DayKey, patch: Partial<WeeklyHours[DayKey]>) =>
    onChange({ ...value, [k]: { ...value[k], ...patch } });

  return (
    <View style={{
      borderRadius: 16, backgroundColor: T.surface,
      borderWidth: 1, borderColor: T.hairline, overflow: 'hidden',
    }}>
      {ORDER.map((k, i) => {
        const day = value[k];
        return (
          <View
            key={k}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              paddingVertical: 12, paddingHorizontal: 14,
              borderTopWidth: i === 0 ? 0 : 1, borderTopColor: T.hairline,
              opacity: day.open ? 1 : 0.6,
            }}
          >
            <Text style={{
              width: 44, fontSize: 13, fontWeight: '700', color: T.ink,
              letterSpacing: 0.3, textTransform: 'uppercase',
            }}>
              {DAY_LABEL[k]}
            </Text>

            <Pressable
              onPress={() => update(k, { open: !day.open })}
              hitSlop={6}
              style={{
                width: 40, height: 22, borderRadius: 12, padding: 2,
                backgroundColor: day.open ? T.brand : T.surfaceAlt,
                borderWidth: 1, borderColor: day.open ? T.brand : T.hairline,
                alignItems: day.open ? 'flex-end' : 'flex-start',
                justifyContent: 'center',
              }}
            >
              <View style={{
                width: 16, height: 16, borderRadius: 8,
                backgroundColor: '#fff',
              }} />
            </Pressable>

            {day.open ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TimeInput T={T} value={day.from} onChange={v => update(k, { from: v })} />
                <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600' }}>–</Text>
                <TimeInput T={T} value={day.to} onChange={v => update(k, { to: v })} />
              </View>
            ) : (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="x" size={12} color={T.inkMuted} />
                <Text style={{ fontSize: 13, color: T.inkMuted, fontWeight: '600' }}>Closed</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function TimeInput({ T, value, onChange }: { T: Theme; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{
      paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
      backgroundColor: T.bg, borderWidth: 1, borderColor: T.hairline,
      minWidth: 72,
    }}>
      <TextInput
        value={value}
        onChangeText={v => onChange(normalizeTimeInput(v))}
        keyboardType="numbers-and-punctuation"
        placeholder="00:00"
        placeholderTextColor={T.inkMuted}
        selectTextOnFocus
        inputAccessoryViewID={Platform.OS === 'ios' ? 'pawra-done-bar' : undefined}
        style={{
          fontFamily: FONT.mono, fontSize: 14, color: T.ink,
          textAlign: 'center', padding: 0, minHeight: 20,
        }}
      />
    </View>
  );
}

// Auto-insert ":" so the user can type "0900" and get "09:00".
function normalizeTimeInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + ':' + digits.slice(2);
}
