import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { SetupContactScreen } from '../screens/SetupContactScreen';
import { ActiveScreen } from '../screens/ActiveScreen';
import { RecordingScreen } from '../screens/RecordingScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const navTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      notification: theme.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
          headerBackTitle: 'Back',
          headerLargeTitle: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SetupContact"
          component={SetupContactScreen}
          options={{ title: 'Emergency Contact' }}
        />
        <Stack.Screen
          name="Active"
          component={ActiveScreen}
          options={{ title: 'Safety Mode', headerBackVisible: false }}
        />
        <Stack.Screen
          name="Recording"
          component={RecordingScreen}
          options={{ title: 'Recording' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
