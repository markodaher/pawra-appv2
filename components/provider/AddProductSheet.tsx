import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { FONT } from '../../constants/theme';
import { SHOP_CATEGORIES } from '../../constants/data';
import { useApp } from '../../lib/AppContext';
import { pickPhoto as pickPhotoUtil } from '../../lib/pickPhoto';
import { uploadProviderPhoto } from '../../lib/storage';
import type { Product, Theme } from '../../types';
import { Icon } from '../Icon';
import { Button, Field, Input } from '../primitives';

export function AddProductSheet({ T, edit, onClose }: {
  T: Theme;
  edit: Product | null;       // null = new listing, Product = edit existing
  onClose: () => void;
}) {
  const { user, publishProduct, updateProduct, unlistProduct, showNotif } = useApp();
  const isEdit = !!edit;
  const [name, setName] = useState(edit?.name ?? '');
  const [subtitle, setSubtitle] = useState(edit?.subtitle ?? '');
  const [description, setDescription] = useState(edit?.description ?? '');
  const [price, setPrice] = useState(edit ? String(edit.price) : '');
  const [cat, setCat] = useState(edit?.cat ?? 'toys');
  const [stock, setStock] = useState(edit ? String(edit.stockCount) : '10');
  const [photoUrl, setPhotoUrl] = useState<string | null>(edit?.imageUrl ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const pickPhoto = async () => {
    const asset = await pickPhotoUtil({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!asset?.uri || !user.id) return;
    setUploadingPhoto(true);
    const url = await uploadProviderPhoto(asset.uri, user.id);
    setUploadingPhoto(false);
    if (!url) {
      showNotif({ title: "Couldn't upload photo", body: 'Try again.', icon: 'x' }, 3000);
      return;
    }
    setPhotoUrl(url);
  };

  const save = async () => {
    const p = parseFloat(price);
    const s = parseInt(stock, 10);
    if (!name || !Number.isFinite(p) || p <= 0) return;
    if (isEdit && edit) {
      await updateProduct(edit.id, {
        name: name.trim(),
        subtitle: subtitle.trim(),
        description: description.trim() || undefined,
        price: p,
        cat,
        stockCount: Number.isFinite(s) ? s : 0,
        imageUrl: photoUrl ?? undefined,
      });
    } else {
      publishProduct({
        name: name.trim(),
        subtitle: subtitle.trim(),
        description: description.trim() || undefined,
        price: p,
        cat,
        stockCount: Number.isFinite(s) ? s : 0,
        imageUrl: photoUrl ?? undefined,
      });
    }
    onClose();
  };

  const onUnlist = async () => {
    if (!edit) return;
    setRemoving(true);
    await unlistProduct(edit.id);
    setRemoving(false);
    onClose();
  };

  return (
    <View style={{ position: 'absolute', inset: 0, zIndex: 80, backgroundColor: T.bg }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={onClose} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="x" size={18} color={T.ink} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: T.ink }}>
          {isEdit ? 'Edit listing' : 'New listing'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 100 }}>
        <View style={{ gap: 16 }}>
          <Field T={T} label="Photo" hint="Shown as the main image owners see in the shop.">
            {photoUrl ? (
              <View style={{ position: 'relative', borderRadius: 18, overflow: 'hidden' }}>
                <Image source={{ uri: photoUrl }} style={{ width: '100%', aspectRatio: 1 }} resizeMode="cover" />
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
              <Pressable onPress={uploadingPhoto ? undefined : pickPhoto} style={{
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
                    <Text style={{ fontSize: 11.5, color: T.inkMuted }}>Square photo — appears on the shop card</Text>
                  </>
                )}
              </Pressable>
            )}
          </Field>

          <Field T={T} label="Name">
            <Input T={T} value={name} onChangeText={setName} placeholder="e.g. Hand-knotted rope toy" />
          </Field>
          <Field T={T} label="Subtitle (optional)" hint="One line — e.g. size or key material">
            <Input T={T} value={subtitle} onChangeText={setSubtitle} placeholder="e.g. Hand-knotted · medium" />
          </Field>
          <Field T={T} label="Description (optional)" hint="Shown to owners on the product detail page">
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="What makes this product great? Ingredients, materials, how to use…"
              placeholderTextColor={T.inkMuted}
              style={{
                minHeight: 88, padding: 14, borderRadius: 14,
                backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
                fontFamily: FONT.sans, fontSize: 14, color: T.ink, textAlignVertical: 'top',
              }}
            />
          </Field>
          <Field T={T} label="Category">
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {SHOP_CATEGORIES.map(c => {
                const active = cat === c.id;
                return (
                  <Pressable key={c.id} onPress={() => setCat(c.id)} style={{
                    height: 34, paddingHorizontal: 14, borderRadius: 17,
                    backgroundColor: active ? T.brand : T.surface,
                    borderWidth: 1, borderColor: active ? T.brand : T.hairline,
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                  }}>
                    <Icon name={c.icon} size={13} color={active ? '#fff' : T.inkSoft} />
                    <Text style={{ color: active ? '#fff' : T.inkSoft, fontWeight: '600', fontSize: 13 }}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field T={T} label="Price (USD)">
                <Input T={T} value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field T={T} label="Stock">
                <Input T={T} value={stock} onChangeText={setStock} keyboardType="number-pad" />
              </Field>
            </View>
          </View>

          {isEdit ? (
            confirmRemove ? (
              <View style={{
                marginTop: 10, padding: 14, borderRadius: 16,
                backgroundColor: 'rgba(200,74,72,0.08)',
                borderWidth: 1, borderColor: 'rgba(200,74,72,0.25)',
                gap: 10,
              }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.danger, letterSpacing: -0.2 }}>
                  Unlist this product?
                </Text>
                <Text style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 17 }}>
                  Owners will no longer see it in the shop. This can't be undone — past sales are kept on your records.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Button T={T} variant="ghost" full size="sm" onPress={() => setConfirmRemove(false)} disabled={removing}>
                      Keep it
                    </Button>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button T={T} variant="danger" full size="sm" onPress={onUnlist} disabled={removing}>
                      {removing ? 'Removing…' : 'Unlist'}
                    </Button>
                  </View>
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmRemove(true)} hitSlop={6} style={{
                alignSelf: 'center', marginTop: 6, paddingVertical: 8, paddingHorizontal: 14,
              }}>
                <Text style={{ color: T.danger, fontSize: 13, fontWeight: '600' }}>Unlist this product</Text>
              </Pressable>
            )
          ) : null}
        </View>
      </ScrollView>

      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: 16, paddingTop: 12, paddingBottom: 28,
        backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.hairline,
      }}>
        <Button T={T} full size="lg" onPress={save} disabled={!name || !price || uploadingPhoto || removing}>
          {isEdit ? 'Save changes' : 'Publish listing'}
        </Button>
      </View>
    </View>
  );
}
