import { useState } from 'react';
import {
  ActivityIndicator, Animated, Image, Keyboard, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import { pickPhoto } from '../../lib/pickPhoto';
import { uploadReviewPhoto } from '../../lib/storage';
import { useEnterAnim } from '../../lib/transitions';
import type { Booking, Theme } from '../../types';
import { Icon } from '../Icon';
import { Avatar, Button, Field } from '../primitives';

export function LeaveReviewSheet({ T, booking, onClose }: {
  T: Theme;
  booking: Booking;
  onClose: () => void;
}) {
  const { user, addReview } = useApp();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelByType: Record<string, string> = {
    walker: 'walk', groomer: 'grooming', vet: 'vet visit', boarder: 'boarding',
  };
  const serviceLabel = labelByType[booking.providerType] || 'service';

  const handlePickPhoto = async () => {
    setError(null);
    const asset = await pickPhoto({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!asset || !user.id) return;
    setUploadingPhoto(true);
    const url = await uploadReviewPhoto(asset.uri, user.id);
    setUploadingPhoto(false);
    if (!url) { setError('Photo upload failed. Try again.'); return; }
    setPhotoUrl(url);
  };

  const submit = async () => {
    if (rating < 1) { setError('Tap a star to rate.'); return; }
    Keyboard.dismiss();
    setError(null);
    setSubmitting(true);
    const res = await addReview({
      providerId: booking.providerId,
      bookingId: booking.id,
      rating,
      text: text.trim(),
      photoUrl: photoUrl ?? undefined,
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  };

  const anim = useEnterAnim('right');
  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 95 }, anim.sheet]}>
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
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: T.inkMuted, fontWeight: '600' }}>Leave a review</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
            {booking.providerName || 'The provider'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        {/* Provider summary card */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          padding: 14, borderRadius: 18,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
        }}>
          <Avatar name={booking.providerName || '?'} size={44} T={T} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>
              {booking.providerName || 'The provider'}
            </Text>
            <Text style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>
              {serviceLabel.charAt(0).toUpperCase() + serviceLabel.slice(1)} for {booking.pet?.name || 'your pet'} · {booking.when}
            </Text>
          </View>
        </View>

        {/* Stars */}
        <Text style={SECT(T)}>How was the {serviceLabel}?</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'center', marginTop: 4 }}>
          {[1, 2, 3, 4, 5].map(n => {
            const filled = rating >= n;
            return (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={8} style={({ pressed }) => ({
                padding: 6,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              })}>
                <Icon name={filled ? 'star' : 'star-line'} size={42} color={filled ? T.warn : T.inkMuted} />
              </Pressable>
            );
          })}
        </View>
        {rating > 0 ? (
          <Text style={{ marginTop: 8, alignSelf: 'center', fontSize: 13, color: T.inkSoft, fontWeight: '600' }}>
            {(['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'])[rating]}
          </Text>
        ) : null}

        {/* Comment */}
        <Field T={T} label="Comment (optional)">
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            placeholder={`Tell other owners about your ${serviceLabel}…`}
            placeholderTextColor={T.inkMuted}
            style={{
              minHeight: 110, padding: 14, borderRadius: 16,
              backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
              fontFamily: FONT.sans, fontSize: 14.5, color: T.ink, textAlignVertical: 'top',
            }}
          />
        </Field>

        {/* Photo */}
        <Text style={SECT(T)}>Photo (optional)</Text>
        {photoUrl ? (
          <View style={{ position: 'relative', borderRadius: 18, overflow: 'hidden' }}>
            <Image source={{ uri: photoUrl }} style={{ width: '100%', aspectRatio: 4 / 3 }} resizeMode="cover" />
            <Pressable onPress={() => setPhotoUrl(null)} style={{
              position: 'absolute', top: 8, right: 8,
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="x" size={16} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={uploadingPhoto ? undefined : handlePickPhoto} style={{
            borderRadius: 18, borderWidth: 2, borderColor: T.hairline, borderStyle: 'dashed',
            backgroundColor: T.surface,
            paddingVertical: 28, paddingHorizontal: 20,
            alignItems: 'center', gap: 8,
          }}>
            {uploadingPhoto ? (
              <ActivityIndicator color={T.brand} />
            ) : (
              <>
                <Icon name="camera" size={26} color={T.inkMuted} />
                <Text style={{ fontSize: 13, color: T.inkSoft, fontWeight: '600' }}>Tap to add a photo</Text>
                <Text style={{ fontSize: 11.5, color: T.inkMuted }}>Helps other owners see what to expect</Text>
              </>
            )}
          </Pressable>
        )}

        {error ? (
          <View style={{
            marginTop: 14, padding: 12, borderRadius: 12,
            backgroundColor: 'rgba(200,74,72,0.10)',
            borderWidth: 1, borderColor: 'rgba(200,74,72,0.25)',
          }}>
            <Text style={{ color: T.danger, fontSize: 13, fontWeight: '600' }}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: 16, paddingTop: 12, paddingBottom: 28,
        backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.hairline,
      }}>
        <Button T={T} full size="lg" onPress={submit} disabled={rating < 1 || submitting || uploadingPhoto}>
          {submitting ? 'Posting…' : 'Post review'}
        </Button>
      </View>
    </KeyboardAvoidingView>
    </Animated.View>
  );
}

const SECT = (T: Theme) => ({
  fontSize: 13, fontWeight: '700' as const, color: T.inkMuted,
  letterSpacing: 0.3, textTransform: 'uppercase' as const,
  marginTop: 24, marginBottom: 10,
});
