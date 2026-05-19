import { ReactNode, useEffect, useRef } from 'react';
import {
  Animated, Easing, Image, InputAccessoryView, Keyboard, Platform,
  Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle, TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Product, Theme } from '../types';
import { Icon } from './Icon';
import { FONT } from '../constants/theme';

type ButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'soft' | 'ghost' | 'dark' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
  T: Theme;
  style?: ViewStyle;
  disabled?: boolean;
  icon?: string;
};

export function Button({ children, onPress, variant = 'primary', size = 'md', full, T, style, disabled, icon }: ButtonProps) {
  const sizes = { sm: { h: 36, px: 14, fs: 14, r: 12 }, md: { h: 48, px: 18, fs: 15, r: 14 }, lg: { h: 56, px: 22, fs: 17, r: 16 } }[size];
  const variants = {
    primary: { bg: T.brand, fg: '#fff', bd: 'transparent' },
    soft:    { bg: T.brandSoft, fg: T.brandInk, bd: 'transparent' },
    ghost:   { bg: 'transparent', fg: T.ink, bd: T.hairline },
    dark:    { bg: T.ink, fg: T.bg, bd: 'transparent' },
    accent:  { bg: T.accent, fg: '#fff', bd: 'transparent' },
    danger:  { bg: T.danger, fg: '#fff', bd: 'transparent' },
  }[variant];
  const pressScale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    if (disabled) return;
    Animated.timing(pressScale, { toValue: 0.96, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(pressScale, { toValue: 1, tension: 400, friction: 14, useNativeDriver: true }).start();
  };
  return (
    <Animated.View style={[{ transform: [{ scale: pressScale }] }, full ? { width: '100%' } : {}]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={[{
          height: sizes.h, paddingHorizontal: sizes.px, borderRadius: sizes.r,
          backgroundColor: variants.bg, borderWidth: 1, borderColor: variants.bd,
          flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
          opacity: disabled ? 0.4 : 1,
        }, style]}
      >
        {icon ? <Icon name={icon} size={sizes.fs + 3} color={variants.fg} /> : null}
        <Text style={{
          color: variants.fg, fontFamily: FONT.sans, fontWeight: '600', fontSize: sizes.fs, letterSpacing: -0.2,
          marginLeft: icon ? 8 : 0,
        }}>{children}</Text>
      </Pressable>
    </Animated.View>
  );
}

type CardProps = { children: ReactNode; T: Theme; style?: ViewStyle; raised?: boolean; onPress?: () => void };
export function Card({ children, T, style, raised, onPress }: CardProps) {
  const inner = (
    <View style={[{
      backgroundColor: raised ? T.surface : T.bgRaised,
      borderRadius: 22, padding: 16,
      borderWidth: 1, borderColor: T.hairline,
    }, raised && shadowStyle, style]}>{children}</View>
  );
  if (onPress) return <Pressable onPress={onPress}>{inner}</Pressable>;
  return inner;
}

type PillColor = 'neutral' | 'brand' | 'accent' | 'success' | 'warn' | 'danger' | 'ink';
export function Pill({ children, T, color = 'neutral', size = 'md', icon }: {
  children: ReactNode; T: Theme; color?: PillColor; size?: 'sm' | 'md'; icon?: string;
}) {
  const colors: Record<PillColor, { bg: string; fg: string }> = {
    neutral: { bg: T.surfaceAlt, fg: T.inkSoft },
    brand:   { bg: T.brandSoft, fg: T.brandInk },
    accent:  { bg: T.accentSoft, fg: T.accent },
    success: { bg: T.accentSoft, fg: T.success },
    warn:    { bg: 'rgba(201,128,58,0.16)', fg: T.warn },
    danger:  { bg: 'rgba(168,57,42,0.12)', fg: T.danger },
    ink:     { bg: T.ink, fg: T.bg },
  };
  const c = colors[color];
  const fs = size === 'sm' ? 11 : 12.5;
  const py = size === 'sm' ? 4 : 6;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
      paddingVertical: py, paddingHorizontal: 10, borderRadius: 999,
      backgroundColor: c.bg, gap: 5,
    }}>
      {icon ? <Icon name={icon} size={fs + 1} color={c.fg} /> : null}
      <Text style={{ color: c.fg, fontFamily: FONT.sans, fontWeight: '600', fontSize: fs, letterSpacing: 0.1 }}>{children}</Text>
    </View>
  );
}

