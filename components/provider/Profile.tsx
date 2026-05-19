import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SERVICE_TYPES } from '../../constants/data';
import { useApp } from '../../lib/AppContext';
import { pickPhoto } from '../../lib/pickPhoto';
import { uploadProviderPhoto } from '../../lib/storage';
import type { Theme } from '../../types';
import { Icon } from '../Icon';
import { Avatar, Button, SectionHeader } from '../primitives';
import { ProviderAnalytics } from './Analytics';
import { IdVerificationSheet } from './IdVerificationSheet';
import { PayoutSetupSheet } from './PayoutSetupSheet';
import { AutoAcceptSheet } from './AutoAcceptSheet';

function Stat({ T, label, v, delta }: { T: Theme; label: string; v: string; delta?: string }) {
  return (
    <View style={{
      flex: 1, padding: 12, borderRadius: 14, backgroundColor: T.surface,
      borderWidth: 1, borderColor: T.hairline,
    }}>
      <Text style={{ fontSize: 10.5, color: T.inkMuted, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.4, marginTop: 4 }}>{v}</Text>
      {delta ? <Text style={{ fontSize: 10, fontWeight: '600', color: T.success, marginTop: 2 }}>{delta}</Text> : null}
    </View>
  );
}

export function ProviderProfile({ T }: { T: Theme }) {
  const {
    user, selfProvider, providerCategories, providerDisplayPic, setProviderDisplayPic,
    setProviderSetupOpen, signOut,
    updateSelfProvider, idVerification, feedbackEnabled,
    payoutSetup, payoutSetupOpen, setPayoutSetupOpen,
  } = useApp();
  const [idVerOpen, setIdVerOpen] = useState(false);
  const [autoAcceptOpen, setAutoAcceptOpen] = useState(false);

  const setupItems = [
    {
      id: 'id',
      icon: 'shield', title: 'Verify your ID',
      sub: 'Build trust — verified providers get more bookings.',
      done: idVerification?.status === 'approved',
      onPress: () => setIdVerOpen(true),
    },
    {
      id: 'pay',
      icon: 'card', title: 'Get paid',
      sub: 'Set up how you receive payments from clients.',
      done: payoutSetup,
      onPress: () => setPayoutSetupOpen(true),
    },
    {
      id: 'alerts',
      icon: 'bell', title: 'Booking alerts',
      sub: 'Sound + haptic so you never miss a request.',
      done: feedbackEnabled,
      onPress: undefined,
    },
    {
      id: 'autoaccept',
      icon: 'check-circle', title: 'Auto-accept rules',
      sub: selfProvider?.autoAcceptEnabled
        ? 'Active — matching bookings auto-confirm'
        : 'Skip the manual accept step for routine bookings',
      done: false, // never auto-hide — it's a setting, not a one-time task
      onPress: () => setAutoAcceptOpen(true),
    },
  ].filter(i => !i.done);
  const catLabels = providerCategories.map(id => SERVICE_TYPES.find(s => s.id === id)?.label).filter(Boolean) as string[];

  // Stats are derived from the full bookings/orders state — NOT from providerIncoming,
  // which is the inbox memo and drops completed/cancelled rows past a 10-minute
  // response window. Reading from there made counters silently roll back to zero
  // a few minutes after each completion.

  const [uploadingPic, setUploadingPic] = useState(false);

  const pickImage = async () => {
    const asset = await pickPhoto({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!asset || !user.id) return;
    setUploadingPic(true);
    const url = await uploadProviderPhoto(asset.uri, user.id);
    setUploadingPic(false);
    if (!url) return;
    setProviderDisplayPic(url);
    // Persist to DB so owners see it immediately.
    await updateSelfProvider({ displayPic: url });
  };

  const name = selfProvider?.name || 'Set up your business';
  const subtitle = catLabels.length
    ? `${catLabels.join(' · ')}${selfProvider?.area ? ` · ${selfProvider.area}` : ''}`
    : (selfProvider?.area || 'Add services and a location');

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 14, paddingBottom: 130 }}>
      <Text style={{ fontSize: 30, fontWeight: '700', color: T.ink, letterSpacing: -0.6 }}>Profile</Text>

      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16,
        padding: 16, borderRadius: 20, backgroundColor: T.surface,
        borderWidth: 1, borderColor: T.hairline,
      }}>
        <Pressable onPress={uploadingPic ? undefined : pickImage} style={{ position: 'relative' }}>
          {providerDisplayPic ? (
            <Image source={{ uri: providerDisplayPic }} style={{
              width: 64, height: 64, borderRadius: 32,
              borderWidth: 1.5, borderColor: T.hairline,
            }} />
          ) : (
            <Avatar name={selfProvider?.name || '?'} size={64} T={T} />
          )}
          {uploadingPic ? (
            <View style={{
              position: 'absolute', inset: 0, borderRadius: 32,
              backgroundColor: 'rgba(0,0,0,0.4)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
          <View style={{
            position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13,
            backgroundColor: T.ink,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: T.surface,
          }}>
            <Icon name="camera" size={12} color={T.bg} />
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>{name}</Text>
          <Text style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>{subtitle}</Text>
          {selfProvider && selfProvider.reviews > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Icon name="star" size={12} color={T.warn} />
              <Text style={{ fontWeight: '700', color: T.ink, fontSize: 12 }}>
                {selfProvider.rating.toFixed(1)}
              </Text>
              <Text style={{ color: T.inkSoft, fontSize: 12 }}>
                · {selfProvider.reviews} {selfProvider.reviews === 1 ? 'review' : 'reviews'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <Button T={T} variant="ghost" full onPress={() => setProviderSetupOpen(true)}>
          {selfProvider?.name ? 'Edit business details' : 'Set up your business'}
        </Button>
      </View>

      {setupItems.length > 0 && (
        <>
          <SectionHeader title="Finish setting up" T={T} />
          <View style={{ gap: 8 }}>
            {setupItems.map(item => (
              <Pressable
                key={item.id}
                onPress={item.onPress}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, borderRadius: 16,
                  backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View style={{
                  width: 38, height: 38, borderRadius: 11, backgroundColor: T.surfaceAlt,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={item.icon} size={17} color={T.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{item.title}</Text>
                  <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>{item.sub}</Text>
                </View>
                <Icon name="chevron-right" size={14} color={T.inkMuted} />
              </Pressable>
            ))}
          </View>
        </>
      )}

      <SectionHeader title="Analytics" T={T} />
      <ProviderAnalytics T={T} />

      <IdVerificationSheet visible={idVerOpen} T={T} onClose={() => setIdVerOpen(false)} />
      <PayoutSetupSheet visible={payoutSetupOpen} T={T} onClose={() => setPayoutSetupOpen(false)} />
      {autoAcceptOpen ? <AutoAcceptSheet T={T} onClose={() => setAutoAcceptOpen(false)} /> : null}

      <View style={{ marginTop: 16 }}>
        <Button T={T} variant="ghost" full icon="power" onPress={signOut}>Sign out</Button>
      </View>
    </ScrollView>
  );
}
