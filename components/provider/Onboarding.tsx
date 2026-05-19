import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SERVICE_TYPES } from '../../constants/data';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import { defaultWeeklyHours } from '../../lib/hours';
import { pickPhoto } from '../../lib/pickPhoto';
import { uploadProviderPhoto } from '../../lib/storage';
import type { Coords, ServiceCategoryId, Theme, WeeklyHours } from '../../types';
import { Icon } from '../Icon';
import { Button, Field, Input } from '../primitives';
import { IdVerificationSheet } from './IdVerificationSheet';
import { PayoutSetupSheet } from './PayoutSetupSheet';
import { WeeklyHoursEditor } from './WeeklyHoursEditor';

const TOTAL = 5;

function SetupRow({ T, icon, title, sub, done, onPress }: {
  T: Theme; icon: string; title: string; sub: string; done?: boolean; onPress?: () => void;
}) {
  const inner = (
    <View style={{
      flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16,
      backgroundColor: T.surface, borderWidth: 1,
      borderColor: done ? T.brand : T.hairline,
      alignItems: 'center',
      opacity: done ? 0.7 : 1,
    }}>
      <View style={{
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: done ? T.brandSoft : T.surfaceAlt,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={done ? 'check' : icon} size={18} color={done ? T.brand : T.ink} strokeWidth={done ? 2.5 : 1.6} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{title}</Text>
        <Text style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 2, lineHeight: 18 }}>{sub}</Text>
      </View>
      {!done ? <Icon name="chevron-right" size={16} color={T.inkMuted} /> : null}
    </View>
  );
  if (onPress && !done) return <Pressable onPress={onPress}>{inner}</Pressable>;
  return inner;
}

