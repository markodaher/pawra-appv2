import { useState } from 'react';
import { Animated, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import { useEnterAnim } from '../../lib/transitions';
import type { Theme } from '../../types';
import { Icon } from '../Icon';
import { Button } from '../primitives';

export function AutoAcceptSheet({ T, onClose }: { T: Theme; onClose: () => void }) {
  const { selfProvider, updateSelfProvider } = useApp();

  const [enabled,    setEnabled]    = useState<boolean>(!!selfProvider?.autoAcceptEnabled);
  const [maxAmount,  setMaxAmount]  = useState<string>(
    selfProvider?.autoAcceptMaxAmount != null ? String(selfProvider.autoAcceptMaxAmount) : '',
  );
  const [minHours,   setMinHours]   = useState<string>(
    selfProvider?.autoAcceptMinHoursAhead != null ? String(selfProvider.autoAcceptMinHoursAhead) : '',
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const max = maxAmount.trim() ? parseFloat(maxAmount.replace(/[^0-9.]/g, '')) : null;
      const hours = minHours.trim() ? parseInt(minHours.replace(/\D/g, ''), 10) : null;
      await updateSelfProvider({
        autoAcceptEnabled: enabled,
        autoAcceptMaxAmount: enabled && !isNaN(max as number) ? (max as number) : undefined,
        autoAcceptMinHoursAhead: enabled && !isNaN(hours as number) ? (hours as number) : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const anim = useEnterAnim('right');

  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 90, backgroundColor: T.bg }, anim.sheet]}>
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
          Auto-accept rules
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 18 }}>
        <Text style={{ fontSize: 14, color: T.inkSoft, lineHeight: 20 }}>
          Skip the manual accept step for routine bookings. When a request matches your rules, it's
          confirmed instantly — the owner sees an immediate confirmation and you get a notification.
        </Text>

        {/* Master toggle */}
        <Pressable
          onPress={() => setEnabled(e => !e)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 14,
            padding: 16, borderRadius: 16,
            backgroundColor: enabled ? T.brandSoft : T.surface,
            borderWidth: 1, borderColor: enabled ? T.brand : T.hairline,
          }}
        >
          <View style={{
            width: 38, height: 38, borderRadius: 11,
            backgroundColor: enabled ? T.brand : T.surfaceAlt,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="check-circle" size={18} color={enabled ? '#fff' : T.inkMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
              Enable auto-accept
            </Text>
            <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
              {enabled ? 'Active — matching bookings will confirm automatically' : 'Off — you review every booking manually'}
            </Text>
          </View>
          <View style={{
            width: 44, height: 26, borderRadius: 13,
            backgroundColor: enabled ? T.brand : T.surfaceAlt,
            justifyContent: 'center', paddingHorizontal: 2,
          }}>
            <View style={{
              width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
              alignSelf: enabled ? 'flex-end' : 'flex-start',
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
            }} />
          </View>
        </Pressable>

        {/* Rule conditions — only shown when enabled */}
        {enabled ? (
          <View style={{ gap: 14 }}>
            <Text style={{
              fontSize: 13, fontWeight: '700', color: T.inkMuted,
              letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 4,
            }}>
              Conditions
            </Text>

            {/* Max amount */}
            <View style={{
              padding: 14, borderRadius: 14, backgroundColor: T.surface,
              borderWidth: 1, borderColor: T.hairline, gap: 8,
            }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.ink, letterSpacing: -0.1 }}>
                Maximum amount
              </Text>
              <Text style={{ fontSize: 12, color: T.inkMuted, lineHeight: 16 }}>
                Only auto-accept bookings under this total. Leave blank for no limit.
              </Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingHorizontal: 14, height: 44, borderRadius: 10,
                backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.hairline,
              }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: T.inkMuted }}>$</Text>
                <TextInput
                  value={maxAmount}
                  onChangeText={setMaxAmount}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 50"
                  placeholderTextColor={T.inkMuted}
                  style={{ flex: 1, fontFamily: FONT.sans, fontSize: 15, color: T.ink }}
                />
              </View>
            </View>

            {/* Min hours ahead */}
            <View style={{
              padding: 14, borderRadius: 14, backgroundColor: T.surface,
              borderWidth: 1, borderColor: T.hairline, gap: 8,
            }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.ink, letterSpacing: -0.1 }}>
                Minimum lead time
              </Text>
              <Text style={{ fontSize: 12, color: T.inkMuted, lineHeight: 16 }}>
                Only auto-accept if the booking is at least this many hours in the future.
                Stops last-minute requests from auto-confirming.
              </Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingHorizontal: 14, height: 44, borderRadius: 10,
                backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.hairline,
              }}>
                <TextInput
                  value={minHours}
                  onChangeText={setMinHours}
                  keyboardType="number-pad"
                  placeholder="e.g. 24"
                  placeholderTextColor={T.inkMuted}
                  style={{ flex: 1, fontFamily: FONT.sans, fontSize: 15, color: T.ink }}
                />
                <Text style={{ fontSize: 13, color: T.inkMuted, fontWeight: '600' }}>hours</Text>
              </View>
            </View>

            {/* Summary preview */}
            <View style={{
              padding: 12, borderRadius: 12,
              backgroundColor: T.brandSoft, borderLeftWidth: 3, borderLeftColor: T.brand,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: T.brand, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                Preview
              </Text>
              <Text style={{ fontSize: 12.5, color: T.brandInk, marginTop: 4, lineHeight: 17 }}>
                Auto-confirm bookings
                {maxAmount.trim() ? ` under $${parseFloat(maxAmount) || 0}` : ''}
                {minHours.trim() ? ` with at least ${parseInt(minHours, 10) || 0}h lead time` : ''}
                {!maxAmount.trim() && !minHours.trim() ? ' (all bookings — no conditions set)' : ''}.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Save CTA */}
      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: 16, paddingTop: 12, paddingBottom: 28,
        backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.hairline,
      }}>
        <Button T={T} full size="lg" onPress={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save rules'}
        </Button>
      </View>
    </Animated.View>
  );
}
