import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  TextInput,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import * as Location from 'expo-location';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { Button } from '../components/Button';
import { saveEmergencyContact } from '../storage/contactStorage';
import {
  setRecordingEnabled,
  setRecordingDisclosureSeen,
  setOnboardingComplete,
} from '../storage/settingsStorage';
import { colors } from '../theme/colors';

const DISCLOSURE_TEXT =
  'SmartPocketBuddy offers optional audio recording during Safety Mode. Recording laws vary by state. Use responsibly.';
const LEARN_MORE_URL = 'https://www.aclu.org/know-your-rights/recording-police';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
  route: RouteProp<RootStackParamList, 'Onboarding'>;
};

const STEPS = ['Welcome', 'Emergency Contact', 'Recording', 'Location', "You're ready"];

export function OnboardingScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [recordingOn, setRecordingOn] = useState(true);
  const [locationGranted, setLocationGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const canProceedFromContact = contactName.trim().length > 0 && contactPhone.trim().length > 0;

  useEffect(() => {
    if (step === 3) {
      Location.getForegroundPermissionsAsync().then(({ status }) =>
        setLocationGranted(status === 'granted')
      );
    }
  }, [step]);

  const pickFromContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow contacts access to pick a contact.');
        return;
      }
      const contact = await Contacts.presentContactPickerAsync();
      if (contact?.phoneNumbers?.[0]) {
        const pn = contact.phoneNumbers[0];
        setContactName(contact.name ?? '');
        setContactPhone(pn.number ?? pn.digits ?? '');
      }
    } catch {
      // User cancelled
    }
  };

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
    } catch {
      setLocationGranted(false);
    }
  };

  const handleNext = async () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      if (!canProceedFromContact) return;
      Keyboard.dismiss();
      await saveEmergencyContact({ name: contactName.trim(), phone: contactPhone.trim() });
      setStep(2);
    } else if (step === 2) {
      await setRecordingEnabled(recordingOn);
      await setRecordingDisclosureSeen();
      setStep(3);
    } else if (step === 3) {
      await requestLocation();
      setStep(4);
    } else {
      setLoading(true);
      await setOnboardingComplete();
      setLoading(false);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const openLearnMore = () => {
    Linking.openURL(LEARN_MORE_URL).catch(() => {});
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progress}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i <= step ? theme.primaryAccent : theme.border },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.stepLabel, { color: theme.textMuted }]}>
          Step {step + 1} of {STEPS.length}
        </Text>

        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: theme.text }]}>SmartPocketBuddy</Text>
            <View style={[styles.logoContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.titleSmall, { color: theme.text }]}>Get set up in minutes</Text>
            <Text style={[styles.body, { color: theme.textMuted }]}>
              So when you need help, one tap is all it takes. We'll walk you through 4 quick steps.
            </Text>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: theme.text }]}>Emergency contact</Text>
            <Text style={[styles.body, { color: theme.textMuted }]}>
              This person will receive your location and an alert when you use Safety Mode.
            </Text>
            <TouchableOpacity
              style={[styles.pickButton, { borderColor: theme.border }]}
              onPress={pickFromContacts}
            >
              <Text style={[styles.pickText, { color: theme.primaryAccent }]}>Pick from contacts</Text>
            </TouchableOpacity>
            <Text style={[styles.orLabel, { color: theme.textMuted }]}>Or enter manually</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Name"
              placeholderTextColor={theme.textMuted}
              value={contactName}
              onChangeText={setContactName}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Phone number"
              placeholderTextColor={theme.textMuted}
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: theme.text }]}>Recording</Text>
            <Text style={[styles.body, { color: theme.textMuted }]}>{DISCLOSURE_TEXT}</Text>
            <TouchableOpacity onPress={openLearnMore} style={styles.learnMore}>
              <Text style={[styles.learnMoreText, { color: theme.primaryAccent }]}>Learn more</Text>
            </TouchableOpacity>
            <View style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>Enable recording in Safety Mode</Text>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  { backgroundColor: recordingOn ? theme.primaryAccent : theme.border },
                ]}
                onPress={() => setRecordingOn(!recordingOn)}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    recordingOn && styles.toggleKnobOn,
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: theme.text }]}>Location access</Text>
            <Text style={[styles.body, { color: theme.textMuted }]}>
              Allow location so your emergency contact receives a map link when you use Safety Mode.
            </Text>
            <Button
              title={locationGranted ? 'Location allowed ✓' : 'Allow location access'}
              onPress={requestLocation}
              variant="primary"
              style={styles.allowButton}
            />
            {!locationGranted && (
              <Text style={[styles.hint, { color: theme.textMuted }]}>
                You can enable this later in Settings. Safety Mode will still work.
              </Text>
            )}
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: theme.text }]}>You're all set</Text>
            <Text style={[styles.body, { color: theme.textMuted }]}>
              When you need help, go to Home and tap Safety Mode twice. Your contact will be notified and your location shared.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Button
          title={step === 4 ? 'Get started' : 'Next'}
          onPress={handleNext}
          variant="primary"
          loading={loading}
          disabled={(step === 1 && !canProceedFromContact) || loading}
          style={styles.nextButton}
        />
        {step > 0 && step < 4 && (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={[styles.backText, { color: theme.textMuted }]}>Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 24 },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 32,
    textAlign: 'center',
  },
  stepContent: { flex: 1 },
  titleSmall: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  logoContainer: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  logo: { width: 64, height: 64 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 24, marginBottom: 24 },
  pickButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  pickText: { fontSize: 16, fontWeight: '600' },
  orLabel: { fontSize: 14, marginBottom: 8, color: '#888' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  learnMore: { marginBottom: 24 },
  learnMoreText: { fontSize: 15, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  toggleLabel: { fontSize: 16, flex: 1 },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  allowButton: { marginBottom: 12 },
  hint: { fontSize: 14, marginTop: 8 },
  footer: {
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  nextButton: { width: '100%', marginBottom: 12 },
  backBtn: { alignSelf: 'center', paddingVertical: 8 },
  backText: { fontSize: 16 },
});
