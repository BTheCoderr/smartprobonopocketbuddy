import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, useColorScheme, Image, Text } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { hasCompletedOnboarding } from '../storage/settingsStorage';
import { discardStalePersistedSession } from '../services/liveSessionRuntime';
import { retryAsync } from '../utils/retry';
import { colors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Gate'>;
};

export function GateScreen({ navigation }: Props) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        await discardStalePersistedSession();
      } catch {
        // Stale session cleanup failed; safe to continue
      }
      try {
        const done = await retryAsync(() => hasCompletedOnboarding());
        if (!mounted) return;
        if (done) {
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        } else {
          navigation.replace('Onboarding');
        }
      } catch {
        if (mounted) {
          navigation.replace('Onboarding');
        }
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>SmartProBono</Text>
      <View style={[styles.logoContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Smart ProBono logo"
        />
      </View>
      <ActivityIndicator size="large" color={theme.primaryAccent} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  logoContainer: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  logo: {
    width: 100,
    height: 100,
  },
  spinner: {
    marginTop: 8,
  },
});
