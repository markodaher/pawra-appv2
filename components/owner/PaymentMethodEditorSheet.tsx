import { useState } from 'react';
import {
  Animated, Keyboard, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, Text, View,
} from 'react-native';
import { useApp } from '../../lib/AppContext';
import { useEnterAnim } from '../../lib/transitions';
import type { PaymentMethod, PaymentMethodKind, Theme } from '../../types';
import { Icon } from '../Icon';
import { Button, Field, Input } from '../primitives';

const KIND_OPTIONS: { id: 'card' | 'whish'; label: string; icon: string; sub: string }[] = [
  { id: 'card',  label: 'Card',         icon: 'card',  sub: 'Visa, Mastercard, Amex' },
  { id: 'whish', label: 'Whish Money',  icon: 'phone', sub: 'Pay from the Whish app' },
];

function detectBrand(num: string): 'visa' | 'mastercard' | 'amex' | undefined {
  const n = num.replace(/\s+/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return undefined;
}

function brandLabel(b?: 'visa' | 'mastercard' | 'amex'): string {
  if (b === 'visa') return 'Visa';
  if (b === 'mastercard') return 'Mastercard';
  if (b === 'amex') return 'Amex';
  return 'Card';
}

function formatCardNumber(input: string): string {
  // Group into 4-digit chunks. Allow up to 19 digits (Amex is 15 but we don't
  // strictly enforce length here — the user will see what they typed).
  return input.replace(/[^\d]/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(input: string): string {
  const d = input.replace(/[^\d]/g, '').slice(0, 4);
  if (d.length < 3) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export function PaymentMethodEditorSheet({ T, edit, onClose }: {
  T: Theme;
  edit: PaymentMethod | null;        // null = adding a new method
  onClose: () => void;
}) {
  const { addPaymentMethod, updatePaymentMethod, removePaymentMethod } = useApp();
  const isEditing = !!edit;
  const initialKind: 'card' | 'whish' =
    edit?.kind === 'whish' ? 'whish' : 'card';
  const [kind, setKind] = useState<'card' | 'whish'>(initialKind);

  // Card fields
  const [cardNumber, setCardNumber] = useState(
    edit?.meta?.cardLast4 ? `•••• •••• •••• ${edit.meta.cardLast4}` : '',
  );
  const [cardExpiry, setCardExpiry] = useState(edit?.meta?.cardExpiry ?? '');
  const [cardCvc, setCardCvc] = useState('');
  const [cardLabel, setCardLabel] = useState(edit?.label ?? '');

  // Whish fields
  const [whishPhone, setWhishPhone] = useState(edit?.meta?.whishPhone ?? '');
  const [whishLabel, setWhishLabel] = useState(edit?.label ?? '');

  const [saving, setSaving] = useState(false);

  const cardLast4 = (() => {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length >= 4) return digits.slice(-4);
    if (edit?.meta?.cardLast4) return edit.meta.cardLast4;
    return '';
  })();
  const detectedBrand = detectBrand(cardNumber) ?? edit?.meta?.cardBrand;

  const cardValid =
    (cardNumber.replace(/\D/g, '').length >= 13 || (isEditing && !!edit?.meta?.cardLast4))
    && /^\d{2}\/\d{2}$/.test(cardExpiry)
    && (isEditing || cardCvc.length >= 3);
  const whishValid = whishPhone.replace(/\D/g, '').length >= 6;
  const valid = kind === 'card' ? cardValid : whishValid;

  const save = async () => {
    if (!valid) return;
    Keyboard.dismiss();
    setSaving(true);
    let payload: Omit<PaymentMethod, 'id'>;
    if (kind === 'card') {
      const last4 = cardLast4 || edit?.meta?.cardLast4 || '';
      const brand = detectedBrand;
      const label = cardLabel.trim() || `${brandLabel(brand)} •••• ${last4 || '0000'}`;
      payload = {
        kind: 'card' as PaymentMethodKind,
        label,
        sub: cardExpiry ? `Expires ${cardExpiry}` : undefined,
        icon: 'card',
        meta: {
          cardLast4: last4,
          cardBrand: brand,
          cardExpiry,
        },
      };
    } else {
      const trimmedPhone = whishPhone.trim();
      const label = whishLabel.trim() || `Whish · ${trimmedPhone}`;
      payload = {
        kind: 'whish' as PaymentMethodKind,
        label,
        sub: 'Pay via Whish app',
        icon: 'phone',
        meta: { whishPhone: trimmedPhone },
      };
    }
    let ok = false;
    if (isEditing && edit) {
      await updatePaymentMethod(edit.id, payload);
      ok = true;
    } else {
      const saved = await addPaymentMethod(payload);
      ok = saved !== null;
    }
    setSaving(false);
    if (ok) onClose();
  };

  const remove = async () => {
    if (!edit) return;
    await removePaymentMethod(edit.id);
    onClose();
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
          {isEditing ? 'Edit payment method' : 'New payment method'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 130 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 16 }}>
          {/* Kind picker — fixed once editing (can't change card → Whish without
              re-entering everything anyway). */}
          {!isEditing ? (
            <Field T={T} label="Type">
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {KIND_OPTIONS.map(o => {
                  const sel = kind === o.id;
                  return (
                    <Pressable key={o.id} onPress={() => setKind(o.id)} style={{
                      flex: 1, padding: 14, borderRadius: 14,
                      backgroundColor: sel ? T.brandSoft : T.surface,
                      borderWidth: 1.5, borderColor: sel ? T.brand : T.hairline,
                      gap: 6,
                    }}>
                      <View style={{
                        width: 36, height: 36, borderRadius: 10,
                        backgroundColor: sel ? T.brand : T.surfaceAlt,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name={o.icon} size={18} color={sel ? '#fff' : T.ink} />
                      </View>
                      <Text style={{
                        fontSize: 14, fontWeight: '700',
                        color: sel ? T.brandInk : T.ink, letterSpacing: -0.2,
                      }}>{o.label}</Text>
                      <Text style={{ fontSize: 11.5, color: T.inkMuted, lineHeight: 15 }}>{o.sub}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>
          ) : null}

          {kind === 'card' ? (
            <>
              <Field T={T} label="Card number">
                <Input
                  T={T}
                  value={cardNumber}
                  onChangeText={(v) => setCardNumber(formatCardNumber(v))}
                  placeholder="1234 5678 9012 3456"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />
              </Field>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field T={T} label="Expires">
                    <Input
                      T={T}
                      value={cardExpiry}
                      onChangeText={(v) => setCardExpiry(formatExpiry(v))}
                      placeholder="MM/YY"
                      keyboardType="number-pad"
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field T={T} label={isEditing ? 'CVC (optional)' : 'CVC'}>
                    <Input
                      T={T}
                      value={cardCvc}
                      onChangeText={setCardCvc}
                      placeholder="123"
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={4}
                    />
                  </Field>
                </View>
              </View>

              <Field T={T} label="Nickname (optional)" hint="Shows up at checkout — defaults to brand + last 4.">
                <Input
                  T={T}
                  value={cardLabel}
                  onChangeText={setCardLabel}
                  placeholder={`${brandLabel(detectedBrand)} •••• ${cardLast4 || '0000'}`}
                  autoCapitalize="words"
                />
              </Field>
            </>
          ) : (
            <>
              <Field T={T} label="Whish phone number" hint="The number on your Whish account.">
                <Input
                  T={T}
                  value={whishPhone}
                  onChangeText={setWhishPhone}
                  placeholder="+961 70 000 000"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
              </Field>

              <Field T={T} label="Nickname (optional)">
                <Input
                  T={T}
                  value={whishLabel}
                  onChangeText={setWhishLabel}
                  placeholder={`Whish · ${whishPhone || 'phone'}`}
                  autoCapitalize="words"
                />
              </Field>
            </>
          )}

          {/* Reassurance — same surface treatment as the booking sheet's
              security note so the aesthetic carries through. */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            padding: 12, borderRadius: 12, backgroundColor: T.surfaceAlt,
          }}>
            <Icon name="shield" size={14} color={T.inkSoft} />
            <Text style={{ flex: 1, fontSize: 12, color: T.inkSoft, lineHeight: 17 }}>
              Only the last 4 digits are stored. Full card numbers and CVC are never saved.
            </Text>
          </View>

          {isEditing ? (
            <Pressable onPress={remove} hitSlop={6} style={{ alignSelf: 'center', marginTop: 6, paddingVertical: 8, paddingHorizontal: 14 }}>
              <Text style={{ color: T.danger, fontSize: 13, fontWeight: '600' }}>Remove this method</Text>
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
          {saving ? 'Saving…' : (isEditing ? 'Save changes' : 'Save method')}
        </Button>
      </View>
    </KeyboardAvoidingView>
    </Animated.View>
  );
}
