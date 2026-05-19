import { Pressable, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import type { Theme } from '../../types';
import { Icon } from '../Icon';

export function LocationPill({ T }: { T: Theme }) {
  const { currentAddress, setLocationOpen } = useApp();

  // Bold line: the name the owner gave this address ("Home", "Work", "Mom's place").
  // Sub line: area / street, so they also know which neighbourhood it maps to.
  const hasAddress = !!currentAddress;
  const label   = hasAddress ? (currentAddress!.label  || 'My location') : 'Set location';
  const sublabel = hasAddress ? (currentAddress!.area || currentAddress!.line1 || '') : 'Tap to pick one';

  return (
    <Pressable
      onPress={() => setLocationOpen(true)}
      hitSlop={4}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 8,
        height: 48, paddingHorizontal: 12, paddingLeft: 10, borderRadius: 24,
        backgroundColor: T.surface,
        borderWidth: 1, borderColor: hasAddress ? T.brand : T.hairline,
        minWidth: 140, maxWidth: 210,
        opacity: pressed ? 0.85 : 1,
        shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
      })}
    >
      <View style={{
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: hasAddress ? T.brandSoft : T.surfaceAlt,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="pin" size={13} color={hasAddress ? T.brand : T.inkMuted} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{
          fontSize: 13, fontWeight: '700', color: hasAddress ? T.ink : T.inkSoft,
          letterSpacing: -0.2,
        }}>
          {label}
        </Text>
        {sublabel ? (
          <Text numberOfLines={1} style={{
            fontSize: 10.5, color: T.inkMuted, marginTop: 1,
          }}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-down" size={13} color={T.inkSoft} />
    </Pressable>
  );
}
