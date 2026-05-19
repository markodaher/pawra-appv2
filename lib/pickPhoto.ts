import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Shows a native action sheet letting the user choose "Take photo" or
 * "Choose from library". Handles permissions for whichever branch they pick.
 * Returns the picked asset, or null if cancelled / permission denied.
 */
export function pickPhoto(
  options: Omit<ImagePicker.ImagePickerOptions, 'mediaTypes'> = {},
): Promise<ImagePicker.ImagePickerAsset | null> {
  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    ...options,
  };

  return new Promise((resolve) => {
    Alert.alert(
      'Add photo',
      undefined,
      [
        {
          text: 'Take photo',
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) { resolve(null); return; }
            const r = await ImagePicker.launchCameraAsync(opts);
            resolve(r.canceled || !r.assets[0] ? null : r.assets[0]);
          },
        },
        {
          text: 'Choose from library',
          onPress: async () => {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) { resolve(null); return; }
            const r = await ImagePicker.launchImageLibraryAsync(opts);
            resolve(r.canceled || !r.assets[0] ? null : r.assets[0]);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
