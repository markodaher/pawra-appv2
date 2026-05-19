import { useState } from 'react';
import {
  Animated, Keyboard, Platform, Pressable,
  ScrollView, Text, TextInput, View,
} from 'react-native';
import { FONT } from '../../constants/theme';
import { useEnterAnim } from '../../lib/transitions';
import { DONE_BAR_ID } from '../primitives';
import type { Theme } from '../../types';
import { Icon } from '../Icon';

const BOOKING_QUICK_REASONS = [
  'Fully booked',
  'Schedule conflict',
  'Pet not compatible',
  'Outside service area',
  'Service not offered',
  'Closing early today',
];

const ORDER_QUICK_REASONS = [
  'Out of stock',
  'Cannot deliver to this area',
  'Order too large',
  'Closing early today',
  'Technical issue',
  'Changed business hours',
];

export function DeclineReasonSheet({
  T,
  kind,
  targetName,
  onConfirm,
  onCancel,
}: {
  T: Theme;
  /** 'booking' or 'order' — controls quick-pick options and copy. */
  kind: 'booking' | 'order';
  /** Name to use in the confirmation copy, e.g. the buyer's name or service name. */
  targetName?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const anim = useEnterAnim('bottom');
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState('');

  const quickReasons = kind === 'booking' ? BOOKING_QUICK_REASONS : ORDER_QUICK_REASONS;
  const isBooking = kind === 'booking';

  const effectiveReason = custom.trim() || selected || '';

  const handleConfirm = () => {
    Keyboard.dismiss();
    onConfirm(effectiveReason);
  };

  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 96 }, anim.backdrop]}>
      <Pressable
        onPress={() => { Keyboard.dismiss(); onCancel(); }}
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
      />
      <Animated.View style={[{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: T.bg,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        maxHeight: '88%',
        display: 'flex', flexDirection: 'column',
      }, anim.sheet]}>
        {/* Grabber */}
        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: T.hairline }} />
        </View>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingBottom: 14, gap: 12,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              {isBooking ? 'Decline request' : 'Decline order'}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: T.ink, letterSpacing: -0.4, marginTop: 3 }}>
              Why are you declining?
            </Text>
            {targetName ? (
              <Text style={{ fontSize: 13, color: T.inkSoft, marginTop: 2 }}>
                {targetName}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={onCancel} style={{
            width: 36, height: 36, borderRadius: 18, backgroundColor: T.surfaceAlt,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="x" size={16} color={T.ink} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, gap: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Quick-pick reasons */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {quickReasons.map(r => {
              const sel = selected === r && !custom.trim();
              return (
                <Pressable
                  key={r}
                  onPress={() => {
                    setSelected(sel ? null : r);
                    Keyboard.dismiss();
                  }}
                  style={{
                    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999,
                    backgroundColor: sel ? T.brandSoft : T.surface,
                    borderWidth: 1.5, borderColor: sel ? T.brand : T.hairline,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                  }}
                >
                  {sel ? <Icon name="check" size={12} color={T.brand} strokeWidth={2.5} /> : null}
                  <Text style={{
                    fontSize: 13.5, fontWeight: '600',
                    color: sel ? T.brandInk : T.ink,
                  }}>{r}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Custom message */}
          <View style={{ gap: 6 }}>
            <Text style={{
              fontSize: 12, fontWeight: '700', color: T.inkMuted,
              letterSpacing: 0.4, textTransform: 'uppercase',
            }}>
              Add a message (optional)
            </Text>
            <TextInput
              value={custom}
              onChangeText={v => {
                setCustom(v);
                if (v.trim()) setSelected(null);
              }}
              multiline
              placeholder={`Anything else you'd like ${isBooking ? 'the owner' : 'the buyer'} to know…`}
              placeholderTextColor={T.inkMuted}
              inputAccessoryViewID={Platform.OS === 'ios' ? DONE_BAR_ID : undefined}
              style={{
                minHeight: 90, padding: 14, borderRadius: 16,
                backgroundColor: T.surface, borderWidth: 1, borderColor: custom.trim() ? T.brand : T.hairline,
                fontFamily: FONT.sans, fontSize: 14.5, color: T.ink, textAlignVertical: 'top',
              }}
            />
          </View>

          {/* Reassurance */}
          <View style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 8,
            padding: 12, borderRadius: 14, backgroundColor: T.surfaceAlt,
          }}>
            <Icon name="shield" size={14} color={T.inkSoft} />
            <Text style={{ flex: 1, fontSize: 12, color: T.inkSoft, lineHeight: 17 }}>
              The {isBooking ? 'owner' : 'buyer'} will see your reason. Honest, respectful feedback helps them rebook with the right provider.
            </Text>
          </View>
        </ScrollView>

        {/* Footer — sticky action buttons */}
        <View style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: 16, paddingBottom: 28,
          backgroundColor: T.bg,
          borderTopWidth: 1, borderTopColor: T.hairline,
          flexDirection: 'row', gap: 10,
        }}>
          <Pressable
            onPress={onCancel}
            style={{
              flex: 1, height: 50, borderRadius: 14,
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink }}>Keep</Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            style={{
              flex: 2, height: 50, borderRadius: 14,
              backgroundColor: T.danger,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
              {isBooking ? 'Decline request' : 'Decline order'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
