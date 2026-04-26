import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { InlineError } from '../components/InlineError';
import { useToast } from '../components/Toast';
import * as Contacts from 'expo-contacts';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  getEmergencyContact,
  getAdditionalContacts,
  getMedicalNotes,
  saveEmergencyContact,
  saveAdditionalContacts,
  saveMedicalNotes,
  StoredContact,
  MAX_ADDITIONAL_CONTACTS,
} from '../storage/contactStorage';
import { trackEvent, trackError } from '../lib/analytics';
import { retryAsync } from '../utils/retry';
import { colors } from '../theme/colors';
import { Button } from '../components/Button';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SetupContact'>;
};

export function SetupContactScreen({ navigation }: Props) {
  const toast = useToast();
  const [primary, setPrimary] = useState<StoredContact>({ name: '', phone: '' });
  const [additional, setAdditional] = useState<StoredContact[]>([]);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  useEffect(() => {
    const load = async () => {
      const p = await getEmergencyContact();
      const add = await getAdditionalContacts();
      const notes = await getMedicalNotes();
      if (p) setPrimary(p);
      setAdditional(add);
      setMedicalNotes(notes);
    };
    load();
  }, []);

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
        setPrimary({
          name: contact.name ?? '',
          phone: pn.number ?? pn.digits ?? '',
        });
      }
    } catch (e) {
      // User cancelled - no action needed
    }
  };

  const save = async () => {
    if (!primary.name.trim() || !primary.phone.trim()) {
      setValidationError('Please enter at least name and phone for your emergency contact.');
      return;
    }
    setValidationError(null);
    setSaving(true);
    try {
      await retryAsync(async () => {
        await saveEmergencyContact(primary);
        await saveAdditionalContacts(additional);
        await saveMedicalNotes(medicalNotes);
      });
      trackEvent('contact.save_success', { additionalCount: additional.length });
      navigation.goBack();
    } catch (e) {
      trackError('contact.save_failed', e);
      toast.show({ type: 'error', message: 'Could not save contacts. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={true}
      >
        <Text style={[styles.title, { color: theme.text }]}>Emergency Contact</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Primary first, then trusted contacts in order—same list for Safety, Travel, and Kid Track alerts.
        </Text>

        <TouchableOpacity
          style={[styles.pickButton, { borderColor: theme.border }]}
          onPress={pickFromContacts}
          accessibilityRole="button"
          accessibilityLabel="Pick from contacts"
        >
          <Text style={[styles.pickButtonText, { color: theme.primary }]}>
            Pick from contacts
          </Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: theme.textMuted }]}>Or enter manually</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder="Name"
          placeholderTextColor={theme.textMuted}
          value={primary.name}
          onChangeText={(t) => setPrimary((p) => ({ ...p, name: t }))}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => {}}
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder="Phone number"
          placeholderTextColor={theme.textMuted}
          value={primary.phone}
          onChangeText={(t) => setPrimary((p) => ({ ...p, phone: t }))}
          keyboardType="phone-pad"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
        <InlineError message={validationError} />

        {additional.map((row, index) => (
          <View key={`add-${index}`}>
            <Text style={[styles.label, { color: theme.textMuted }]}>
              Trusted contact {index + 1} (optional, priority {index + 2})
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Name"
              placeholderTextColor={theme.textMuted}
              value={row.name}
              onChangeText={(t) =>
                setAdditional((prev) =>
                  prev.map((c, i) => (i === index ? { ...c, name: t } : c))
                )
              }
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Phone"
              placeholderTextColor={theme.textMuted}
              value={row.phone}
              onChangeText={(t) =>
                setAdditional((prev) =>
                  prev.map((c, i) => (i === index ? { ...c, phone: t } : c))
                )
              }
              keyboardType="phone-pad"
            />
            <View style={styles.additionalActions}>
              {index > 0 && (
                <TouchableOpacity
                  onPress={() =>
                    setAdditional((prev) => {
                      const next = [...prev];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      return next;
                    })
                  }
                >
                  <Text style={[styles.reorderText, { color: theme.primary }]}>Move up</Text>
                </TouchableOpacity>
              )}
              {index < additional.length - 1 && (
                <TouchableOpacity
                  onPress={() =>
                    setAdditional((prev) => {
                      const next = [...prev];
                      [next[index], next[index + 1]] = [next[index + 1], next[index]];
                      return next;
                    })
                  }
                >
                  <Text style={[styles.reorderText, { color: theme.primary }]}>Move down</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setAdditional((prev) => prev.filter((_, i) => i !== index))}
              >
                <Text style={[styles.removeSecondary, { color: theme.textMuted }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {additional.length < MAX_ADDITIONAL_CONTACTS && (
          <TouchableOpacity
            style={[styles.addSecondary, { borderColor: theme.border }]}
            onPress={() =>
              setAdditional((prev) => [...prev, { name: '', phone: '' }].slice(0, MAX_ADDITIONAL_CONTACTS))
            }
          >
            <Text style={[styles.addSecondaryText, { color: theme.primary }]}>
              + Add trusted contact (up to {MAX_ADDITIONAL_CONTACTS})
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.label, { color: theme.textMuted }]}>Medical notes (optional)</Text>
        <TextInput
          style={[
            styles.input,
            styles.notesInput,
            { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border },
          ]}
          placeholder="Allergies, conditions, medications—shared only when you send an alert"
          placeholderTextColor={theme.textMuted}
          value={medicalNotes}
          onChangeText={setMedicalNotes}
          multiline
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={Keyboard.dismiss}
        />

        <Button
          title="Save"
          onPress={() => {
            Keyboard.dismiss();
            save();
          }}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
          textStyle={styles.saveButtonText}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 120, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '600' },
  subtitle: { fontSize: 15, marginTop: 8, marginBottom: 24 },
  pickButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  pickButtonText: { fontSize: 16, fontWeight: '500' },
  label: { fontSize: 14, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  addSecondary: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addSecondaryText: { fontSize: 15 },
  removeSecondary: { fontSize: 14, marginBottom: 8 },
  additionalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  reorderText: { fontSize: 14, fontWeight: '600' },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});
