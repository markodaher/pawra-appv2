import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import { useEnterAnim } from '../../lib/transitions';
import type { Address, AddressIcon, Theme } from '../../types';
import { Icon } from '../Icon';

function iconFor(a: Address): AddressIcon {
  return a.icon ?? (a.kind === 'home' ? 'home' : a.kind === 'work' ? 'briefcase' : 'pin');
}

function Row({
  T, icon, title, subtitle, active, onPress, trailing,
}: {
  T: Theme;
  icon: AddressIcon;
  title: string;
  subtitle?: string;
  active?: boolean;
  onPress: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 12, paddingHorizontal: 14, borderRadius: 14,
        backgroundColor: active ? T.brandSoft : (pressed ? T.surfaceAlt : T.surface),
        borderWidth: 1, borderColor: active ? T.brand : T.hairline,
      })}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: active ? T.brand : T.surfaceAlt,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={16} color={active ? '#fff' : T.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={{
            fontSize: 14.5, fontWeight: '700',
            color: active ? T.brandInk : T.ink, letterSpacing: -0.2, flexShrink: 1,
          }}>{title}</Text>
          {active ? (
            <View style={{
              paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.brand,
            }}>
              <Text style={{ fontSize: 9.5, fontWeight: '700', color: T.brand, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                Current
              </Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text numberOfLines={1} style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing ?? <Icon name="chevron-right" size={14} color={T.inkMuted} />}
    </Pressable>
  );
}

export function LocationSheet({ T, onClose }: { T: Theme; onClose: () => void }) {
  const {
    savedAddresses, recentAddresses, currentAddressId,
    setCurrentAddress, setAddressEditorOpen, showNotif,
  } = useApp();
  const [query, setQuery] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  const q = query.trim().toLowerCase();
  const filteredSaved = useMemo(() =>
    !q ? savedAddresses :
    savedAddresses.filter(a => (a.label + ' ' + a.line1 + ' ' + a.area).toLowerCase().includes(q)),
  [q, savedAddresses]);

  const useCurrent = async () => {
    setGpsLoading(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        showNotif({ title: "Couldn't access location", body: 'Permission denied.', icon: 'x' }, 3000);
        return;
      }
      const pos = await Location.getCurrentPositionAsync();
      const places = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
      });
      const place = places[0];
      const line1 = place
        ? [place.streetNumber, place.street].filter(Boolean).join(' ') || place.name || 'Current location'
        : 'Current location';
      const area = place
        ? [place.district, place.city].filter(Boolean).join(', ') || place.region || ''
        : '';
      const adhoc: Address = {
        id: `adhoc_${Date.now()}`,
        label: 'Current location',
        kind: 'searched',
        icon: 'pin',
        line1,
        area,
        coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      };
      setCurrentAddress(adhoc);
      onClose();
      showNotif({ title: 'Using current location', body: area || line1, icon: 'navigation' }, 2400);
    } catch {
      showNotif({ title: "Couldn't read GPS", body: 'Try again or pick a saved place.', icon: 'x' }, 3000);
    } finally {
      setGpsLoading(false);
    }
  };

  const pick = (a: Address) => {
    setCurrentAddress(a);
    Keyboard.dismiss();
    onClose();
    showNotif({ title: 'Location updated', body: a.area || a.line1, icon: 'pin' }, 2200);
  };

  const anim = useEnterAnim('bottom');
  return (
    <Animated.View style={[{
      position: 'absolute', inset: 0, zIndex: 88,
    }, anim.backdrop]}>
      <Pressable onPress={onClose} style={{
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(20,16,12,0.42)',
      }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%' }}
      >
        <Animated.View style={[anim.sheet]}>
        <Pressable onPress={() => { /* swallow */ }} style={{
          backgroundColor: T.bg,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
        }}>
          {/* Grabber */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: T.hairline }} />
          </View>

          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, gap: 12,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 11, fontWeight: '700', color: T.inkMuted,
                letterSpacing: 0.4, textTransform: 'uppercase',
              }}>Service location</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: T.ink, letterSpacing: -0.4, marginTop: 2 }}>
                Where to?
              </Text>
            </View>
            <Pressable onPress={onClose} style={{
              width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface,
              borderWidth: 1, borderColor: T.hairline,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="x" size={16} color={T.ink} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              height: 50, paddingHorizontal: 14, borderRadius: 16,
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
            }}>
              <Icon name="search" size={16} color={T.inkMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search saved places…"
                placeholderTextColor={T.inkMuted}
                autoFocus={false}
                returnKeyType="search"
                style={{ flex: 1, fontFamily: FONT.sans, fontSize: 15, color: T.ink }}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={6} style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: T.surfaceAlt,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="x" size={11} color={T.inkSoft} />
                </Pressable>
              ) : null}
            </View>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36, gap: 18 }}
          >
            {/* Use my current location */}
            <Pressable
              onPress={gpsLoading ? undefined : useCurrent}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 14, borderRadius: 14,
                backgroundColor: pressed ? T.brandSoft : T.surface,
                borderWidth: 1, borderColor: T.hairline,
              })}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 18, backgroundColor: T.brand,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {gpsLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Icon name="navigation" size={16} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.brand, letterSpacing: -0.2 }}>
                  {gpsLoading ? 'Finding you…' : 'Use my current location'}
                </Text>
                <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                  {gpsLoading ? 'Reading GPS' : 'Allow GPS to auto-fill your address'}
                </Text>
              </View>
              <Icon name="chevron-right" size={14} color={T.inkMuted} />
            </Pressable>

            {/* Saved places */}
            <View>
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 6, paddingBottom: 10,
              }}>
                <Text style={{
                  fontSize: 11, fontWeight: '700', color: T.inkMuted,
                  letterSpacing: 0.5, textTransform: 'uppercase',
                }}>Saved places</Text>
                <Pressable
                  onPress={() => { onClose(); setAddressEditorOpen('new'); }}
                  hitSlop={6}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Icon name="plus" size={12} color={T.brand} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: T.brand }}>Add new</Text>
                </Pressable>
              </View>
              {filteredSaved.length === 0 ? (
                q ? (
                  <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center', padding: 16 }}>
                    No saved places match &quot;{query}&quot;.
                  </Text>
                ) : (
                  <View style={{
                    padding: 18, borderRadius: 14,
                    backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                    borderStyle: 'dashed', alignItems: 'center', gap: 8,
                  }}>
                    <Icon name="pin" size={22} color={T.inkMuted} />
                    <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center' }}>
                      No saved places yet. Tap &quot;Add new&quot; to create one.
                    </Text>
                  </View>
                )
              ) : (
                <View style={{ gap: 8 }}>
                  {filteredSaved.map(a => (
                    <Row
                      key={a.id}
                      T={T}
                      icon={iconFor(a)}
                      title={a.label || a.line1}
                      subtitle={[a.line1, a.floor].filter(Boolean).join(' · ')}
                      active={a.id === currentAddressId}
                      onPress={() => pick(a)}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Recent */}
            {!q && recentAddresses.length > 0 ? (
              <View>
                <Text style={{
                  fontSize: 11, fontWeight: '700', color: T.inkMuted,
                  letterSpacing: 0.5, textTransform: 'uppercase',
                  paddingHorizontal: 6, paddingBottom: 10,
                }}>Recent</Text>
                <View style={{ gap: 8 }}>
                  {recentAddresses.map(a => (
                    <Row
                      key={a.id}
                      T={T}
                      icon="clock"
                      title={a.line1}
                      subtitle={a.area}
                      active={a.id === currentAddressId}
                      onPress={() => pick(a)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
