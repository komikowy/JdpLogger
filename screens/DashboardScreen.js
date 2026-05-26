import React, { memo, useContext, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MetricTile from '../components/MetricTile';
import ResponsiveGrid from '../components/ResponsiveGrid';
import ScreenScaffold from '../components/ScreenScaffold';
import SectionPanel from '../components/SectionPanel';
import StatusPill from '../components/StatusPill';
import { EmptyState, ErrorState } from '../components/StateViews';
import { TelemetryContext } from '../context/TelemetryContext';
import { colors, radius, spacing, typography } from '../theme/automotive';
import { HISTORY_KEYS, formatValue, getDefinition } from '../services/telemetry';

const SECONDARY_KEYS = [
  'vss',
  'load',
  'lambda_b1s1',
  'accel_d',
  'relative_throttle',
  'cmd_throttle',
  'ect',
  'iat',
  'ambient_temp',
  'egt',
  'oil_temp',
  'cat_temp_b1s1',
  'baro',
  'egr',
  'egr_error',
  'fuel_level',
  'dpf_diff',
  'torque_demand',
  'torque_actual',
  'torque_reference',
  'battery',
];
const SYSTEM_KEYS = [
  'packet_hz',
  'ui_hz',
  'db_flush_count',
  'raw_dropped_count',
  'can_rx_count',
  'can_tx_count',
  'can_error_count',
  'can_tx_error_count',
  'can_rx_error_count',
  'can_bus_error_count',
  'can_tx_failed_count',
  'can_rx_missed_count',
  'can_arb_lost_count',
  'can_state',
];

export default function DashboardScreen() {
  const {
    data,
    history,
    minMax,
    alerts,
    appErrors,
    isConnected,
    isRecording,
    hz,
    startLogging,
    stopLogging,
    addMarker,
    location,
    gpsEnabled,
    gpsStatus,
  } = useContext(TelemetryContext);

  const [desc, setDesc] = useState('');
  const [markerText, setMarkerText] = useState('');
  const latestError = appErrors?.[0];

  const handleRecordPress = () => {
    if (isRecording) {
      stopLogging();
      return;
    }
    startLogging(desc || 'Sesja drogowa');
    setDesc('');
  };

  const handleMarker = () => {
    if (!isRecording) {
      Alert.alert('Marker', 'Marker mozna dodac tylko w aktywnej sesji.');
      return;
    }
    addMarker(markerText || 'Marker');
    setMarkerText('');
  };

  return (
    <ScreenScaffold testID="dashboard-screen">
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>JD Performance</Text>
          <Text style={styles.subtitle}>CAN/OBD logger automotive</Text>
        </View>
        <StatusPill connected={isConnected} hz={hz} recording={isRecording} />
      </View>

      {!!latestError && <ErrorState title={latestError.type.toUpperCase()} detail={latestError.message} />}

      <View style={styles.recordPanel}>
        <TextInput
          style={styles.input}
          placeholder="Opis sesji"
          placeholderTextColor="#64717f"
          value={desc}
          onChangeText={setDesc}
          editable={!isRecording}
        />
        <TouchableOpacity
          style={[styles.recordButton, isRecording ? styles.stopButton : styles.startButton]}
          onPress={handleRecordPress}
        >
          <Ionicons name={isRecording ? 'stop-circle' : 'radio'} size={20} color={colors.bg} />
          <Text style={styles.recordButtonText}>{isRecording ? 'Stop' : 'Start'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.markerPanel}>
        <TextInput
          style={styles.markerInput}
          placeholder="Marker sesji"
          placeholderTextColor="#64717f"
          value={markerText}
          onChangeText={setMarkerText}
          editable={isRecording}
        />
        <TouchableOpacity
          style={[styles.iconButton, !isRecording && styles.disabledButton]}
          onPress={handleMarker}
          disabled={!isRecording}
        >
          <Ionicons name="flag" size={18} color={isRecording ? colors.cyan : '#56616c'} />
        </TouchableOpacity>
      </View>

      <SectionPanel title="Trend" meta="ostatnie probki">
        {HISTORY_KEYS.length === 0 ? (
          <EmptyState title="Brak historii" />
        ) : (
          HISTORY_KEYS.map((key) => <SparkRow key={key} metricKey={key} values={history[key] || []} />)
        )}
      </SectionPanel>

      {alerts.length > 0 && (
        <SectionPanel title="Alarmy" meta={String(alerts.length)}>
          {alerts.slice(0, 4).map((alert, index) => (
            <Text key={`${alert.timestamp}-${index}`} style={styles.alertText} selectable>
              {alert.message}: {alert.value}
            </Text>
          ))}
        </SectionPanel>
      )}

      <Text style={styles.sectionTitle}>Telemetria</Text>
      <ResponsiveGrid>
        {SECONDARY_KEYS.map((key) => (
          <MetricTile key={key} metricKey={key} value={data[key]} minMax={minMax[key]} />
        ))}
      </ResponsiveGrid>

      <Text style={styles.sectionTitle}>Stan CAN i aplikacji</Text>
      <ResponsiveGrid compact>
        {SYSTEM_KEYS.map((key) => (
          <MetricTile key={key} metricKey={key} value={data[key]} compact />
        ))}
      </ResponsiveGrid>

      <SectionPanel title="Telefon" meta={gpsEnabled ? gpsStatus : 'GPS off'}>
        <InfoLine
          label="Pozycja"
          value={
            location
              ? `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`
              : '--'
          }
        />
      </SectionPanel>
    </ScreenScaffold>
  );
}

const SparkRow = memo(function SparkRow({ metricKey, values }) {
  const definition = getDefinition(metricKey);
  const finiteValues = values.filter((value) => Number.isFinite(value));
  const min = finiteValues.length ? Math.min(...finiteValues) : 0;
  const max = finiteValues.length ? Math.max(...finiteValues) : 1;
  const span = max - min || 1;
  const latest = finiteValues[finiteValues.length - 1];

  return (
    <View style={styles.sparkRow}>
      <Text style={styles.sparkLabel} numberOfLines={1}>
        {definition?.label || metricKey}
      </Text>
      <View style={styles.sparkBars}>
        {finiteValues.slice(-44).map((value, index) => {
          const height = Math.max(4, ((value - min) / span) * 34 + 4);
          return <View key={`${metricKey}-${index}`} style={[styles.sparkBar, { height }]} />;
        })}
      </View>
      <Text style={styles.sparkValue}>{formatValue(latest, definition)}</Text>
    </View>
  );
});

function InfoLine({ label, value }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: { flex: 1 },
  title: typography.title,
  subtitle: typography.subtitle,
  sectionTitle: typography.section,
  recordPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  recordButton: {
    minWidth: 96,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  startButton: { backgroundColor: colors.cyan },
  stopButton: { backgroundColor: colors.redSoft },
  recordButtonText: { color: colors.bg, fontWeight: '900', fontSize: 13 },
  markerPanel: { flexDirection: 'row', gap: spacing.sm },
  markerInput: {
    flex: 1,
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  iconButton: {
    width: 48,
    borderColor: colors.cyan,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  disabledButton: { borderColor: colors.border },
  alertText: { color: colors.redSoft, fontSize: 12, fontWeight: '800' },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 42,
  },
  sparkLabel: { width: 82, color: colors.textSoft, fontSize: 11, fontWeight: '900' },
  sparkBars: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    overflow: 'hidden',
  },
  sparkBar: { width: 3, backgroundColor: colors.cyan, borderRadius: 2, opacity: 0.82 },
  sparkValue: {
    width: 60,
    color: colors.cyan,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  infoLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  infoValue: { color: colors.textSoft, fontSize: 12, fontWeight: '800', flex: 1, textAlign: 'right' },
});
