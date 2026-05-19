import { useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { useEnterAnim } from '../../lib/transitions';
import type { Theme } from '../../types';
import { Icon } from '../Icon';

function SettingRow({ T, icon, label, sub, onPress, right, danger, last }: {
  T: Theme; icon: string; label: string; sub?: string;
  onPress?: () => void; right?: React.ReactNode;
  danger?: boolean; last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !right}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: T.hairline,
        backgroundColor: pressed && onPress ? T.surfaceAlt : 'transparent',
      })}
    >
      <View style={{
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: danger ? 'rgba(200,74,72,0.10)' : T.surfaceAlt,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={18} color={danger ? T.danger : T.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '500', color: danger ? T.danger : T.ink }}>
          {label}
        </Text>
        {sub ? (
          <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>{sub}</Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-right" size={14} color={T.inkMuted} /> : null)}
    </Pressable>
  );
}

function Group({ children, T }: { children: React.ReactNode; T: Theme }) {
  return (
    <View style={{
      backgroundColor: T.surface, borderRadius: 16,
      borderWidth: 1, borderColor: T.hairline, overflow: 'hidden',
    }}>
      {children}
    </View>
  );
}

export function SettingsSheet({ T, onClose }: { T: Theme; onClose: () => void }) {
  const { dark, setDark, signOut } = useApp();
  const anim = useEnterAnim('right');

  const [orderNotifs,    setOrderNotifs]    = useState(true);
  const [bookingNotifs,  setBookingNotifs]  = useState(true);
  const [promoNotifs,    setPromoNotifs]    = useState(false);
  const [passportAuto,   setPassportAuto]   = useState(true);

  const toggle = (val: boolean, setter: (v: boolean) => void) => (
    <Switch
      value={val}
      onValueChange={setter}
      trackColor={{ false: T.surfaceAlt, true: T.brand }}
      thumbColor="#fff"
    />
  );

  const confirmDelete = () =>
    Alert.alert(
      'Delete account?',
      'All your data — pets, bookings, orders and addresses — will be permanently deleted within 90 days. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete my account', style: 'destructive', onPress: () => signOut() },
      ],
    );

  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 90, backgroundColor: T.bg }, anim.sheet]}>

      {/* Header */}
      <View style={{
        paddingTop: 14, paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <Pressable onPress={onClose} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="chevron-left" size={20} color={T.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Profile
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.3, marginTop: 2 }}>
            Settings
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 60, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Appearance */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase', paddingHorizontal: 4 }}>
            Appearance
          </Text>
          <Group T={T}>
            <SettingRow
              T={T} icon="sparkle" label="Dark mode"
              sub="Easier on the eyes at night"
              right={toggle(dark, setDark)}
              last
            />
          </Group>
        </View>

        {/* Notifications */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase', paddingHorizontal: 4 }}>
            Notifications
          </Text>
          <Group T={T}>
            <SettingRow T={T} icon="bag"      label="Order updates"    sub="Confirmation, shipping and delivery" right={toggle(orderNotifs, setOrderNotifs)} />
            <SettingRow T={T} icon="calendar" label="Booking updates"  sub="Confirmations and reminders"         right={toggle(bookingNotifs, setBookingNotifs)} />
            <SettingRow T={T} icon="bell"     label="Offers & deals"   sub="Promotions and new services nearby"  right={toggle(promoNotifs, setPromoNotifs)} last />
          </Group>
        </View>

        {/* Pets & bookings */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase', paddingHorizontal: 4 }}>
            Pets & bookings
          </Text>
          <Group T={T}>
            <SettingRow
              T={T} icon="shield" label="Auto-share pet passport"
              sub="Providers receive your pet's medical info with each booking"
              right={toggle(passportAuto, setPassportAuto)}
              last
            />
          </Group>
        </View>

        {/* Support */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase', paddingHorizontal: 4 }}>
            Support
          </Text>
          <Group T={T}>
            <SettingRow T={T} icon="mail"  label="Contact us"       sub="support@pawra.app"                     onPress={() => {}} />
            <SettingRow T={T} icon="star"  label="Rate the app"     sub="Share your feedback on the App Store"  onPress={() => {}} />
            <SettingRow T={T} icon="send"  label="Report a problem" onPress={() => {}} last />
          </Group>
        </View>

        {/* About */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase', paddingHorizontal: 4 }}>
            About
          </Text>
          <Group T={T}>
            <SettingRow T={T} icon="paw"       label="About Pawra"     sub="Version 1.0.0 · Beirut, Lebanon" />
            <SettingRow T={T} icon="briefcase" label="Terms of service" onPress={() => {}} last />
          </Group>
        </View>

        {/* Account */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase', paddingHorizontal: 4 }}>
            Account
          </Text>
          <Group T={T}>
            <SettingRow
              T={T} icon="power" label="Delete my account"
              sub="Permanently removes all your data within 90 days"
              onPress={confirmDelete}
              danger last
            />
          </Group>
        </View>

      </ScrollView>
    </Animated.View>
  );
}
