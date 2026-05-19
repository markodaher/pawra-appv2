import { useState } from 'react';
import { Animated, Image, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import { useEnterAnim } from '../../lib/transitions';
import type { Pet, Theme } from '../../types';
import { Icon } from '../Icon';
import { Avatar, Button } from '../primitives';

// ─── Community feed ───────────────────────────────────────────────────────────

export function LostPetSheet({ T, onClose }: { T: Theme; onClose: () => void }) {
  const { lostPetAlerts, user, resolveLostPetAlert, setLostPetReportFor, pets } = useApp();
  const anim = useEnterAnim('right');

  const myAlerts    = lostPetAlerts.filter(a => a.ownerId === user.id);
  const otherAlerts = lostPetAlerts.filter(a => a.ownerId !== user.id);

  const openReport = () => {
    if (pets.length === 0) return;
    // Default to the first pet — user can change inside the report sheet.
    setLostPetReportFor(pets[0]);
  };

  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 88, backgroundColor: T.bg }, anim.sheet]}>
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
          Lost pet alerts
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 16 }}>
        {/* Hero CTA */}
        <View style={{
          padding: 16, borderRadius: 18,
          backgroundColor: T.danger + '12', borderWidth: 1, borderColor: T.danger + '40',
          gap: 10,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
            Lost a pet?
          </Text>
          <Text style={{ fontSize: 13, color: T.inkSoft, lineHeight: 19 }}>
            Post a community alert. Everyone using Pawra in your area will see it instantly —
            other owners, walkers, vets, groomers, boarding houses.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={openReport}
              disabled={pets.length === 0}
              style={{
                flex: 1, height: 44, borderRadius: 12,
                backgroundColor: pets.length > 0 ? T.danger : T.surfaceAlt,
                alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
              }}
            >
              <Icon name="send" size={14} color={pets.length > 0 ? '#fff' : T.inkMuted} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: pets.length > 0 ? '#fff' : T.inkMuted }}>
                {pets.length > 0 ? 'Report missing pet' : 'Add a pet first'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Your active alerts */}
        {myAlerts.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={{
              fontSize: 13, fontWeight: '700', color: T.inkMuted,
              letterSpacing: 0.4, textTransform: 'uppercase',
            }}>
              Your active alerts
            </Text>
            {myAlerts.map(a => (
              <View key={a.id} style={{
                padding: 14, borderRadius: 16,
                backgroundColor: T.surface, borderWidth: 2, borderColor: T.danger,
                gap: 10,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {a.petImageUrl ? (
                    <Image source={{ uri: a.petImageUrl }} style={{ width: 48, height: 48, borderRadius: 14 }} />
                  ) : (
                    <Avatar name={a.petName} size={48} type="pet" T={T} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
                      {a.petName}
                    </Text>
                    <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                      {a.petBreed || a.petSpecies} · last seen {a.lastSeenLabel}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => resolveLostPetAlert(a.id, 'found')}
                    style={{
                      flex: 1, height: 38, borderRadius: 10,
                      backgroundColor: T.success,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Mark as found 🎉</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => resolveLostPetAlert(a.id, 'closed')}
                    style={{
                      flex: 1, height: 38, borderRadius: 10,
                      borderWidth: 1, borderColor: T.hairline,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.inkSoft }}>Close alert</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Community feed */}
        <View style={{ gap: 8 }}>
          <Text style={{
            fontSize: 13, fontWeight: '700', color: T.inkMuted,
            letterSpacing: 0.4, textTransform: 'uppercase',
          }}>
            Community alerts · {otherAlerts.length}
          </Text>
          {otherAlerts.length === 0 ? (
            <View style={{
              padding: 18, borderRadius: 16, borderStyle: 'dashed',
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
              alignItems: 'center', gap: 6,
            }}>
              <Icon name="heart" size={20} color={T.inkMuted} />
              <Text style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center' }}>
                No lost pets right now — let's keep it that way.
              </Text>
            </View>
          ) : (
            otherAlerts.map(a => (
              <View key={a.id} style={{
                padding: 14, borderRadius: 16,
                backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                gap: 10,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {a.petImageUrl ? (
                    <Image source={{ uri: a.petImageUrl }} style={{ width: 52, height: 52, borderRadius: 14 }} />
                  ) : (
                    <Avatar name={a.petName} size={52} type="pet" T={T} />
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{
                        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                        backgroundColor: T.danger,
                      }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.4 }}>
                          MISSING
                        </Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
                        {a.petName}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>
                      {a.petBreed || a.petSpecies} · {a.lastSeenLabel}
                    </Text>
                    <Text style={{ fontSize: 11, color: T.inkMuted, marginTop: 1 }}>
                      Posted by {a.ownerName}
                    </Text>
                  </View>
                </View>
                {a.notes ? (
                  <Text style={{ fontSize: 13, color: T.inkSoft, lineHeight: 18 }}>{a.notes}</Text>
                ) : null}
                {a.ownerPhone ? (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${a.ownerPhone}`).catch(() => {})}
                    style={{
                      height: 40, borderRadius: 10,
                      backgroundColor: T.brand,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <Icon name="phone" size={14} color="#fff" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Call owner</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ─── Report sheet ─────────────────────────────────────────────────────────────

export function LostPetReportSheet({ T, pet, onClose }: { T: Theme; pet: Pet; onClose: () => void }) {
  const { reportLostPet, user, pets, setLostPetReportFor } = useApp();

  const [selectedPet, setSelectedPet] = useState<Pet>(pet);
  const [lastSeen,    setLastSeen]    = useState<string>(user.neighborhood || '');
  const [notes,       setNotes]       = useState<string>('');
  const [phone,       setPhone]       = useState<string>('');
  const [submitting,  setSubmitting]  = useState(false);

  const valid = lastSeen.trim().length > 2;

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      await reportLostPet({
        petId: selectedPet.id,
        petName: selectedPet.name,
        petSpecies: selectedPet.species,
        petBreed: selectedPet.breed || undefined,
        petImageUrl: selectedPet.imageUrl,
        lastSeenLabel: lastSeen.trim(),
        lastSeenCoords: user.coords ?? null,
        ownerPhone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const anim = useEnterAnim('right');

  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 92, backgroundColor: T.bg }, anim.sheet]}>
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
          Report missing pet
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 18 }}>
        <Text style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 19 }}>
          Your alert goes out to every Pawra user in Lebanon. Don't include personal addresses —
          just neighborhood-level info so the community can keep an eye out.
        </Text>

        {/* Pet selector */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.3, textTransform: 'uppercase' }}>
            Which pet?
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {pets.map(p => {
              const sel = selectedPet.id === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => { setSelectedPet(p); setLostPetReportFor(p); }}
                  style={{
                    padding: 10, borderRadius: 12, alignItems: 'center', gap: 6,
                    backgroundColor: sel ? T.brandSoft : T.surface,
                    borderWidth: 1, borderColor: sel ? T.brand : T.hairline,
                    minWidth: 80,
                  }}
                >
                  <Avatar name={p.name} size={44} type="pet" T={T} imageUrl={p.imageUrl} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: sel ? T.brand : T.ink, letterSpacing: -0.2 }}>
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Last seen */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.3, textTransform: 'uppercase' }}>
            Last seen
          </Text>
          <TextInput
            value={lastSeen}
            onChangeText={setLastSeen}
            placeholder="e.g. Achrafieh near Sodeco"
            placeholderTextColor={T.inkMuted}
            style={{
              fontFamily: FONT.sans, fontSize: 15, color: T.ink,
              paddingHorizontal: 14, paddingVertical: 12,
              borderRadius: 12, backgroundColor: T.surfaceAlt,
              borderWidth: 1, borderColor: T.hairline,
            }}
          />
        </View>

        {/* Notes */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.3, textTransform: 'uppercase' }}>
            Details (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Color, collar, distinguishing marks, last seen wearing…"
            placeholderTextColor={T.inkMuted}
            multiline
            style={{
              fontFamily: FONT.sans, fontSize: 14, color: T.ink, lineHeight: 19,
              paddingHorizontal: 14, paddingVertical: 12, minHeight: 90,
              borderRadius: 12, backgroundColor: T.surfaceAlt,
              borderWidth: 1, borderColor: T.hairline, textAlignVertical: 'top',
            }}
          />
        </View>

        {/* Phone */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.3, textTransform: 'uppercase' }}>
            Contact phone (optional)
          </Text>
          <Text style={{ fontSize: 11.5, color: T.inkMuted, marginBottom: 2 }}>
            People who spot your pet can tap a button to call you directly.
          </Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+961 70 000 000"
            placeholderTextColor={T.inkMuted}
            keyboardType="phone-pad"
            style={{
              fontFamily: FONT.sans, fontSize: 15, color: T.ink,
              paddingHorizontal: 14, paddingVertical: 12,
              borderRadius: 12, backgroundColor: T.surfaceAlt,
              borderWidth: 1, borderColor: T.hairline,
            }}
          />
        </View>
      </ScrollView>

      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: 16, paddingTop: 12, paddingBottom: 28,
        backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.hairline,
      }}>
        <Button T={T} full size="lg" onPress={submit} disabled={!valid || submitting}>
          {submitting ? 'Posting…' : 'Post lost-pet alert'}
        </Button>
      </View>
    </Animated.View>
  );
}

