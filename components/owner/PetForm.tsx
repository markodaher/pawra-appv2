import { pickPhoto } from '../../lib/pickPhoto';
import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { FONT } from '../../constants/theme';
import { useApp } from '../../lib/AppContext';
import { uploadPetPhoto } from '../../lib/storage';
import type { Pet, Theme } from '../../types';
import { Avatar, DONE_BAR_ID, Field, Input } from '../primitives';
import { Icon } from '../Icon';

export type PetDraft = {
  name: string;
  species: 'dog' | 'cat';
  breed: string;
  age: string;       // text while typing
  weight: string;
  sex: 'male' | 'female';
  color: string;
  blood: string;
  neutered: boolean;
  notes: string;
  imageUrl?: string;
};

export const EMPTY_PET_DRAFT: PetDraft = {
  name: '', species: 'dog', breed: '', age: '', weight: '',
  sex: 'male', color: '', blood: '', neutered: false, notes: '',
  imageUrl: undefined,
};

export function petToDraft(p: Pet): PetDraft {
  return {
    name: p.name,
    species: p.species,
    breed: p.breed,
    age: p.age ? String(p.age) : '',
    weight: p.weight ? String(p.weight) : '',
    sex: p.sex,
    color: p.color ?? '',
    blood: p.blood,
    neutered: p.neutered ?? false,
    notes: p.notes ?? '',
    imageUrl: p.imageUrl,
  };
}

export function draftToPet(d: PetDraft, id: string): Pet {
  return {
    id,
    name: d.name.trim(),
    species: d.species,
    breed: d.breed.trim(),
    age: parseFloat(d.age) || 0,
    weight: parseFloat(d.weight) || 0,
    sex: d.sex,
    blood: d.blood.trim(),
    color: d.color.trim() || undefined,
    neutered: d.neutered,
    notes: d.notes.trim() || undefined,
    imageUrl: d.imageUrl,
  };
}

export function isPetDraftValid(d: PetDraft): boolean {
  return d.name.trim().length > 0 && d.breed.trim().length > 0;
}

export function PetForm({ value, onChange, T }: {
  value: PetDraft;
  onChange: (patch: Partial<PetDraft>) => void;
  T: Theme;
}) {
  const { user, showNotif } = useApp();
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const asset = await pickPhoto({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!asset || !user.id) return;
    setUploading(true);
    const url = await uploadPetPhoto(asset.uri, user.id);
    setUploading(false);
    if (!url) {
      showNotif({ title: "Couldn't upload photo", body: 'Try again.', icon: 'x' }, 3000);
      return;
    }
    onChange({ imageUrl: url });
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Photo picker — optional. Falls back to first-letter avatar everywhere. */}
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={uploading ? undefined : pickImage}
          style={{ position: 'relative' }}
        >
          <Avatar
            name={value.name || '?'}
            size={92}
            type="pet"
            T={T}
            imageUrl={value.imageUrl}
          />
          {uploading ? (
            <View style={{
              position: 'absolute', inset: 0, borderRadius: 92 * 0.4,
              backgroundColor: 'rgba(0,0,0,0.4)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
          <View style={{
            position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderRadius: 15,
            backgroundColor: T.ink, borderWidth: 2, borderColor: T.bg,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="camera" size={14} color={T.bg} />
          </View>
        </Pressable>
        <Text style={{ fontSize: 12, color: T.inkMuted }}>
          {value.imageUrl ? 'Tap to change photo' : 'Add a photo (optional)'}
        </Text>
        {value.imageUrl ? (
          <Pressable onPress={() => onChange({ imageUrl: undefined })} hitSlop={6}>
            <Text style={{ fontSize: 12, color: T.danger, fontWeight: '600' }}>Remove photo</Text>
          </Pressable>
        ) : null}
      </View>

      <Field T={T} label="Pet name">
        <Input T={T} value={value.name} onChangeText={(name) => onChange({ name })} placeholder="e.g. Zaytoun" />
      </Field>

      <Field T={T} label="Species">
        <Segmented T={T}
          options={[{ id: 'dog', label: 'Dog' }, { id: 'cat', label: 'Cat' }]}
          value={value.species}
          onChange={(id) => onChange({ species: id as 'dog' | 'cat' })}
        />
      </Field>

      <Field T={T} label="Breed">
        <Input T={T} value={value.breed} onChangeText={(breed) => onChange({ breed })} placeholder="e.g. Mountain mutt" />
      </Field>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field T={T} label="Age (years)">
            <Input T={T} value={value.age} onChangeText={(age) => onChange({ age })} keyboardType="decimal-pad" placeholder="3" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field T={T} label="Weight (kg)">
            <Input T={T} value={value.weight} onChangeText={(weight) => onChange({ weight })} keyboardType="decimal-pad" placeholder="18" />
          </Field>
        </View>
      </View>

      <Field T={T} label="Sex">
        <Segmented T={T}
          options={[{ id: 'male', label: 'Male' }, { id: 'female', label: 'Female' }]}
          value={value.sex}
          onChange={(id) => onChange({ sex: id as 'male' | 'female' })}
        />
      </Field>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field T={T} label="Color">
            <Input T={T} value={value.color} onChangeText={(color) => onChange({ color })} placeholder="e.g. Brown" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field T={T} label="Blood type">
            <Input
              T={T}
              value={value.blood}
              onChangeText={(blood) => onChange({ blood })}
              placeholder={value.species === 'cat' ? 'A / B / AB' : 'DEA 1.1+'}
            />
          </Field>
        </View>
      </View>

      <Pressable
        onPress={() => onChange({ neutered: !value.neutered })}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          padding: 14, borderRadius: 14,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14.5, fontWeight: '600', color: T.ink, letterSpacing: -0.2 }}>
            Spayed / neutered
          </Text>
          <Text style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
            Helps providers prepare correctly.
          </Text>
        </View>
        <View style={{
          width: 44, height: 26, borderRadius: 13, padding: 2,
          backgroundColor: value.neutered ? T.brand : T.surfaceAlt,
          borderWidth: 1, borderColor: value.neutered ? T.brand : T.hairline,
          justifyContent: 'center',
        }}>
          <View style={{
            width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
            marginLeft: value.neutered ? 18 : 0,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 1,
          }} />
        </View>
      </Pressable>

      <Field T={T} label="Notes" hint="Allergies, behaviors, anything providers should know.">
        <TextInput
          value={value.notes}
          onChangeText={(notes) => onChange({ notes })}
          multiline
          placeholder="e.g. Pulls a bit on leash. Allergic to chicken."
          placeholderTextColor={T.inkMuted}
          inputAccessoryViewID={Platform.OS === 'ios' ? DONE_BAR_ID : undefined}
          style={{
            minHeight: 90, padding: 14, borderRadius: 14,
            backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
            fontFamily: FONT.sans, fontSize: 14.5, color: T.ink, textAlignVertical: 'top',
          }}
        />
      </Field>
    </View>
  );
}

function Segmented<T extends string>({ T: theme, options, value, onChange }: {
  T: Theme;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <View style={{
      flexDirection: 'row', backgroundColor: theme.surfaceAlt,
      borderRadius: 12, padding: 4,
    }}>
      {options.map(o => {
        const active = value === o.id;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} style={{
            flex: 1, paddingVertical: 10, borderRadius: 8,
            backgroundColor: active ? theme.surface : 'transparent',
            alignItems: 'center',
            ...(active ? {
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08, shadowRadius: 2, elevation: 1,
            } : {}),
          }}>
            <Text style={{ color: active ? theme.ink : theme.inkMuted, fontWeight: '600', fontSize: 14 }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
