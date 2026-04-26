import React from 'react';
import { Text, StyleSheet, useColorScheme } from 'react-native';
import { colors } from '../theme/colors';

type Props = { message: string | null | undefined };

export function InlineError({ message }: Props) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  if (!message) return null;
  return <Text style={[styles.text, { color: theme.error }]}>{message}</Text>;
}

const styles = StyleSheet.create({
  text: { fontSize: 13, marginTop: 2, marginBottom: 8, paddingHorizontal: 4 },
});