export function Avatar({ name = '', size = 40, T, type = 'person', imageUrl }: {
  name?: string; size?: number; T?: Theme; type?: 'person' | 'pet';
  /** Optional photo URL; falls back to the colourised initial when omitted. */
  imageUrl?: string | null;
}) {
  const radius = type === 'pet' ? size * 0.4 : size / 2;
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{
          width: size, height: size, borderRadius: radius,
          borderWidth: T ? 1 : 0, borderColor: T?.hairline,
        }}
      />
    );
  }
  // Use only the first letter of the *first* word so pet names like
  // "Omar" → "O" instead of multi-letter initials. Person avatars keep
  // first+last initials for readability.
  const initials = type === 'pet'
    ? (name.trim()[0] || '').toUpperCase()
    : name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  const bg = `hsl(${h}, 45%, 65%)`;
  return (
    <View style={{
      width: size, height: size, borderRadius: radius,
      backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: T ? 1 : 0, borderColor: T?.hairline,
    }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.36, letterSpacing: -0.5 }}>{initials}</Text>
    </View>
  );
}

/**
 * Renders the product's hero photo when present, else the categorised placeholder.
 * Keeps the same aspect/radius across the shop, home carousel, cart, saved, and
 * provider shop manager so the visual rhythm stays consistent.
 */
