import { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, Pressable, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import type { Product, Theme } from '../../types';
import { Icon } from '../Icon';

export function CartCounter({ p, T, preorder = false, size = 'md' }: {
  p: Product; T: Theme; preorder?: boolean; size?: 'sm' | 'md';
}) {
  const { cart, addToCart, changeQty, clearCart } = useApp();
  const qty        = cart.find(c => c.id === p.id)?.qty ?? 0;
  const outOfStock = p.stockCount === 0;

  const btnSize = size === 'sm' ? 28 : 34;
  const fs      = size === 'sm' ? 13 : 14;
  const bg      = outOfStock ? T.surfaceAlt : (preorder ? T.accent : T.ink);
  const fg      = outOfStock ? T.inkMuted   : '#fff';

  const expand = useRef(new Animated.Value(qty > 0 ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(expand, {
      toValue:         qty > 0 ? 1 : 0,
      duration:        200,
      easing:          Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [qty > 0]);

  const containerWidth = expand.interpolate({
    inputRange:  [0, 1],
    outputRange: [btnSize, btnSize * 2 + 28],
  });

  const onAdd = () => {
    if (outOfStock) return;
    if (qty > 0) { changeQty(p.id, qty + 1); return; }

    // First add — check if cart already has items from a different shop.
    const existingVendorId = cart.length > 0 ? cart[0].vendorId : null;
    if (existingVendorId && existingVendorId !== p.vendorId) {
      const shopName = cart[0].vendor || 'another shop';
      Alert.alert(
        'Start a new cart?',
        `Your cart has items from ${shopName}. Adding this item will clear your current cart.`,
        [
          { text: 'Keep current cart', style: 'cancel' },
          {
            text: 'Start new cart',
            style: 'destructive',
            onPress: () => { clearCart(); addToCart(p); },
          },
        ],
      );
      return;
    }
    addToCart(p);
  };

  return (
    <Animated.View style={{
      height: btnSize,
      width: containerWidth,
      borderRadius: btnSize / 2,
      backgroundColor: bg,
      overflow: 'hidden',
    }}>
      {/* "−" button — left edge, hidden when collapsed */}
      <Pressable
        onPress={() => changeQty(p.id, qty - 1)}
        hitSlop={6}
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: btnSize, alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="minus" size={fs - 1} color={fg} strokeWidth={2.4} />
      </Pressable>

      {/* Count — centre */}
      {qty > 0 ? (
        <View style={{
          position: 'absolute', top: 0, bottom: 0,
          left: btnSize, right: btnSize,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: fs, fontWeight: '700', color: fg }}>{qty}</Text>
        </View>
      ) : null}

      {/* "+" button — always pinned to right edge */}
      <Pressable
        onPress={onAdd}
        hitSlop={6}
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: btnSize, alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: fs + 4, fontWeight: '300', color: fg, lineHeight: fs + 6 }}>+</Text>
      </Pressable>
    </Animated.View>
  );
}
