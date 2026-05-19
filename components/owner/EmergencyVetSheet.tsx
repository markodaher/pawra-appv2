import { useEffect, useRef, useState } from 'react';
import { Animated, Linking, Pressable, ScrollView, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT } from '../../constants/theme';
import { useEnterAnim } from '../../lib/transitions';
import type { EmergencyVet, Theme } from '../../types';
import { Icon } from '../Icon';

function formatDistance(km: number): string | null {
  if (!km || km <= 0) return null;
  return km < 1 ? `${(km * 1000).toFixed(0)}m` : `${km.toFixed(1)}km`;
}

function digitsOnly(s: string | undefined): string {
  return (s || '').replace(/\D/g, '');
}

const ER_RED = '#D32F1A';
const ER_RED_DARK = '#A82414';
const ER_BG = '#1a0a08';

function PulseRed({ size = 52 }: { size?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);
  const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.65] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute',
      width: size, height: size, borderRadius: size / 2 - 2,
      backgroundColor: ER_RED,
      transform: [{ scale }], opacity,
    }} />
  );
}

export function EmergencyVetSheet({ T: _T, vets, onClose }: { T: Theme; vets: EmergencyVet[]; onClose: () => void }) {
  const [calling, setCalling] = useState<string | null>(null);
  const anim = useEnterAnim('right');
  // The sheet lives inside SafeAreaView whose edges are ['top','bottom']. Its
  // backgroundColor (T.bg = light) bleeds into the safe-area inset strips.
  // We extend this overlay by the inset values so it covers the full screen
  // edge-to-edge and adds the insets back as padding so content still lands
  // in the right place.
  const insets = useSafeAreaInsets();
  return (
    <Animated.View style={[{
      position: 'absolute',
      top: -insets.top,
      bottom: -insets.bottom,
      left: 0,
      right: 0,
      zIndex: 90,
      backgroundColor: ER_BG,
    }, anim.sheet]}>
      <View style={{
        paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 18,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
        flexDirection: 'row', alignItems: 'flex-start', gap: 14,
      }}>
        <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
          <PulseRed size={52} />
          <View style={{
            width: 52, height: 52, borderRadius: 14, backgroundColor: ER_RED,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: ER_RED, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 14, elevation: 8,
          }}>
            <Icon name="plus-medical" size={28} color="#fff" />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#ff6b54', letterSpacing: 1.4, textTransform: 'uppercase' }}>Emergency</Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff', letterSpacing: -0.5, marginTop: 2, lineHeight: 28 }}>24/7 vets near you</Text>
          <Text style={{ fontSize: 13, color: '#c8b8b4', marginTop: 6, lineHeight: 18 }}>
            {vets.length
              ? "Tap a clinic to call. Stay on the line — give them the pet's species, weight, and what happened."
              : 'No clinics listed yet for your area.'}
          </Text>
        </View>
        <Pressable onPress={onClose} style={{
          width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="x" size={16} color="#fff" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 14, gap: 10, flexGrow: 1 }}>
        {vets.length === 0 ? (
          <View style={{
            padding: 28, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
            alignItems: 'center', gap: 10,
          }}>
            <Icon name="phone" size={28} color="#9a8884" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.3 }}>No emergency clinics yet</Text>
            <Text style={{ fontSize: 13, color: '#c8b8b4', textAlign: 'center', lineHeight: 18 }}>
              We're working to verify 24/7 vets in Lebanon. Check back soon.
            </Text>
          </View>
        ) : vets.map(v => {
          const distanceLabel = formatDistance(v.distanceKm);
          const callDigits = digitsOnly(v.phone);
          const waDigits = digitsOnly(v.whatsapp || v.phone);
          const hasCall = callDigits.length > 0;
          const hasWa = waDigits.length > 0;
          const hasMaps = !!v.gmapsLink;

          const onCall = () => {
            if (!hasCall) return;
            setCalling(v.id);
            Vibration.vibrate([60, 30, 60]);
            Linking.openURL(`tel:${callDigits}`).catch(() => {});
            setTimeout(() => setCalling(null), 1800);
          };
          const onWhatsApp = () => {
            if (!hasWa) return;
            // wa.me uses E.164 without the + sign.
            Linking.openURL(`https://wa.me/${waDigits}`).catch(() => {});
          };
          const onMaps = () => {
            if (!hasMaps) return;
            Linking.openURL(v.gmapsLink!).catch(() => {});
          };

          return (
            <View key={v.id} style={{
              padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.3 }}>{v.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                    <Icon name="pin" size={12} color="#c8b8b4" />
                    <Text style={{ fontSize: 12.5, color: '#c8b8b4' }}>
                      {v.area}
                      {distanceLabel ? ` · ${distanceLabel}` : ''}
                    </Text>
                  </View>
                  {v.note ? (
                    <Text style={{ fontSize: 11.5, color: '#9a8884', marginTop: 4 }}>{v.note}</Text>
                  ) : null}
                </View>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
                  backgroundColor: 'rgba(80,200,120,0.15)',
                  borderWidth: 1, borderColor: 'rgba(80,200,120,0.3)',
                }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' }} />
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#86efac', letterSpacing: 0.3 }}>{v.hours}</Text>
                </View>
              </View>

              {/* Primary: Call. Sized big to remain a one-tap target in a stress moment. */}
              <Pressable
                onPress={onCall}
                disabled={!hasCall}
                style={{
                  marginTop: 12, height: 56, borderRadius: 14,
                  backgroundColor: !hasCall ? 'rgba(255,255,255,0.06)' : (calling === v.id ? ER_RED_DARK : ER_RED),
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                  opacity: hasCall ? 1 : 0.5,
                }}
              >
                <Icon name="phone" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontFamily: FONT.sans, fontWeight: '700', fontSize: 15, letterSpacing: 0.2 }}>
                  {calling === v.id ? 'Calling…' : (hasCall ? `Call ${v.phone}` : 'No phone listed')}
                </Text>
              </Pressable>

              {/* Secondary: WhatsApp + Maps. Side by side, half the height. */}
              {(hasWa || hasMaps) ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  {hasWa ? (
                    <Pressable
                      onPress={onWhatsApp}
                      style={{
                        flex: 1, height: 44, borderRadius: 12,
                        backgroundColor: 'rgba(37, 211, 102, 0.18)',
                        borderWidth: 1, borderColor: 'rgba(37, 211, 102, 0.4)',
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      <Icon name="send" size={14} color="#86efac" />
                      <Text style={{ color: '#86efac', fontWeight: '700', fontSize: 13, letterSpacing: 0.2 }}>
                        WhatsApp
                      </Text>
                    </Pressable>
                  ) : null}
                  {hasMaps ? (
                    <Pressable
                      onPress={onMaps}
                      style={{
                        flex: 1, height: 44, borderRadius: 12,
                        backgroundColor: 'rgba(96, 165, 250, 0.16)',
                        borderWidth: 1, borderColor: 'rgba(96, 165, 250, 0.36)',
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      <Icon name="navigation" size={14} color="#93c5fd" />
                      <Text style={{ color: '#93c5fd', fontWeight: '700', fontSize: 13, letterSpacing: 0.2 }}>
                        Directions
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={{
        padding: 20, paddingTop: 12, paddingBottom: Math.max(28, insets.bottom + 12),
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
      }}>
        <Text style={{ fontSize: 11.5, color: '#9a8884', textAlign: 'center', lineHeight: 17 }}>
          Not a substitute for emergency services. If you can drive, head to the nearest clinic.
        </Text>
      </View>
    </Animated.View>
  );
}