export function ProductImage({ p, T, radius = 16, ratio = 1, style }: {
  p: Product; T: Theme; radius?: number; ratio?: number; style?: ViewStyle;
}) {
  if (p.imageUrl) {
    return (
      <View style={[{
        aspectRatio: ratio, borderRadius: radius, overflow: 'hidden',
        borderWidth: 1, borderColor: T.hairline, backgroundColor: T.surfaceAlt,
      }, style]}>
        <Image
          source={{ uri: p.imageUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
    );
  }
  return <ImagePlaceholder label={p.cat} T={T} radius={radius} ratio={ratio} accent={p.accent} style={style} />;
}

export function ImagePlaceholder({ label, T, radius = 16, accent, style, ratio = 1 }: {
  label: string; T: Theme; radius?: number; accent?: string; style?: ViewStyle; ratio?: number;
}) {
  const c = accent || T.brand;
  return (
    <View style={[{
      aspectRatio: ratio, borderRadius: radius, overflow: 'hidden',
      backgroundColor: c + '20',
      borderWidth: 1, borderColor: T.hairline,
      alignItems: 'center', justifyContent: 'center',
    }, style]}>
      <View style={{ backgroundColor: T.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
        <Text style={{ fontFamily: FONT.mono, fontSize: 10, color: T.inkMuted }}>{label}</Text>
      </View>
    </View>
  );
}

export function Field({ label, hint, children, T }: { label?: string; hint?: string; children: ReactNode; T: Theme }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{
        fontFamily: FONT.sans, fontSize: 12, fontWeight: '600',
        letterSpacing: 0.4, textTransform: 'uppercase', color: T.inkMuted,
      }}>{label}</Text> : null}
      {children}
      {hint ? <Text style={{ fontSize: 12, color: T.inkMuted }}>{hint}</Text> : null}
    </View>
  );
}

/** Shows a floating "Done" bar above the keyboard on iOS for any TextInput. */
export const DONE_BAR_ID = 'pawra-done-bar';

export function KeyboardDoneBar({ T }: { T: Theme }) {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={DONE_BAR_ID}>
      <View style={{
        flexDirection: 'row', justifyContent: 'flex-end',
        backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.hairline,
        paddingHorizontal: 16, paddingVertical: 8,
      }}>
        <Pressable onPress={() => Keyboard.dismiss()} hitSlop={8} style={{
          paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
          backgroundColor: T.brand,
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

export function Input(props: TextInputProps & { T: Theme }) {
  const { T, style, onSubmitEditing, returnKeyType, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={T.inkMuted}
      returnKeyType={returnKeyType ?? 'done'}
      onSubmitEditing={(e) => {
        onSubmitEditing?.(e);
        Keyboard.dismiss();
      }}
      inputAccessoryViewID={Platform.OS === 'ios' ? DONE_BAR_ID : undefined}
      {...rest}
      style={[{
        height: 50, paddingHorizontal: 16, borderRadius: 14,
        backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
        fontFamily: FONT.sans, fontSize: 16, color: T.ink,
      }, style]}
    />
  );
}

type TabItem = { id: string; icon: string; label: string };
export function TabBar({ tabs, active, onChange, T, dark, badge }: {
  tabs: TabItem[]; active: string; onChange: (id: string) => void; T: Theme; dark: boolean; badge?: Record<string, number>;
}) {
  // Bleed the bar background behind the home indicator while keeping
  // the tappable content above it. The SafeAreaView adds bottom inset
  // padding to its content area — extending the bar by that inset and
  // positioning it at -insets.bottom makes the background flush with
  // the physical screen edge.
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      position: 'absolute', left: 0, right: 0, bottom: -insets.bottom,
      backgroundColor: dark ? 'rgba(30,24,19,0.97)' : 'rgba(255,255,255,0.97)',
      borderTopWidth: 1, borderTopColor: T.hairline,
      flexDirection: 'row', justifyContent: 'space-around',
      paddingTop: 10, paddingBottom: insets.bottom + 10, paddingHorizontal: 4,
      ...shadowStyle,
    }}>
      {tabs.map(t => (
        <AnimatedTabItem
          key={t.id}
          t={t}
          isActive={active === t.id}
          badge={badge?.[t.id]}
          onPress={() => onChange(t.id)}
          T={T}
          dark={dark}
        />
      ))}
    </View>
  );
}

function AnimatedTabItem({ t, isActive, badge: b, onPress, T, dark }: {
  t: TabItem; isActive: boolean; badge?: number;
  onPress: () => void; T: Theme; dark: boolean;
}) {
  // Pop scale: springs to 1.18 on activate, settles back to 1 when inactive.
  const scale = useRef(new Animated.Value(1)).current;
  // Press-down scale for immediate tactile feedback.
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      // Quick overshoot spring — gives the "bouncy select" feel.
      Animated.spring(scale, {
        toValue: 1.18,
        useNativeDriver: true,
        tension: 480,
        friction: 12,
      }).start(() => {
        // Settle back to a slightly elevated resting size so the active icon
        // stays visually distinct without being oversized.
        Animated.spring(scale, {
          toValue: 1.08,
          useNativeDriver: true,
          tension: 300,
          friction: 18,
        }).start();
      });
    } else {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 18,
      }).start();
    }
  }, [isActive, scale]);

  const onPressIn = () => {
    Animated.timing(pressScale, {
      toValue: 0.88,
      duration: 80,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 14,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ alignItems: 'center', flex: 1, paddingVertical: 4, borderRadius: 16, gap: 2 }}
    >
      {/* Wrap icon + badge together; badge lives OUTSIDE the transform
          so iOS's transform clipping context never crops it. */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ transform: [{ scale: Animated.multiply(scale, pressScale) }] }}>
          <Icon name={t.icon} size={22} color={isActive ? T.brand : T.inkMuted} strokeWidth={isActive ? 2.2 : 1.6} />
        </Animated.View>
        {b && b > 0 ? (
          <View style={{
            position: 'absolute', top: -6, right: -10, minWidth: 16, height: 16, paddingHorizontal: 4,
            borderRadius: 8, backgroundColor: T.brand, borderWidth: 2, borderColor: dark ? T.bg : '#fff',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{b > 99 ? '99+' : b}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontSize: 10.5, fontWeight: '600', color: isActive ? T.brand : T.inkMuted }}>{t.label}</Text>
    </Pressable>
  );
}

export function SectionHeader({ title, action, T }: { title: string; action?: { label: string; onPress: () => void }; T: Theme }) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
      paddingHorizontal: 20, marginTop: 24, marginBottom: 12,
    }}>
      <Text style={{ fontSize: 19, fontWeight: '700', letterSpacing: -0.4, color: T.ink }}>{title}</Text>
      {action ? (
        <Pressable onPress={action.onPress}>
          <Text style={{ color: T.brand, fontSize: 14, fontWeight: '600' }}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function StatusDot({ status, T }: { status: string; T: Theme }) {
  const map: Record<string, string> = {
    pending: T.warn, confirmed: T.brand, in_progress: T.accent, completed: T.success,
    cancelled: T.inkMuted, declined: T.danger, rejected: T.danger, shipped: T.accent,
  };
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: map[status] || T.inkMuted }} />;
}

export function PawraWordmark({ size = 22, color }: { size?: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <Icon name="logo" size={size} color={color} />
      <Text style={{ fontFamily: FONT.serif, fontWeight: '600', fontSize: size, letterSpacing: -0.5, color }}>pawra</Text>
    </View>
  );
}

export const shadowStyle: ViewStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 3,
};

export const styles = StyleSheet.create({});
