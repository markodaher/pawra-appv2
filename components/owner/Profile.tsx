import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import type { Theme } from '../../types';
import { Icon } from '../Icon';
import { Avatar, Button, SectionHeader } from '../primitives';
import { PrivacySheet } from './PrivacySheet';
import { SettingsSheet } from './SettingsSheet';

export function OwnerProfile({ T }: { T: Theme }) {
  const {
    user, pets, signOut,
    setOwnerProfileSetupOpen,
    setPetSheetOpen, setPetSheetEdit,
    setLocationOpen, setPaymentMethodsOpen, setNotifCenterOpen, setLostPetOpen, setReferralOpen,
  } = useApp();
  const [privacyOpen,  setPrivacyOpen]  = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const displayName = user.name || user.email || '—';

  const openAddPet = () => {
    setPetSheetEdit(null);
    setPetSheetOpen(true);
  };
  const openEditPet = (id: string) => {
    const target = pets.find(p => p.id === id) || null;
    setPetSheetEdit(target);
    setPetSheetOpen(true);
  };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 14, paddingBottom: 130 }}>
      <Text style={{ fontSize: 32, fontWeight: '700', color: T.ink, letterSpacing: -0.6 }}>Profile</Text>

      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16,
        padding: 16, borderRadius: 20, backgroundColor: T.surface,
        borderWidth: 1, borderColor: T.hairline,
      }}>
        <Avatar name={displayName} size={56} T={T} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
            {user.name || 'Set your name'}
          </Text>
          <Text style={{ fontSize: 13, color: T.inkMuted, marginTop: 2 }}>
            {user.email || 'No email yet'}
          </Text>
          {user.dob ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Icon name="calendar" size={11} color={T.inkMuted} />
              <Text style={{ fontSize: 11.5, color: T.inkMuted }}>{user.dob}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <Button T={T} variant="ghost" full icon="edit" onPress={() => setOwnerProfileSetupOpen(true)}>
          Edit profile
        </Button>
      </View>


      <SectionHeader title="My pets" T={T} action={{ label: '+ Add', onPress: openAddPet }} />
      {pets.length === 0 ? (
        <View style={{
          padding: 18, borderRadius: 16, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline, borderStyle: 'dashed',
          alignItems: 'center', gap: 8,
        }}>
          <Icon name="paw" size={26} color={T.inkMuted} />
          <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center' }}>
            No pets yet. Add one to start booking services.
          </Text>
          <View style={{ marginTop: 8 }}>
            <Button T={T} size="sm" icon="plus" onPress={openAddPet}>Add a pet</Button>
          </View>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {pets.map(p => (
            <Pressable key={p.id} onPress={() => openEditPet(p.id)} style={{
              padding: 14, borderRadius: 18,
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={p.name} size={48} type="pet" T={T} imageUrl={p.imageUrl} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>{p.name}</Text>
                    <View style={{
                      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
                      backgroundColor: T.surfaceAlt,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: T.inkSoft, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                        {p.species}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                    {p.breed} · {p.age}y · {p.weight}kg · {p.sex}
                    {p.color ? ` · ${p.color}` : ''}
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color={T.inkMuted} />
              </View>

              {/* Passport row */}
              <View style={{
                marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.hairline,
                flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
                  backgroundColor: T.brandSoft,
                }}>
                  <Icon name="shield" size={11} color={T.brandInk} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: T.brandInk, letterSpacing: 0.2 }}>
                    Passport
                  </Text>
                </View>
                {p.blood ? (
                  <Text style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: '600' }}>
                    {p.species === 'dog' ? p.blood : `${p.blood} blood`}
                  </Text>
                ) : null}
                {p.neutered !== undefined ? (
                  <Text style={{ fontSize: 11.5, color: T.inkMuted }}>
                    · {p.neutered ? 'Neutered' : 'Intact'}
                  </Text>
                ) : null}
              </View>

              {p.notes ? (
                <Text style={{
                  marginTop: 10, fontSize: 12.5, color: T.inkSoft, lineHeight: 17,
                  fontStyle: 'italic',
                }}>
                  "{p.notes}"
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}

      <SectionHeader title="Account" T={T} />
      <View style={{
        backgroundColor: T.surface, borderRadius: 16,
        borderWidth: 1, borderColor: T.hairline, overflow: 'hidden',
      }}>
        {[
          { icon: 'card',     t: 'Payment methods', onPress: () => setPaymentMethodsOpen(true) },
          { icon: 'pin',      t: 'Addresses',       onPress: () => setLocationOpen(true) },
          { icon: 'bell',     t: 'Notifications',   onPress: () => setNotifCenterOpen(true) },
          { icon: 'heart',    t: 'Lost pet alerts', onPress: () => setLostPetOpen(true) },
          { icon: 'send',     t: 'Refer a friend · earn $5', onPress: () => setReferralOpen(true) },
          { icon: 'shield',   t: 'Privacy', onPress: () => setPrivacyOpen(true) },
          { icon: 'settings', t: 'Settings', onPress: () => setSettingsOpen(true) },
        ].map((r, i, arr) => (
            <Pressable
              key={i}
              onPress={r.onPress}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
                borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: T.hairline,
                backgroundColor: pressed ? T.surfaceAlt : 'transparent',
              })}
            >
              <View style={{
                width: 30, height: 30, borderRadius: 8, backgroundColor: T.surfaceAlt,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={r.icon} size={15} color={T.ink} />
              </View>
              <Text style={{ flex: 1, fontSize: 14.5, color: T.ink, fontWeight: '500' }}>{r.t}</Text>
              <Icon name="chevron-right" size={14} color={T.inkMuted} />
            </Pressable>
        ))}
      </View>

      <View style={{ marginTop: 16 }}>
        <Button T={T} variant="ghost" full icon="power" onPress={signOut}>Sign out</Button>
      </View>
    </ScrollView>
    {privacyOpen  ? <PrivacySheet  T={T} onClose={() => setPrivacyOpen(false)}  /> : null}
    {settingsOpen ? <SettingsSheet T={T} onClose={() => setSettingsOpen(false)} /> : null}
    </View>
  );
}
