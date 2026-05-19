import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator, Image, Modal, Pressable, ScrollView,
  Text, View,
} from 'react-native';
import { useApp } from '../../lib/AppContext';
import type { Theme } from '../../types';
import { Icon } from '../Icon';
import { Button } from '../primitives';

type PhotoSlot = { uri: string } | null;

function IdSide({
  T, label, hint, photo, onPick,
}: {
  T: Theme; label: string; hint: string; photo: PhotoSlot; onPick: () => void;
}) {
  return (
    <Pressable
      onPress={onPick}
      style={({ pressed }) => ({
        flex: 1, borderRadius: 20, overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: photo ? T.brand : T.hairline,
        borderStyle: photo ? 'solid' : 'dashed',
        backgroundColor: T.surface,
        opacity: pressed ? 0.82 : 1,
      })}
    >
      {photo ? (
        <View>
          <Image source={{ uri: photo.uri }} style={{ width: '100%', aspectRatio: 1.586 }} resizeMode="cover" />
          <View style={{
            position: 'absolute', top: 10, right: 10,
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="check" size={13} color="#fff" strokeWidth={2.5} />
          </View>
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: 10, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.35)',
          }}>
            <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '700' }}>{label}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10.5, marginTop: 1 }}>Tap to change</Text>
          </View>
        </View>
      ) : (
        <View style={{ aspectRatio: 1.586, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <View style={{
            width: 44, height: 44, borderRadius: 22, backgroundColor: T.surfaceAlt,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="camera" size={20} color={T.inkMuted} />
          </View>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{label}</Text>
          <Text style={{ fontSize: 11.5, color: T.inkMuted, textAlign: 'center', paddingHorizontal: 16 }}>{hint}</Text>
        </View>
      )}
    </Pressable>
  );
}

function StatusBanner({ T, status, adminNote }: {
  T: Theme; status: 'pending' | 'approved' | 'rejected'; adminNote?: string;
}) {
  const cfg = {
    pending:  { icon: 'clock',  bg: T.surfaceAlt, fg: T.inkSoft,  label: 'Under review',  body: 'Your ID is being reviewed — usually within 24 hours.' },
    approved: { icon: 'shield', bg: T.brandSoft,  fg: T.brandInk, label: 'Verified',       body: 'Identity confirmed. You now carry the verified badge on your profile.' },
    rejected: { icon: 'x',     bg: '#FEF2F2',    fg: '#DC2626',  label: 'Not accepted',   body: adminNote || 'Please resubmit with clear, well-lit photos of your national ID.' },
  }[status];
  return (
    <View style={{
      flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16,
      backgroundColor: cfg.bg, marginBottom: 20,
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.06)',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={cfg.icon} size={18} color={cfg.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: cfg.fg, letterSpacing: -0.2 }}>{cfg.label}</Text>
        <Text style={{ fontSize: 12.5, color: cfg.fg, opacity: 0.8, marginTop: 3, lineHeight: 17 }}>{cfg.body}</Text>
      </View>
    </View>
  );
}

export function IdVerificationSheet({ visible, T, onClose }: {
  visible: boolean; T: Theme; onClose: () => void;
}) {
  const { idVerification, submitIdVerification } = useApp();
  const [front, setFront] = useState<PhotoSlot>(null);
  const [back, setBack]   = useState<PhotoSlot>(null);
  const [submitting, setSubmitting] = useState(false);

  const isApproved = idVerification?.status === 'approved';
  const isPending  = idVerification?.status === 'pending';
  const isRejected = idVerification?.status === 'rejected';
  const canSubmit  = !!front && !!back && !submitting;

  const pickPhoto = async (side: 'front' | 'back') => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [16, 10], quality: 0.9,
    });
    if (r.canceled || !r.assets[0]) return;
    if (side === 'front') setFront({ uri: r.assets[0].uri });
    else setBack({ uri: r.assets[0].uri });
  };

  const handleSubmit = async () => {
    if (!front || !back) return;
    setSubmitting(true);
    const { error } = await submitIdVerification(front.uri, back.uri);
    setSubmitting(false);
    if (!error) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      {/* Dim backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        onPress={onClose}
      />

      {/* Sheet panel */}
      <View style={{
        backgroundColor: T.bg,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        maxHeight: '92%',
      }}>
        {/* Grabber */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: T.hairline }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <View style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: T.brandSoft,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="shield" size={22} color={T.brandInk} />
            </View>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '700', color: T.ink, letterSpacing: -0.5 }}>Verify your ID</Text>
              <Text style={{ fontSize: 13, color: T.inkMuted, marginTop: 1 }}>National ID · Passport · Driver's licence</Text>
            </View>
          </View>

          {/* Why block — only before first submission */}
          {!idVerification && (
            <View style={{
              padding: 14, borderRadius: 14, backgroundColor: T.surface,
              borderWidth: 1, borderColor: T.hairline, marginTop: 16, marginBottom: 20, gap: 8,
            }}>
              {[
                { icon: 'shield', text: 'Earn the verified badge on your profile' },
                { icon: 'star',   text: 'Build trust with pet owners faster' },
                { icon: 'check',  text: 'Required to unlock certain service categories' },
              ].map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name={r.icon} size={14} color={T.brand} />
                  <Text style={{ fontSize: 13, color: T.inkSoft, flex: 1 }}>{r.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Status banner */}
          {idVerification && (
            <View style={{ marginTop: 16 }}>
              <StatusBanner T={T} status={idVerification.status} adminNote={idVerification.adminNote} />
            </View>
          )}

          {/* Approved: read-only photos */}
          {isApproved && idVerification && (
            <>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Image source={{ uri: idVerification.frontUrl }} style={{ width: '100%', aspectRatio: 1.586, borderRadius: 16 }} resizeMode="cover" />
                  <Text style={{ fontSize: 11, color: T.inkMuted, textAlign: 'center', marginTop: 6, fontWeight: '600' }}>FRONT</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Image source={{ uri: idVerification.backUrl }} style={{ width: '100%', aspectRatio: 1.586, borderRadius: 16 }} resizeMode="cover" />
                  <Text style={{ fontSize: 11, color: T.inkMuted, textAlign: 'center', marginTop: 6, fontWeight: '600' }}>BACK</Text>
                </View>
              </View>
              <View style={{ marginTop: 20 }}>
                <Button T={T} variant="ghost" full onPress={onClose}>Close</Button>
              </View>
            </>
          )}

          {/* Pending: read-only submitted photos */}
          {isPending && idVerification && (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Image source={{ uri: idVerification.frontUrl }} style={{ width: '100%', aspectRatio: 1.586, borderRadius: 16 }} resizeMode="cover" />
                <Text style={{ fontSize: 11, color: T.inkMuted, textAlign: 'center', marginTop: 6, fontWeight: '600' }}>FRONT</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Image source={{ uri: idVerification.backUrl }} style={{ width: '100%', aspectRatio: 1.586, borderRadius: 16 }} resizeMode="cover" />
                <Text style={{ fontSize: 11, color: T.inkMuted, textAlign: 'center', marginTop: 6, fontWeight: '600' }}>BACK</Text>
              </View>
            </View>
          )}

          {/* Upload area — new submission or resubmit after rejection */}
          {(!idVerification || isRejected) && (
            <>
              <View style={{ gap: 10, marginBottom: 20 }}>
                <IdSide T={T} label="Front of ID" hint="Tap to open camera — hold the ID flat"   photo={front} onPick={() => pickPhoto('front')} />
                <IdSide T={T} label="Back of ID"  hint="Tap to open camera — all text in frame" photo={back}  onPick={() => pickPhoto('back')} />
              </View>

              <View style={{
                padding: 14, borderRadius: 14, backgroundColor: T.surface,
                borderWidth: 1, borderColor: T.hairline, marginBottom: 20, gap: 8,
              }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  Tips for a clear scan
                </Text>
                {[
                  'Place the ID on a flat, dark surface',
                  'All four corners must be visible in the camera',
                  'Good lighting — no glare or shadows on the text',
                ].map((t, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: T.brand, marginTop: 5, flexShrink: 0 }} />
                    <Text style={{ fontSize: 12.5, color: T.inkSoft, flex: 1 }}>{t}</Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 24 }}>
                <Icon name="lock" size={13} color={T.inkMuted} />
                <Text style={{ fontSize: 11.5, color: T.inkMuted, flex: 1, lineHeight: 16 }}>
                  Your ID photos are only viewed by Pawra staff for verification and are never shared with pet owners.
                </Text>
              </View>

              <Button T={T} variant="primary" full disabled={!canSubmit} onPress={handleSubmit}>
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : (isRejected ? 'Resubmit ID' : 'Submit for verification')}
              </Button>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
