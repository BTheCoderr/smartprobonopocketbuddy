import React, { useCallback, useRef, useState } from 'react';
import { type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { Button } from './Button';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  title: string;
  onPress: () => Promise<void>;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
};

/**
 * Wraps Button with automatic busy-state management for async actions.
 * While the returned promise is pending the button shows a spinner and
 * rejects additional taps — no manual loading/disabled wiring needed.
 */
export function AsyncButton({
  onPress,
  disabled = false,
  ...rest
}: Props) {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const handlePress = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    onPress().finally(() => {
      busyRef.current = false;
      setBusy(false);
    });
  }, [onPress]);

  return (
    <Button
      {...rest}
      onPress={handlePress}
      loading={busy}
      disabled={disabled || busy}
    />
  );
}
