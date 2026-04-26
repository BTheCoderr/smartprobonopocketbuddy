import React from 'react';
import { View, StyleSheet, ViewStyle, useColorScheme } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Card({ children, style }: Props) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 24,
  },
});