export function ProviderOnboarding({ T, onComplete }: { T: Theme; onComplete: () => void }) {
  const {
    user, selfProvider, providerCategories,
    providerDisplayPic, setProviderDisplayPic,
    saveAndPublishProvider, idVerification, feedbackEnabled,
    payoutSetup, payoutSetupOpen, setPayoutSetupOpen,
  } = useApp();
  const [idVerOpen, setIdVerOpen] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [picError, setPicError] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [services, setServices] = useState<ServiceCategoryId[]>(providerCategories);
  const [biz, setBiz] = useState(selfProvider?.name ?? '');
  const [area, setArea] = useState(selfProvider?.area ?? '');
  const [bio, setBio] = useState(selfProvider?.bio ?? '');
  const [hours, setHours] = useState<WeeklyHours>(selfProvider?.weeklyHours ?? defaultWeeklyHours());
  const [coords, setCoords] = useState<Coords | null>(selfProvider?.coords ?? null);
  const [gmapsLink, setGmapsLink] = useState(selfProvider?.gmapsLink ?? '');
  // Optional field: empty is OK, but if filled it must resolve to a real Google Maps URL.
  const gmapsLinkValid = isValidGoogleMapsUrl(gmapsLink);
  const [whatsapp, setWhatsapp] = useState(selfProvider?.whatsapp ?? '');
  const [emergency, setEmergency] = useState<boolean>(selfProvider?.emergency ?? false);
  const [pinning, setPinning] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleService = (id: ServiceCategoryId) =>
    setServices(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const pickImage = async () => {
    setPicError(null);
    const asset = await pickPhoto({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!asset) return;
    if (!user.id) { setPicError('Sign in first.'); return; }
    setUploadingPic(true);
    const url = await uploadProviderPhoto(asset.uri, user.id);
    setUploadingPic(false);
    if (!url) { setPicError('Upload failed. Try again.'); return; }
    setProviderDisplayPic(url);
  };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveAndPublishProvider({
        name: biz.trim(),
        area: area.trim(),
        bio: bio.trim() || undefined,
        displayPic: providerDisplayPic,
        categories: services,
        weeklyHours: hours,
        coords,
        gmapsLink: gmapsLink.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        // Only set emergency when this provider actually offers vet — for any
        // other category it's meaningless and would clutter the emergency tab.
        emergency: services.includes('vet') ? emergency : false,
      });
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const captureLocation = async () => {
    setPinError(null);
    setPinning(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setPinError('Allow location access in Settings to pin your shop.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const next: Coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(next);
      // Best-effort area auto-fill if the provider hasn't typed one yet.
      if (!area.trim()) {
        try {
          const places = await Location.reverseGeocodeAsync({ latitude: next.lat, longitude: next.lng });
          const first = places[0];
          if (first) {
            const guess = [first.district, first.city].filter(Boolean).join(', ') || first.region || '';
            if (guess) setArea(guess);
          }
        } catch { /* reverse geocode is optional */ }
      }
    } catch {
      setPinError("Couldn't read GPS. Try again.");
    } finally {
      setPinning(false);
    }
  };

  return (
    <View style={{ position: 'absolute', inset: 0, backgroundColor: T.bg, zIndex: 90 }}>
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={step === 0 ? onComplete : () => setStep(s => s - 1)} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={step === 0 ? 'x' : 'chevron-left'} size={18} color={T.ink} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 12, color: T.inkMuted, fontWeight: '600' }}>Set up · {step + 1}/{TOTAL}</Text>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= step ? T.accent : T.surfaceAlt }} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 12, paddingBottom: 12, flexGrow: 1 }}>
        {step === 0 ? (
          <>
            <Text style={{ fontSize: 26, fontWeight: '700', color: T.ink, letterSpacing: -0.5, marginVertical: 8, marginBottom: 6 }}>
              What services do you offer?
            </Text>
            <Text style={{ fontSize: 14, color: T.inkSoft, marginBottom: 20 }}>Select all that apply. You can fine-tune prices later.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {SERVICE_TYPES.map(s => {
                const sel = services.includes(s.id);
                return (
                  <Pressable key={s.id} onPress={() => toggleService(s.id)} style={{
                    width: '48%', padding: 18, borderRadius: 18,
                    backgroundColor: sel ? T.brandSoft : T.surface,
                    borderWidth: 1.5, borderColor: sel ? T.brand : T.hairline,
                    minHeight: 110, gap: 10,
                  }}>
                    <View style={{
                      width: 40, height: 40, borderRadius: 12, backgroundColor: T.brand,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={s.icon} size={20} color="#fff" />
                    </View>
                    <Text style={{ fontWeight: '700', color: T.ink, fontSize: 15 }}>{s.label}</Text>
                    <View style={{
                      position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: 11,
                      backgroundColor: sel ? T.brand : 'transparent',
                      borderWidth: 1.5, borderColor: sel ? T.brand : T.hairline,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {sel ? <Icon name="check" size={13} color="#fff" strokeWidth={2.6} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {services.length > 0 ? (
              <View style={{
                marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: T.bgRaised,
                borderWidth: 1, borderColor: T.hairline,
              }}>
                <Text style={{ fontSize: 12.5, color: T.inkSoft }}>
                  {services.length} selected. You'll set up specific offerings & prices for each on the Services screen.
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={{ fontSize: 26, fontWeight: '700', color: T.ink, letterSpacing: -0.5, marginVertical: 8, marginBottom: 6 }}>
              Add a display picture
            </Text>
            <Text style={{ fontSize: 14, color: T.inkSoft, marginBottom: 20 }}>
              This is what owners see when browsing or booking. A clear, friendly photo builds trust.
            </Text>
            <View style={{ alignItems: 'center', gap: 16, marginTop: 20 }}>
              <Pressable onPress={uploadingPic ? undefined : pickImage} style={{
                width: 168, height: 168, borderRadius: 84,
                backgroundColor: T.surface, overflow: 'hidden',
                borderWidth: 2, borderColor: providerDisplayPic ? 'transparent' : T.hairline, borderStyle: 'dashed',
                alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {providerDisplayPic ? (
                  <Image source={{ uri: providerDisplayPic }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <>
                    <Icon name="camera" size={28} color={T.inkMuted} />
                    <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600' }}>Tap to upload</Text>
                  </>
                )}
                {uploadingPic ? (
                  <View style={{
                    position: 'absolute', inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : null}
              </Pressable>
              <Button T={T} variant="ghost" onPress={pickImage} icon="camera" disabled={uploadingPic}>
                {uploadingPic ? 'Uploading…' : (providerDisplayPic ? 'Replace photo' : 'Choose photo')}
              </Button>
              {providerDisplayPic && !uploadingPic ? (
                <Pressable onPress={() => setProviderDisplayPic(null)}>
                  <Text style={{ color: T.inkMuted, fontSize: 13, fontWeight: '600' }}>Remove</Text>
                </Pressable>
              ) : null}
              {picError ? (
                <Text style={{ color: T.danger, fontSize: 13, fontWeight: '600' }}>{picError}</Text>
              ) : null}
              <Text style={{ fontSize: 12.5, color: T.inkMuted, textAlign: 'center', maxWidth: 260, lineHeight: 19 }}>
                Use a square headshot or a recognizable storefront. Min 400×400px.
              </Text>
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={{ fontSize: 26, fontWeight: '700', color: T.ink, letterSpacing: -0.5, marginVertical: 8, marginBottom: 6 }}>Your business</Text>
            <Text style={{ fontSize: 14, color: T.inkSoft, marginBottom: 20 }}>This is how owners will find you.</Text>
            <View style={{ gap: 16 }}>
              <Field T={T} label="Business name">
                <Input T={T} value={biz} onChangeText={setBiz} placeholder="e.g. Beirut Paws" />
              </Field>
              <Field T={T} label="Area">
                <Input T={T} value={area} onChangeText={setArea} placeholder="e.g. Achrafieh, Beirut" />
              </Field>
              <Field T={T} label="Bio" hint="A short intro for owners">
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  inputAccessoryViewID={Platform.OS === 'ios' ? 'pawra-done-bar' : undefined}
                  placeholder="What makes your service trustworthy? Years of experience? Speciality?"
                  placeholderTextColor={T.inkMuted}
                  style={{
                    minHeight: 100, padding: 14, borderRadius: 14,
                    backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                    fontFamily: FONT.sans, fontSize: 15, color: T.ink, textAlignVertical: 'top',
                  }}
                />
              </Field>
              <Field
                T={T}
                label="Opening hours"
                hint="Owners can only book or order while you're open. Outside hours, the app prompts them to pre-order or pick the next free slot."
              >
                <WeeklyHoursEditor T={T} value={hours} onChange={setHours} />
              </Field>

              <Field
                T={T}
                label="Location"
                hint="Pin your shop so owners see how far you are. The app sorts by closest first."
              >
                {coords ? (
                  <View style={{
                    padding: 14, borderRadius: 16,
                    backgroundColor: T.brandSoft, borderWidth: 1, borderColor: T.brand,
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                  }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: 12, backgroundColor: T.brand,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="pin" size={16} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.brandInk, letterSpacing: -0.2 }}>
                        Pinned to your shop
                      </Text>
                      <Text style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 2, fontFamily: FONT.mono }}>
                        {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable onPress={captureLocation} disabled={pinning} hitSlop={6} style={{
                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
                        backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                      }}>
                        <Text style={{ color: T.ink, fontSize: 12, fontWeight: '700' }}>
                          {pinning ? '…' : 'Update'}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => setCoords(null)} hitSlop={6} style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name="x" size={12} color={T.ink} />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={pinning ? undefined : captureLocation} style={{
                    borderRadius: 16, borderWidth: 2, borderColor: T.hairline, borderStyle: 'dashed',
                    backgroundColor: T.surface,
                    paddingVertical: 22, paddingHorizontal: 16,
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                  }}>
                    <View style={{
                      width: 40, height: 40, borderRadius: 12, backgroundColor: T.brandSoft,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {pinning
                        ? <ActivityIndicator color={T.brand} />
                        : <Icon name="navigation" size={18} color={T.brand} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
                        {pinning ? 'Reading GPS…' : 'Set GPS location'}
                      </Text>
                      <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2, lineHeight: 17 }}>
                        Tap from your shop to drop a pin. We use it to compute distance for owners.
                      </Text>
                    </View>
                  </Pressable>
                )}
                {pinError ? (
                  <Text style={{ color: T.danger, fontSize: 12, fontWeight: '600', marginTop: 6 }}>
                    {pinError}
                  </Text>
                ) : null}
              </Field>

              <Field T={T} label="Google Maps link (optional)" hint="Owners can tap to open your shop in Google Maps.">
                <Input
                  T={T} value={gmapsLink} onChangeText={setGmapsLink}
                  placeholder="https://maps.google.com/?q=…"
                  autoCapitalize="none"
                  keyboardType="url"
                />
                {!gmapsLinkValid ? (
                  <Text style={{ marginTop: 6, fontSize: 12, color: T.danger, fontWeight: '600' }}>
                    Must be a real Google Maps link (maps.google.com, google.com/maps, or maps.app.goo.gl).
                  </Text>
                ) : null}
              </Field>
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={{ fontSize: 26, fontWeight: '700', color: T.ink, letterSpacing: -0.5, marginVertical: 8, marginBottom: 6 }}>Almost ready</Text>
            <Text style={{ fontSize: 14, color: T.inkSoft, marginBottom: 20 }}>Two more checkboxes and you're live.</Text>

            <Field T={T} label="WhatsApp number" hint="Owners reach you here when they tap the WhatsApp button on your profile.">
              <Input
                T={T} value={whatsapp} onChangeText={setWhatsapp}
                placeholder="+961 70 000 000"
                keyboardType="phone-pad"
              />
            </Field>

            <View style={{ gap: 10, marginTop: 18 }}>
              <SetupRow
                T={T} icon="shield" title="Verify your ID"
                sub="Take a photo of your Lebanese ID or driver's licence. Owners trust verified providers more."
                done={idVerification?.status === 'approved'}
                onPress={() => setIdVerOpen(true)}
              />
              <SetupRow
                T={T} icon="card" title="Get paid"
                sub="Learn how you receive payments from clients on Pawra."
                done={payoutSetup}
                onPress={() => setPayoutSetupOpen(true)}
              />
              <SetupRow
                T={T} icon="bell" title="Booking alerts"
                sub="Sound + haptic so you never miss a new request."
                done={feedbackEnabled}
              />
            </View>

            <IdVerificationSheet visible={idVerOpen} T={T} onClose={() => setIdVerOpen(false)} />
            <PayoutSetupSheet visible={payoutSetupOpen} T={T} onClose={() => setPayoutSetupOpen(false)} />
          </>
        ) : null}

        {step === 4 ? (
          <>
            <View style={{
              alignSelf: 'flex-start',
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
              backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5',
              marginVertical: 8,
            }}>
              <Icon name="plus-medical" size={11} color="#b91c1c" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#b91c1c', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                Emergency vets only
              </Text>
            </View>
            <Text style={{ fontSize: 26, fontWeight: '700', color: T.ink, letterSpacing: -0.5, marginBottom: 6 }}>
              24/7 emergency line
            </Text>
            <Text style={{ fontSize: 14, color: T.inkSoft, marginBottom: 20, lineHeight: 20 }}>
              Pet owners in distress will see your clinic in the red emergency tab and reach you with one tap — call, WhatsApp, or directions.
            </Text>

            {services.includes('vet') ? (
              <>
                {/* Big disclaimer — kept obvious so nobody opts in lightly. */}
                <View style={{
                  padding: 16, borderRadius: 18,
                  backgroundColor: '#fff7ed', borderWidth: 1.5, borderColor: '#fdba74',
                  gap: 12,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 10,
                      backgroundColor: '#fdba74',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="shield" size={16} color="#7c2d12" />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#7c2d12', letterSpacing: -0.2 }}>
                      Read this before opting in
                    </Text>
                  </View>
                  <DisclaimerRow T={T} title="You must be a licensed vet"
                    body="A current Lebanese veterinary license is required. Misrepresenting credentials is grounds for immediate removal." />
                  <DisclaimerRow T={T} title="The Pawra team will review your listing"
                    body="A human reviews every emergency listing before it goes live. We may ask for license documents and references." />
                  <DisclaimerRow T={T} title="Calls come at every hour"
                    body="Late nights, weekends, holidays. By opting in you agree to keep your phone on and respond, even at 3 a.m." />
                  <DisclaimerRow T={T} title="Owners will be panicked"
                    body="Stay calm and clear: ask for the pet's species, weight, what happened, and how soon they can travel." />
                  <DisclaimerRow T={T} title="Repeated no-answers will get you delisted"
                    body="Owners depend on this in life-or-death moments. If you'll be unavailable for a stretch, turn this toggle off." />
                </View>

                <Pressable
                  onPress={() => setEmergency(v => !v)}
                  style={{
                    marginTop: 18,
                    padding: 14, borderRadius: 16,
                    backgroundColor: emergency ? T.brandSoft : T.surface,
                    borderWidth: 1.5, borderColor: emergency ? T.brand : T.hairline,
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                  }}
                >
                  <View style={{
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: emergency ? T.brand : T.surfaceAlt,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="plus-medical" size={18} color={emergency ? '#fff' : T.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
                      I'm a licensed vet and I accept the above
                    </Text>
                    <Text style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2, lineHeight: 17 }}>
                      Listing goes live after Pawra's review.
                    </Text>
                  </View>
                  <View style={{
                    width: 44, height: 26, borderRadius: 13, padding: 2,
                    backgroundColor: emergency ? T.brand : T.surfaceAlt,
                    borderWidth: 1, borderColor: emergency ? T.brand : T.hairline,
                    justifyContent: 'center',
                  }}>
                    <View style={{
                      width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
                      marginLeft: emergency ? 18 : 0,
                    }} />
                  </View>
                </Pressable>

                <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 12, lineHeight: 17, textAlign: 'center' }}>
                  You can switch this off any time from "Edit business details".
                </Text>
              </>
            ) : (
              <View style={{
                padding: 18, borderRadius: 18,
                backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                alignItems: 'center', gap: 10,
              }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 12, backgroundColor: T.surfaceAlt,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="stethoscope" size={20} color={T.inkMuted} />
                </View>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2, textAlign: 'center' }}>
                  Vets only
                </Text>
                <Text style={{ fontSize: 12.5, color: T.inkMuted, textAlign: 'center', lineHeight: 17 }}>
                  Add the "Vet" service in step 1 to opt into the 24/7 emergency line. You can skip this for now and finish setup.
                </Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      <View style={{
        padding: 16, paddingTop: 12, paddingBottom: 28,
        backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.hairline,
      }}>
        <Button
          T={T} variant="accent" full size="lg"
          onPress={() => step < TOTAL - 1 ? setStep(s => s + 1) : finish()}
          disabled={
            saving ||
            (step === 0 && services.length === 0) ||
            (step === 2 && (!biz.trim() || !area.trim() || !gmapsLinkValid))
          }
        >
          {step < TOTAL - 1 ? 'Continue' : (saving ? 'Saving…' : 'Open my inbox')}
        </Button>
      </View>
    </View>
  );
}

// Accept only real Google Maps URLs — blocks random links being slipped in
// to redirect owners off-platform. Empty is valid (the field is optional).
function isValidGoogleMapsUrl(url: string): boolean {
  const v = url.trim();
  if (!v) return true;
  return /^https?:\/\/((maps\.google\.[a-z.]+)|((www\.)?google\.[a-z.]+\/maps)|(maps\.app\.goo\.gl)|(goo\.gl\/maps))/i.test(v);
}

function DisclaimerRow({ T: _T, title, body }: { T: Theme; title: string; body: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={{
        width: 18, height: 18, borderRadius: 9, marginTop: 2,
        backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#fdba74',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fdba74' }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#7c2d12', letterSpacing: -0.2 }}>{title}</Text>
        <Text style={{ fontSize: 12.5, color: '#9a3412', marginTop: 2, lineHeight: 17 }}>{body}</Text>
      </View>
    </View>
  );
}
