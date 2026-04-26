import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  useColorScheme,
} from 'react-native';
import { colors } from '../theme/colors';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: Props) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        isPrimary && { backgroundColor: theme.primaryAccent },
        variant === 'secondary' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? theme.onPrimary : theme.primaryAccent} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && { color: theme.onPrimary },
            variant === 'secondary' && { color: theme.text },
            variant === 'ghost' && { color: theme.primaryAccent },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 17,
    fontWeight: '600',
  },
});
