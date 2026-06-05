import { useRef, useCallback } from "react";
import { Animated, Easing } from "react-native";

/** Lightweight scale-bounce for tactile-feeling visual feedback on taps
 *  (replaces vibration as the primary like/follow cue). */
export function useBounce(peak = 1.28) {
  const scale = useRef(new Animated.Value(1)).current;

  const bounce = useCallback(() => {
    scale.stopAnimation();
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, { toValue: peak, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
    ]).start();
  }, [peak, scale]);

  return { scale, bounce };
}
