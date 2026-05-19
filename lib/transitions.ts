import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing } from 'react-native';

/**
 * Mount-time entrance animation, Toters-style.
 *
 *   right  — full-screen push: slides in from the right edge
 *   bottom — bottom sheet / drawer: slides up from below + fades the backdrop
 *   fade   — gentle opacity ramp (used for confirmation overlays)
 *
 * The hook drives a single Animated.Value from 0 → 1 on mount and exposes
 * pre-built style objects so callers don't need to know about interpolations.
 *
 * Native-driver only (transform + opacity) so the animation runs off the JS
 * thread — no jank during heavy renders. Exit animations are intentionally
 * skipped: matching them across React's conditional unmount adds a lot of
 * plumbing for marginal gain over an instant exit.
 */
export type TransitionMode = 'right' | 'bottom' | 'fade';

export function useEnterAnim(mode: TransitionMode = 'right') {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      // 240ms is the sweet spot — fast enough to feel snappy, slow enough to
      // read as a deliberate transition rather than a hard cut.
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v]);

  return useMemo(() => {
    const W = Dimensions.get('window').width;
    const H = Dimensions.get('window').height;

    if (mode === 'right') {
      return {
        // Full-screen sheet that slides in from the right.
        sheet: {
          transform: [{
            translateX: v.interpolate({ inputRange: [0, 1], outputRange: [W, 0] }),
          }],
        },
        backdrop: { opacity: v },
      };
    }
    if (mode === 'bottom') {
      return {
        // Sheet starts ~60% off-screen so even tall drawers don't feel laggy.
        sheet: {
          transform: [{
            translateY: v.interpolate({ inputRange: [0, 1], outputRange: [H * 0.6, 0] }),
          }],
        },
        // Backdrop fades in slightly slower than the sheet for depth.
        backdrop: { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
      };
    }
    // fade
    return {
      sheet: { opacity: v },
      backdrop: { opacity: v },
    };
  }, [v, mode]);
}
