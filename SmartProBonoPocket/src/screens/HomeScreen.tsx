import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Image,
  Modal,
  Linking,
  InteractionManager,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TabParamList, RootStackParamList } from '../navigation/types';
import { getEmergencyContact } from '../storage/contactStorage';
import {
  hasSeenRecordingDisclosure,
  setRecordingDisclosureSeen,
  getRecordingEnabled,
  getCalmGuidanceEnabled,
} from '../storage/settingsStorage';
import { startSession } from '../services/sessionService';
import { markKidSchedulePromptShown, shouldPromptKidSchedule } from '../storage/kidScheduleStorage';
import { colors } from '../theme/colors';
import { Button } from '../components/Button';

const DISCLOSURE_TEXT =
  'SmartProBono offers optional audio recording. Recording laws vary by state. Use responsibly and do not interfere with law enforcement.';
const LEARN_MORE_URL = 'https://www.aclu.org/know-your-rights/recording-police';

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<TabParamList, 'Home'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

type ArrivalChoice = 0 | 15 | 30 | 60;

export function HomeScreen({ navigation }: Props) {
  const [hasContact, setHasContact] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTravelConfirm, setShowTravelConfirm] = useState(false);
  const [showKidConfirm, setShowKidConfirm] = useState(false);
  const [showScheduleKidPrompt, setShowScheduleKidPrompt] = useState(false);
  const [travelArrivalMinutes, setTravelArrivalMinutes] = useState<ArrivalChoice>(0);
  const [starting, setStarting] = useState(false);
  const [recordingEnabled, setRecordingEnabled] = useState(true);
  const [calmGuidanceEnabled, setCalmGuidanceEnabled] = useState(true);
  const hasContactRef = useRef(false);
  const modalBlockRef = useRef(false);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  useEffect(() => {
    hasContactRef.current = hasContact;
  }, [hasContact]);

  useEffect(() => {
    modalBlockRef.current =
      showScheduleKidPrompt ||
      showKidConfirm ||
      showTravelConfirm ||
      showConfirm ||
      showDisclosure;
  }, [
    showScheduleKidPrompt,
    showKidConfirm,
    showTravelConfirm,
    showConfirm,
    showDisclosure,
  ]);

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
          const calm = await getCalmGuidanceEnabled();
          setCalmGuidanceEnabled(calm);
        } catch {
          setHasContact(false);
          setShowDisclosure(false);
          setRecordingEnabled(true);
          setCalmGuidanceEnabled(true);
        }
      };
      check();
    });
    return () => task.cancel();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void getEmergencyContact().then((c) => setHasContact(!!c));
      void getRecordingEnabled().then(setRecordingEnabled);
      void getCalmGuidanceEnabled().then(setCalmGuidanceEnabled);
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const tick = async () => {
        if (cancelled || modalBlockRef.current || !hasContactRef.current) return;
        try {
          if (await shouldPromptKidSchedule()) {
            await markKidSchedulePromptShown();
            if (!cancelled) setShowScheduleKidPrompt(true);
          }
        } catch {
          // ignore
        }
      };
      void tick();
      const id = setInterval(() => void tick(), 15_000);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }, [])
  );

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

  const handleTravelMode = () => {
    if (!hasContact) {
      navigation.navigate('SetupContact');
      return;
    }
    setTravelArrivalMinutes(0);
    setShowTravelConfirm(true);
  };

  const handleKidMode = () => {
    if (!hasContact) {
      navigation.navigate('SetupContact');
      return;
    }
    setShowKidConfirm(true);
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const { locationLink } = await startSession('safety', {
        recordingEnabled,
        calmGuidanceEnabled,
        recordingMode: 'audio',
      });
      setShowConfirm(false);
      navigation.navigate('Active', {
        sessionMode: 'safety',
        locationLink: locationLink ?? undefined,
      });
    } catch {
      Alert.alert('Could not start', 'Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  const handleTravelStart = async () => {
    setStarting(true);
    try {
      const { locationLink } = await startSession('travel', {
        arrivalCheckMinutes: travelArrivalMinutes === 0 ? null : travelArrivalMinutes,
        recordingEnabled,
        calmGuidanceEnabled,
        recordingMode: 'video',
      });
      setShowTravelConfirm(false);
      navigation.navigate('Active', {
        sessionMode: 'travel',
        locationLink: locationLink ?? undefined,
        arrivalCheckMinutes: travelArrivalMinutes === 0 ? null : travelArrivalMinutes,
      });
    } catch {
      Alert.alert('Could not start', 'Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleTravelCancel = () => {
    setShowTravelConfirm(false);
  };

  const runKidTrackStart = async (closeModal: () => void) => {
    setStarting(true);
    try {
      const { locationLink } = await startSession('kid_track', {
        recordingEnabled,
        calmGuidanceEnabled,
        recordingMode: 'audio',
      });
      closeModal();
      navigation.navigate('Active', {
        sessionMode: 'kid_track',
        locationLink: locationLink ?? undefined,
      });
    } catch {
      Alert.alert('Could not start', 'Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleKidStart = async () => {
    await runKidTrackStart(() => setShowKidConfirm(false));
  };

  const handleKidCancel = () => {
    setShowKidConfirm(false);
  };

  const handleScheduleKidStart = async () => {
    await runKidTrackStart(() => setShowScheduleKidPrompt(false));
  };

  const handleScheduleKidCancel = () => {
    setShowScheduleKidPrompt(false);
  };

  const kidTrackActionsBlock = (
    <>
      <Text style={[styles.bottomSheetSubtext, { color: theme.textMuted }]}>
        Actions that will happen:
      </Text>
      <View style={styles.bulletList}>
        <Text style={[styles.bullet, { color: theme.text }]}>• Track your route</Text>
        <Text style={[styles.bullet, { color: theme.text }]}>• Start audio recording</Text>
        <Text style={[styles.bullet, { color: theme.text }]}>• Display calm guidance</Text>
      </View>
    </>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.heroTagline, { color: theme.primaryAccent }]}>HERE WHEN IT MATTERS</Text>
        <Text style={[styles.appTitle, { color: theme.text }]}>SmartProBono</Text>
        <View style={[styles.logoContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessible
            accessibilityLabel="Smart ProBono logo"
          />
        </View>
        <Text style={[styles.heroBody, { color: theme.textMuted }]}>
          Stay connected and protected. Share your location with trusted contacts and get alerts if something
          changes.
        </Text>
        {!hasContact && (
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Set your emergency contact to get started
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.familyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => navigation.navigate('FamilyHub')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Family and Kid Track"
      >
        <View style={styles.familyCardTextWrap}>
          <Text style={[styles.familyCardTitle, { color: theme.text }]}>Family & Kid Track</Text>
          <Text style={[styles.familyCardSubtitle, { color: theme.textMuted }]}>
            Schedules, trusted contacts, and reminders on this device.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={theme.primaryAccent} />
      </TouchableOpacity>

      <View style={styles.ctaSection}>
        <Button
          title="Safety Mode"
          onPress={handleSafetyMode}
          variant="primary"
          loading={starting}
          disabled={starting}
          style={styles.safetyButton}
          textStyle={styles.safetyButtonText}
        />
        <Button
          title="Travel Mode"
          onPress={handleTravelMode}
          variant="secondary"
          loading={starting}
          disabled={starting}
          style={styles.travelButton}
          textStyle={styles.travelButtonText}
        />
        <Button
          title="Start Kid Track"
          onPress={handleKidMode}
          variant="secondary"
          loading={starting}
          disabled={starting}
          style={styles.kidTrackButton}
          textStyle={styles.kidTrackButtonText}
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

      <Modal visible={showScheduleKidPrompt} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={handleScheduleKidCancel}
        >
          <TouchableOpacity
            style={[styles.bottomSheet, { backgroundColor: theme.surface }]}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={[styles.bottomSheetHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>Kid Track reminder</Text>
            <Text style={[styles.bottomSheetSubtext, { color: theme.textMuted }]}>
              It&apos;s time for your scheduled check-in. Start Kid Track now?
            </Text>
            {kidTrackActionsBlock}
            <Button
              title="Start"
              onPress={handleScheduleKidStart}
              loading={starting}
              disabled={starting}
              variant="primary"
              style={styles.bottomSheetStart}
            />
            <Button
              title="Not now"
              onPress={handleScheduleKidCancel}
              variant="secondary"
              disabled={starting}
              style={styles.bottomSheetCancel}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showKidConfirm} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={handleKidCancel}
        >
          <TouchableOpacity
            style={[styles.bottomSheet, { backgroundColor: theme.surface }]}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={[styles.bottomSheetHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>Start Kid Track?</Text>
            {kidTrackActionsBlock}
            <Button
              title="Start"
              onPress={handleKidStart}
              loading={starting}
              disabled={starting}
              variant="primary"
              style={styles.bottomSheetStart}
            />
            <Button
              title="Cancel"
              onPress={handleKidCancel}
              variant="secondary"
              disabled={starting}
              style={styles.bottomSheetCancel}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showTravelConfirm} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={handleTravelCancel}
        >
          <TouchableOpacity
            style={[styles.bottomSheet, { backgroundColor: theme.surface }]}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={[styles.bottomSheetHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>Start Travel Mode?</Text>
            <Text style={[styles.bottomSheetSubtext, { color: theme.textMuted }]}>
              Actions that will happen:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bullet, { color: theme.text }]}>• Track your route</Text>
              <Text style={[styles.bullet, { color: theme.textMuted }]}>Arrival check (optional)</Text>
              <View style={styles.arrivalRow}>
                {([0, 15, 30, 60] as ArrivalChoice[]).map((m) => {
                  const selected = travelArrivalMinutes === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.arrivalChip,
                        {
                          borderColor: selected ? theme.primaryAccent : theme.border,
                          backgroundColor: selected ? theme.primaryAccent : 'transparent',
                        },
                      ]}
                      onPress={() => setTravelArrivalMinutes(m)}
                    >
                      <Text
                        style={[
                          styles.arrivalChipText,
                          { color: selected ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {m === 0 ? 'None' : `${m}m`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.bullet, { color: theme.text }]}>• Start video recording</Text>
              <Text style={[styles.bullet, { color: theme.text }]}>• Display calm guidance</Text>
            </View>
            <Button
              title="Start"
              onPress={handleTravelStart}
              loading={starting}
              disabled={starting}
              variant="primary"
              style={styles.bottomSheetStart}
            />
            <Button
              title="Cancel"
              onPress={handleTravelCancel}
              variant="secondary"
              disabled={starting}
              style={styles.bottomSheetCancel}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const SECTION_SPACING = 24;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: SECTION_SPACING * 2,
  },
  heroTagline: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: SECTION_SPACING,
    textAlign: 'center',
  },
  heroBody: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 8,
    marginTop: 4,
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
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  familyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: SECTION_SPACING,
  },
  familyCardTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  familyCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  familyCardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  ctaSection: {
    marginTop: 4,
    alignSelf: 'stretch',
    gap: 12,
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
  travelButton: {
    paddingVertical: 20,
    borderRadius: 18,
    minHeight: 56,
    borderColor: '#3FAE9D',
  },
  travelButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  kidTrackButton: {
    paddingVertical: 20,
    borderRadius: 18,
    minHeight: 56,
    borderColor: '#3FAE9D',
  },
  kidTrackButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  arrivalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  arrivalChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  arrivalChipText: {
    fontSize: 14,
    fontWeight: '600',
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
