import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type ToastType = 'success' | 'error' | 'info';

type ToastOptions = {
  type: ToastType;
  message: string;
  /** Override auto-dismiss duration in ms. */
  duration?: number;
};

type ToastContextValue = {
  show: (opts: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error: 4000,
  info: 3000,
};

function ToastOverlay() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;
  const ctx = useContext(ToastContext) as ToastContextValue & { _current: ToastOptions | null; _dismiss: () => void };

  if (!ctx._current) return null;

  const bg =
    ctx._current.type === 'success'
      ? theme.primaryAccent
      : ctx._current.type === 'error'
        ? theme.error
        : theme.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={ctx._dismiss}
      style={[styles.toast, { top: insets.top + 8, backgroundColor: bg }]}
      accessibilityRole="alert"
    >
      <Text style={styles.toastText} numberOfLines={3}>
        {ctx._current.message}
      </Text>
    </TouchableOpacity>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ToastOptions | null>(null);
  const translateY = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animatingOutRef = useRef(false);

  const dismiss = useCallback(() => {
    if (animatingOutRef.current) return;
    animatingOutRef.current = true;
    Animated.timing(translateY, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrent(null);
      animatingOutRef.current = false;
    });
  }, [translateY]);

  const show = useCallback(
    (opts: ToastOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      animatingOutRef.current = false;

      setCurrent(opts);
      translateY.setValue(-100);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();

      const dur = opts.duration ?? DEFAULT_DURATIONS[opts.type];
      timerRef.current = setTimeout(dismiss, dur);
    },
    [dismiss, translateY],
  );

  const ctxValue = Object.assign({ show }, { _current: current, _dismiss: dismiss });

  return (
    <ToastContext.Provider value={ctxValue}>
      {children}
      {current && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.overlay, { transform: [{ translateY }] }]}
          pointerEvents="box-none"
        >
          <ToastOverlay />
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  toast: {
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    alignSelf: 'stretch',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
