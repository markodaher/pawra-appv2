import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import type { Notif, Theme } from '../types';
import { Icon } from './Icon';

function PingRing({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }),
    ).start();
  }, [anim]);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.55] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.5, 0] });
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', width: 48, height: 48, borderRadius: 14,
      borderWidth: 2, borderColor: color,
      transform: [{ scale }], opacity,
    }} />
  );
}

export function NotifBanner({ T, notif, onDismiss, onPress }: {
  T: Theme; notif: Notif | null; onDismiss: () => void; onPress?: () => void;
}) {
  const translateY = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    if (notif) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    } else {
      Animated.timing(translateY, { toValue: -200, duration: 200, useNativeDriver: true }).start();
    }
  }, [notif, translateY]);

  if (!notif) return null;

  const tappable = !!(onPress && (notif.targetKind || notif.targetId));

  const body = (
    <>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 40, height: 40, borderRadius: 12, backgroundColor: T.brand,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={notif.icon || 'paw'} size={20} color="#fff" />
        </View>
        <PingRing color={T.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: T.brand, letterSpacing: 0.4, textTransform: 'uppercase' }}>Pawra</Text>
          <Text style={{ fontSize: 10, color: T.inkMuted }}>now</Text>
          <Icon name="speaker" size={11} color={T.inkMuted} />
          <Icon name="vibrate" size={11} color={T.inkMuted} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }} numberOfLines={1}>{notif.title}</Text>
        <Text style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 1, lineHeight: 16 }} numberOfLines={2}>{notif.body}</Text>
      </View>
    </>
  );

  return (
    <Animated.View style={{
      position: 'absolute', left: 8, right: 8, top: 8, zIndex: 100,
      backgroundColor: T.surface, borderRadius: 22, padding: 12,
      borderWidth: 1, borderColor: T.hairline,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      transform: [{ translateY }],
      shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 8,
    }}>
      {tappable ? (
        <Pressable onPress={onPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {body}
        </Pressable>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {body}
        </View>
      )}
      <Pressable onPress={onDismiss} hitSlop={8} style={{
        width: 28, height: 28, borderRadius: 14, backgroundColor: T.surfaceAlt,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="x" size={13} color={T.ink} />
      </Pressable>
    </Animated.View>
  );
}
