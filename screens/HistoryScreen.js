import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import ResponsiveGrid from '../components/ResponsiveGrid';
import { colors, radius, spacing, typography } from '../theme/automotive';
import {
  buildRawCanCsv,
  buildTelemetryCsv,
  getAlertsForSession,
  getAllSessions,
  getDebugLogs,
  getMarkersForSession,
  getRawFramesForSession,
  getRecordsForSession,
  getSessionStats,
} from '../services/database';

export default function HistoryScreen() {
  const [sessions, setSessions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const loadSessions = useCallback(() => {
    setSessions(getAllSessions());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const refresh = () => {
    setRefreshing(true);
    loadSessions();
    setRefreshing(false);
  };

  const exportDebugLogs = async () => {
    const logs = getDebugLogs();
    if (logs.length === 0) {
      Alert.alert('Debug', 'Brak logów systemowych.');
      return;
    }

    const text = [
      '=== JDP PERFORMANCE DEBUG LOG ===',
      `Wygenerowano: ${new Date().toLocaleString()}`,
      '',
      ...logs.map((log) => `[${log.timestamp}] Session#${log.session_id || 'Global'}: ${log.message}`),
      '',
    ].join('\n');

    await shareTextFile('jdp_debug_log.txt', text, 'text/plain', 'Eksportuj debug');
  };

  const exportTelemetry = async (session) => {
    const records = getRecordsForSession(session.id);
    if (records.length === 0) {
      Alert.alert('CSV', 'Sesja nie zawiera rekordów telemetrii.');
      return;
    }
    await shareTextFile(
      `JDP_TELEMETRY_${session.id}.csv`,
      buildTelemetryCsv(records),
      'text/csv',
      session.description
    );
  };

  const exportRaw = async (session) => {
    const frames = getRawFramesForSession(session.id);
    if (frames.length === 0) {
      Alert.alert('Raw CAN', 'Sesja nie zawiera ramek raw CAN.');
      return;
    }
    await shareTextFile(
      `JDP_RAW_CAN_${session.id}.csv`,
      buildRawCanCsv(frames),
      'text/csv',
      session.description
    );
  };

  const exportSummary = async (session) => {
    const stats = getSessionStats(session.id);
    const markers = getMarkersForSession(session.id);
    const alerts = getAlertsForSession(session.id);
    const lines = [
      '=== JDP PERFORMANCE - PODSUMOWANIE SESJI ===',
      `Sesja: ${session.description}`,
      `Start: ${session.timestamp}`,
      `VIN: ${session.vin || 'Brak'}`,
      `HW: ${session.hw || 'Brak'}`,
      `SW: ${session.sw || 'Brak'}`,
      `Rekordy: ${stats?.count || 0}`,
      `Raw CAN: ${session.raw_count || 0}`,
      `Alarmy: ${session.alert_count || 0}`,
      '',
      '--- MARKERY ---',
      ...(markers.length
        ? markers.map(
            (marker) => `[${marker.timestamp}] ${marker.label}${marker.note ? ` - ${marker.note}` : ''}`
          )
        : ['Brak']),
      '',
      '--- ALARMY ---',
      ...(alerts.length
        ? alerts.map((alert) => `[${alert.timestamp}] ${alert.message} (${alert.value})`)
        : ['Brak']),
      '',
    ];

    await shareTextFile(`JDP_SUMMARY_${session.id}.txt`, lines.join('\n'), 'text/plain', session.description);
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(16, insets.top + 8) }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Historia</Text>
        <TouchableOpacity style={styles.debugButton} onPress={exportDebugLogs}>
          <Ionicons name="bug" size={16} color="#66fcf1" />
          <Text style={styles.debugText}>Debug</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={refresh}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(32, insets.bottom + 16) }]}
        ListEmptyComponent={<Text style={styles.emptyText}>Brak sesji</Text>}
        renderItem={({ item }) => (
          <View style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionDesc} selectable>
                  {item.description}
                </Text>
                <Text style={styles.sessionDate} selectable>
                  {item.timestamp}
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{item.record_count || 0}</Text>
              </View>
            </View>

            <ResponsiveGrid compact gap={8}>
              <Meta label="VIN" value={item.vin || '--'} />
              <Meta label="Raw" value={String(item.raw_count || 0)} />
              <Meta label="Alarmy" value={String(item.alert_count || 0)} />
              <Meta label="Preset" value={item.preset || '--'} />
            </ResponsiveGrid>

            <View style={styles.actions}>
              <Action label="CSV" icon="download" onPress={() => exportTelemetry(item)} />
              <Action label="Raw" icon="pulse" onPress={() => exportRaw(item)} />
              <Action label="TXT" icon="document-text" onPress={() => exportSummary(item)} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

function Meta({ label, value }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1} selectable>
        {value}
      </Text>
    </View>
  );
}

function Action({ label, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <Ionicons name={icon} size={16} color="#081015" />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const shareTextFile = async (fileName, content, mimeType, dialogTitle) => {
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  try {
    await FileSystem.writeAsStringAsync(fileUri, content);
    await Sharing.shareAsync(fileUri, { mimeType, dialogTitle });
  } catch (err) {
    Alert.alert('Błąd eksportu', err.message);
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: typography.title,
  debugButton: {
    borderColor: colors.cyan,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.surface,
  },
  debugText: { color: colors.cyan, fontWeight: '900', fontSize: 12 },
  listContent: { gap: 12 },
  emptyText: { color: colors.textMuted, fontWeight: '800', textAlign: 'center', marginTop: 40 },
  sessionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    gap: 12,
  },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sessionDesc: { color: colors.cyan, fontSize: 15, fontWeight: '900' },
  sessionDate: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  countBadge: {
    minWidth: 44,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: colors.textSoft, fontWeight: '900', fontVariant: ['tabular-nums'] },
  metaItem: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 8 },
  metaLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  metaValue: { color: colors.textSoft, fontSize: 12, fontWeight: '800', marginTop: 3 },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    backgroundColor: colors.amber,
  },
  actionText: { color: colors.bg, fontWeight: '900', fontSize: 12 },
});
