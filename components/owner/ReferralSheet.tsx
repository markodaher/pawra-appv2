import { useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { useEnterAnim } from '../../lib/transitions';
import type { Theme } from '../../types';
import { Icon } from '../Icon';

export function ReferralSheet({ T, onClose }: { T: Theme; onClose: () => void }) {
  const { user, redeemPromoCode, showNotif } = useApp();
  const anim = useEnterAnim('right');

  const code = user.referralCode || '—';
  const inviteText = `Try Pawra — Lebanon's pet services super-app. Use my code ${code} when you sign up and we both get $5 credit. 🐾`;

  const [entered, setEntered] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const share = async () => {
    try {
      await Share.share({ message: inviteText });
    } catch { /* user cancelled */ }
  };

  const redeem = async () => {
    const trimmed = entered.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setStatus(null);
    const res = await redeemPromoCode(trimmed);
    setBusy(false);
    if (res.error) {
      setStatus({ kind: 'err', msg: res.error });
      return;
    }
    const pts = res.points ?? 0;
    setStatus({ kind: 'ok', msg: `+${pts} Paw Points added ($${(pts / 100).toFixed(0)} credit).` });
    setEntered('');
    showNotif({ title: 'Promo code redeemed', body: `+${pts} Paw Points`, icon: 'sparkle' }, 4000);
  };

  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 90, backgroundColor: T.bg }, anim.sheet]}>
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
          Refer a friend
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 16 }}>
        {/* Hero */}
        <View style={{
          padding: 20, borderRadius: 22,
          backgroundColor: T.brand, gap: 14, alignItems: 'center',
          shadowColor: T.brand, shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
        }}>
          <Text style={{ fontSize: 36 }}>🐾🤝</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.4, textAlign: 'center' }}>
            Give $5. Get $5.
          </Text>
          <Text style={{ fontSize: 13.5, color: '#fff', opacity: 0.85, lineHeight: 19, textAlign: 'center' }}>
            Got a promo code from a friend or from Pawra? Enter it below to claim $5 in credit (500 Paw Points).
          </Text>
        </View>

        {/* Enter a code */}
        <View style={{
          padding: 18, borderRadius: 16,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 12,
        }}>
          <Text style={{
            fontSize: 11, fontWeight: '700', color: T.inkMuted,
            letterSpacing: 0.4, textTransform: 'uppercase',
          }}>
            Have a code?
          </Text>
          <TextInput
            value={entered}
            onChangeText={(t) => { setEntered(t.toUpperCase()); if (status) setStatus(null); }}
            placeholder="PAWRA-XXXXXXXX"
            placeholderTextColor={T.inkMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy}
            style={{
              height: 50, borderRadius: 12, paddingHorizontal: 14,
              backgroundColor: T.bg, borderWidth: 1, borderColor: T.hairline,
              color: T.ink, fontSize: 15, fontFamily: 'Menlo', letterSpacing: 1.2,
            }}
          />
          <Pressable
            onPress={redeem}
            disabled={busy || entered.trim().length === 0}
            style={({ pressed }) => ({
              height: 50, borderRadius: 14, backgroundColor: T.brand,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10,
              opacity: busy || entered.trim().length === 0 ? 0.5 : pressed ? 0.85 : 1,
            })}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="sparkle" size={16} color="#fff" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                  Redeem code
                </Text>
              </>
            )}
          </Pressable>
          {status && (
            <Text style={{
              fontSize: 12.5, fontWeight: '600',
              color: status.kind === 'ok' ? T.success : T.danger,
              textAlign: 'center', lineHeight: 17,
            }}>
              {status.msg}
            </Text>
          )}
        </View>

        {/* Your code (vanity / share) */}
        <View style={{
          padding: 18, borderRadius: 16,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, gap: 10,
        }}>
          <Text style={{
            fontSize: 11, fontWeight: '700', color: T.inkMuted,
            letterSpacing: 0.4, textTransform: 'uppercase',
          }}>
            Your sharing code
          </Text>
          <View style={{
            paddingVertical: 16, paddingHorizontal: 18, borderRadius: 14,
            backgroundColor: T.brandSoft, borderWidth: 1, borderColor: T.brand + '40',
            alignItems: 'center',
          }}>
            <Text style={{
              fontSize: 22, fontWeight: '700', color: T.brandInk,
              letterSpacing: 2, fontFamily: 'Menlo',
            }}>
              {code}
            </Text>
          </View>
          <Pressable
            onPress={share}
            style={({ pressed }) => ({
              height: 46, borderRadius: 14, backgroundColor: T.ink,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Icon name="send" size={15} color={T.bg} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: T.bg }}>
              Share invite
            </Text>
          </Pressable>
        </View>

        {/* Note */}
        <Text style={{
          fontSize: 11, color: T.inkMuted, textAlign: 'center',
          paddingHorizontal: 20, lineHeight: 16,
        }}>
          Each promo code is good for one use only and can only be redeemed once per account.
        </Text>
      </ScrollView>
    </Animated.View>
  );
}
