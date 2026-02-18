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
import * as Contacts from 'expo-contacts';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  getEmergencyContact,
  getSecondaryContact,
  getMedicalNotes,
  saveEmergencyContact,
  saveSecondaryContact,
  saveMedicalNotes,
  StoredContact,
} from '../storage/contactStorage';
import { colors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SetupContact'>;
};

export function SetupContactScreen({ navigation }: Props) {
  const [primary, setPrimary] = useState<StoredContact>({ name: '', phone: '' });
  const [secondary, setSecondary] = useState<StoredContact | null>(null);
  const [showSecondary, setShowSecondary] = useState(false);
  const [medicalNotes, setMedicalNotes] = useState('');
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  useEffect(() => {
    const load = async () => {
      const p = await getEmergencyContact();
      const s = await getSecondaryContact();
      const notes = await getMedicalNotes();
      if (p) setPrimary(p);
      if (s) {
        setSecondary(s);
        setShowSecondary(true);
      }
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
      Alert.alert('Required', 'Please enter at least name and phone for your emergency contact.');
      return;
    }
    await saveEmergencyContact(primary);
    await saveSecondaryContact(secondary ?? null);
    await saveMedicalNotes(medicalNotes);
    navigation.goBack();
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
          This person will receive your location and an alert when you use Safety Mode.
        </Text>

        <TouchableOpacity
          style={[styles.pickButton, { borderColor: theme.border }]}
          onPress={pickFromContacts}
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

        {!showSecondary ? (
          <TouchableOpacity
            style={[styles.addSecondary, { borderColor: theme.border }]}
            onPress={() => setShowSecondary(true)}
          >
            <Text style={[styles.addSecondaryText, { color: theme.primary }]}>
              + Add second contact (optional)
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={[styles.label, { color: theme.textMuted }]}>Second contact (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Name"
              placeholderTextColor={theme.textMuted}
              value={secondary?.name ?? ''}
              onChangeText={(t) =>
                setSecondary((s) => ({ ...(s ?? { name: '', phone: '' }), name: t }))
              }
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Phone"
              placeholderTextColor={theme.textMuted}
              value={secondary?.phone ?? ''}
              onChangeText={(t) =>
                setSecondary((s) => ({ ...(s ?? { name: '', phone: '' }), phone: t }))
              }
              keyboardType="phone-pad"
            />
            <TouchableOpacity onPress={() => setShowSecondary(false)}>
              <Text style={[styles.removeSecondary, { color: theme.textMuted }]}>
                Remove second contact
              </Text>
            </TouchableOpacity>
          </>
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

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            Keyboard.dismiss();
            save();
          }}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
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
  removeSecondary: { fontSize: 14, marginBottom: 24 },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});
