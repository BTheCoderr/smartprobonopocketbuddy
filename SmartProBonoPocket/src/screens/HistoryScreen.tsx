import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  Linking,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../navigation/types';
import { getSafetyEvents, SafetyEvent, deleteEvent, updateEventLabel } from '../storage/eventStorage';
import { deleteSingleRecording } from '../utils/recordingUtils';
import { SCENARIO_LABELS } from '../constants/guidance';
import { ScenarioType } from '../types';
import { colors } from '../theme/colors';

type Props = BottomTabScreenProps<TabParamList, 'History'>;

export function HistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingEvent, setEditingEvent] = useState<SafetyEvent | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const player = useAudioPlayer(playingUri ?? null);
  const status = useAudioPlayerStatus(player);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  useEffect(() => {
    getSafetyEvents().then(setEvents);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getSafetyEvents().then(setEvents);
    }, [])
  );

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openLocation = (link?: string) => {
    if (link) Linking.openURL(link).catch(() => {});
  };

  const shareRecording = async (uri?: string) => {
    if (!uri) return;
    try {
      const available = await Sharing.isAvailableAsync();
      const mime = uri.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'audio/m4a';
      if (available) await Sharing.shareAsync(uri, { mimeType: mime });
    } catch {
      // User cancelled
    }
  };

  const isVideo = (uri?: string) => uri?.toLowerCase().endsWith('.mp4');

  const refreshEvents = useCallback(() => {
    getSafetyEvents().then(setEvents);
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(events.map((e) => e.id)));
  };

  const clearSelection = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      'Delete selected',
      `Delete ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId('batch');
            try {
              for (const id of selectedIds) {
                const evt = events.find((e) => e.id === id);
                if (evt?.recordingUri) await deleteSingleRecording(evt.recordingUri);
                await deleteEvent(id);
              }
              clearSelection();
              await refreshEvents();
            } catch {
              Alert.alert('Error', 'Could not delete some items.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteRecording = (evt: SafetyEvent) => {
    if (!evt.recordingUri) return;
    Alert.alert(
      'Delete recording',
      'Delete this recording? The event will stay but the recording will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setDeletingId(evt.id);
            deleteSingleRecording(evt.recordingUri!, evt.id)
              .then(refreshEvents)
              .catch(() => Alert.alert('Error', 'Could not delete recording.'))
              .finally(() => setDeletingId(null));
          },
        },
      ]
    );
  };

  const handleRemoveFromHistory = (evt: SafetyEvent) => {
    Alert.alert(
      'Remove from history',
      'Remove this event? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setDeletingId(evt.id);
            const deleteRecording = evt.recordingUri
              ? deleteSingleRecording(evt.recordingUri)
              : Promise.resolve();
            deleteRecording
              .then(() => deleteEvent(evt.id))
              .then(refreshEvents)
              .catch(() => Alert.alert('Error', 'Could not remove.'))
              .finally(() => setDeletingId(null));
          },
        },
      ]
    );
  };

  const openEditName = (evt: SafetyEvent) => {
    setEditingEvent(evt);
    setEditLabel(evt.label ?? SCENARIO_LABELS[evt.scenario as ScenarioType]);
  };

  const saveEditName = async () => {
    if (!editingEvent) return;
    await updateEventLabel(editingEvent.id, editLabel);
    setEditingEvent(null);
    refreshEvents();
  };

  const getEventDisplayName = (evt: SafetyEvent) =>
    evt.label?.trim() || SCENARIO_LABELS[evt.scenario as ScenarioType];

  const playRecording = (uri?: string) => {
    if (!uri) return;
    if (isVideo(uri)) {
      Linking.openURL(uri).catch(() => {});
      return;
    }
    if (playingUri === uri && status.playing) {
      player.pause();
    } else if (playingUri === uri) {
      player.seekTo(0);
      player.play();
    } else {
      setPlayingUri(uri);
      player.replace(uri);
      player.play();
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: 24 + insets.top }]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: theme.text }]}>Safety history</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Last 10 events. Tap location to open maps.
          </Text>
        </View>
        {events.length > 0 && (
          <TouchableOpacity
            style={[styles.selectBtn, { borderColor: theme.border }]}
            onPress={() => (selectMode ? clearSelection() : setSelectMode(true))}
          >
            <Text style={[styles.selectBtnText, { color: theme.primaryAccent }]}>
              {selectMode ? 'Cancel' : 'Select'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {selectMode && (
        <View style={styles.selectBar}>
          <TouchableOpacity
            onPress={() =>
              selectedIds.size === events.length
                ? setSelectedIds(new Set())
                : selectAll()
            }
          >
            <Text style={[styles.selectBarText, { color: theme.primaryAccent }]}>
              {selectedIds.size === events.length ? 'Deselect all' : 'Select all'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteSelected}
            disabled={deletingId === 'batch' || selectedIds.size === 0}
            style={[
              styles.deleteSelectedBtn,
              { backgroundColor: selectedIds.size > 0 ? '#E53935' : theme.border },
            ]}
          >
            <Text
              style={[
                styles.deleteSelectedText,
                { color: selectedIds.size > 0 ? '#FFF' : theme.textMuted },
              ]}
            >
              Delete {selectedIds.size} selected
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {events.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            No events yet. Your safety sessions will appear here.
          </Text>
        </View>
      ) : (
        events.map((evt) => (
          <TouchableOpacity
            key={evt.id}
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
              selectMode && selectedIds.has(evt.id) && styles.cardSelected,
            ]}
            onPress={selectMode ? () => toggleSelect(evt.id) : undefined}
            activeOpacity={selectMode ? 0.7 : 1}
          >
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {getEventDisplayName(evt)}
              </Text>
              {!selectMode && (
                <TouchableOpacity
                  onPress={() => openEditName(evt)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pencil" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {selectMode && (
              <View style={styles.cardCheckRow}>
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: theme.border },
                    selectedIds.has(evt.id) && { backgroundColor: theme.primaryAccent, borderColor: theme.primaryAccent },
                  ]}
                >
                  {selectedIds.has(evt.id) && (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  )}
                </View>
              </View>
            )}
            <Text style={[styles.cardTime, { color: theme.textMuted }]}>
              {formatDate(evt.timestamp)}
            </Text>
            <View style={styles.actionsRow}>
              {evt.locationLink && (
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.border }]}
                  onPress={() => openLocation(evt.locationLink)}
                >
                  <Ionicons name="location-outline" size={20} color={theme.primaryAccent} />
                  <Text style={[styles.actionBtnText, { color: theme.primaryAccent }]}>Location</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { borderColor: theme.border },
                  !evt.recordingUri && styles.actionBtnDisabled,
                ]}
                onPress={() => evt.recordingUri && playRecording(evt.recordingUri)}
                disabled={!evt.recordingUri}
              >
                <Ionicons
                  name={playingUri === evt.recordingUri && status.playing ? 'pause' : 'play'}
                  size={20}
                  color={evt.recordingUri ? theme.primaryAccent : theme.textMuted}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: evt.recordingUri ? theme.primaryAccent : theme.textMuted },
                  ]}
                >
                  Play
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { borderColor: theme.border },
                  !evt.recordingUri && styles.actionBtnDisabled,
                ]}
                onPress={() => evt.recordingUri && shareRecording(evt.recordingUri)}
                disabled={!evt.recordingUri}
              >
                <Ionicons
                  name="share-outline"
                  size={20}
                  color={evt.recordingUri ? theme.primaryAccent : theme.textMuted}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: evt.recordingUri ? theme.primaryAccent : theme.textMuted },
                  ]}
                >
                  Share
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDelete, { borderColor: '#E53935' }]}
                onPress={() => evt.recordingUri && handleDeleteRecording(evt)}
                disabled={!evt.recordingUri || deletingId === evt.id}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={evt.recordingUri ? '#E53935' : theme.textMuted}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: evt.recordingUri ? '#E53935' : theme.textMuted },
                  ]}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => handleRemoveFromHistory(evt)}
              style={styles.deleteEventBtn}
              disabled={deletingId === evt.id}
            >
              <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
              <Text style={[styles.deleteEventText, { color: theme.textMuted }]}>
                Remove from history
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}

      <Modal visible={!!editingEvent} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContentWrap}
          >
            <View style={[styles.editModal, { backgroundColor: theme.surface }]}>
              <Text style={[styles.editModalTitle, { color: theme.text }]}>Name this recording</Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={editLabel}
                onChangeText={setEditLabel}
                placeholder="e.g. Traffic stop on Main St"
                placeholderTextColor={theme.textMuted}
                autoFocus
              />
              <View style={styles.editModalButtons}>
                <TouchableOpacity
                  style={[styles.editModalBtn, { borderColor: theme.border }]}
                  onPress={() => setEditingEvent(null)}
                >
                  <Text style={[styles.editModalBtnText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editModalBtn, { backgroundColor: theme.primaryAccent }]}
                  onPress={saveEditName}
                >
                  <Text style={styles.editModalBtnTextPrimary}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  headerLeft: { flex: 1 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { fontSize: 15, marginTop: 6, marginBottom: 24 },
  selectBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  selectBtnText: { fontSize: 14, fontWeight: '600' },
  selectBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  selectBarText: { fontSize: 15, fontWeight: '600' },
  deleteSelectedBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  deleteSelectedText: { fontSize: 15, fontWeight: '600' },
  cardSelected: { borderWidth: 2, borderColor: '#3FAE9D' },
  cardCheckRow: { marginBottom: 8 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontSize: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '600', flex: 1 },
  cardTime: { fontSize: 14, marginTop: 4 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnDelete: {},
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  linkText: { fontSize: 15, fontWeight: '500' },
  deleteEventBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  deleteEventText: { fontSize: 14, fontWeight: '500' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContentWrap: { alignSelf: 'stretch' },
  editModal: {
    borderRadius: 16,
    padding: 24,
  },
  editModalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  editInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  editModalButtons: { flexDirection: 'row', gap: 12 },
  editModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  editModalBtnText: { fontSize: 16, fontWeight: '600' },
  editModalBtnTextPrimary: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
