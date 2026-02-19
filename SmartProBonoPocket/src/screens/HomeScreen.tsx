import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Image,
  Modal,
  Linking,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TabParamList, RootStackParamList } from '../navigation/types';
import { getEmergencyContact } from '../storage/contactStorage';
import { hasSeenRecordingDisclosure, setRecordingDisclosureSeen, getRecordingEnabled } from '../storage/settingsStorage';
import { getCurrentLocation } from '../utils/location';
import { formatLocationForMaps } from '../utils/location';
import { openSmsSafetyMode } from '../utils/sms';
import { colors } from '../theme/colors';
import { Button } from '../components/Button';

const DISCLOSURE_TEXT =
  'SmartPocketBuddy offers optional audio recording. Recording laws vary by state. Use responsibly and do not interfere with law enforcement.';
const LEARN_MORE_URL = 'https://www.aclu.org/know-your-rights/recording-police';

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<TabParamList, 'Home'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

export function HomeScreen({ navigation }: Props) {
  const [hasContact, setHasContact] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [starting, setStarting] = useState(false);
  const [recordingEnabled, setRecordingEnabled] = useState(true);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      const check = async () => {
        try {
          const contact = await getEmergencyContact();
          setHasContact(!!contact);
          const seen = await hasSeenRecordingDisclosure();
          if (!seen) setShowDisclosure(true);
          const recEnabled = await getRecordingEnabled();
          setRecordingEnabled(recEnabled);
        } catch {
          setHasContact(false);
          setShowDisclosure(false);
          setRecordingEnabled(true);
        }
      };
      check();
    });
    return () => task.cancel();
  }, []);

  const dismissDisclosure = async () => {
    await setRecordingDisclosureSeen();
    setShowDisclosure(false);
  };

  const openLearnMore = () => {
    Linking.openURL(LEARN_MORE_URL).catch(() => {});
  };

  const handleSafetyMode = () => {
    if (!hasContact) {
      navigation.navigate('SetupContact');
      return;
    }
    setShowConfirm(true);
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const loc = await getCurrentLocation();
      const locationLink = loc ? formatLocationForMaps(loc.latitude, loc.longitude) : undefined;
      const contact = await getEmergencyContact();

      setShowConfirm(false);
      setStarting(false);
      navigation.navigate('Active', { locationLink: locationLink ?? undefined });

      if (contact?.phone && locationLink) {
        await openSmsSafetyMode(contact.phone, locationLink);
      }
    } catch {
      setStarting(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.appTitle, { color: theme.text }]}>SmartPocketBuddy</Text>
        <View style={[styles.logoContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessible
            accessibilityLabel="Smart ProBono logo"
          />
        </View>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {hasContact ? '2 taps to activate Safety Mode' : 'Set your emergency contact to get started'}
        </Text>
      </View>

      <View style={styles.ctaSection}>
        <Button
          title="Safety Mode"
          onPress={handleSafetyMode}
          variant="primary"
          loading={starting}
          style={styles.safetyButton}
          textStyle={styles.safetyButtonText}
        />
      </View>

      <Modal visible={showDisclosure} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Recording disclosure</Text>
            <Text style={[styles.modalBody, { color: theme.text }]}>{DISCLOSURE_TEXT}</Text>
            <Button
              title="I understand"
              onPress={dismissDisclosure}
              variant="primary"
              style={styles.modalButtonPrimary}
            />
            <Button
              title="Learn more"
              onPress={openLearnMore}
              variant="secondary"
              style={styles.modalButtonSecondary}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showConfirm} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={handleCancel}
        >
          <TouchableOpacity
            style={[styles.bottomSheet, { backgroundColor: theme.surface }]}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={[styles.bottomSheetHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>Start Safety Mode?</Text>
            <Text style={[styles.bottomSheetSubtext, { color: theme.textMuted }]}>
              Actions that will happen:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bullet, { color: theme.text }]}>• Share location with emergency contact</Text>
              {recordingEnabled && (
                <Text style={[styles.bullet, { color: theme.text }]}>• Start audio recording</Text>
              )}
              <Text style={[styles.bullet, { color: theme.text }]}>• Display calm guidance</Text>
            </View>
            <Button
              title="Start"
              onPress={handleStart}
              loading={starting}
              disabled={starting}
              variant="primary"
              style={styles.bottomSheetStart}
            />
            <Button
              title="Cancel"
              onPress={handleCancel}
              variant="secondary"
              disabled={starting}
              style={styles.bottomSheetCancel}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const SECTION_SPACING = 24;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SECTION_SPACING * 2,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: SECTION_SPACING,
    textAlign: 'center',
  },
  logoContainer: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: SECTION_SPACING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  logo: {
    width: 110,
    height: 110,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  ctaSection: {
    marginTop: SECTION_SPACING,
    alignSelf: 'stretch',
  },
  safetyButton: {
    paddingVertical: 24,
    borderRadius: 18,
    minHeight: 64,
  },
  safetyButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 18,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalBody: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtonPrimary: { marginBottom: 12 },
  modalButtonSecondary: {},
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  bottomSheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  bottomSheetSubtext: {
    fontSize: 15,
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  bulletList: { alignSelf: 'stretch', marginBottom: 24 },
  bullet: { fontSize: 15, marginBottom: 6 },
  bottomSheetStart: { width: '100%', marginBottom: 12 },
  bottomSheetCancel: { width: '100%' },
});
