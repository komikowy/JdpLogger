import React, { useContext } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import ResponsiveGrid from '../components/ResponsiveGrid';
import ScreenScaffold from '../components/ScreenScaffold';
import SectionPanel from '../components/SectionPanel';
import StatusPill from '../components/StatusPill';
import { TelemetryContext } from '../context/TelemetryContext';
import { colors, radius, spacing, typography } from '../theme/automotive';
import { PRIMARY_OBD_FIELDS, buildDiagnosticReport } from '../services/reporting';

export default function DiagnosticsScreen() {
  const { data, ecuInfo, diagStatus, sendCommand, isConnected } = useContext(TelemetryContext);

  const exportDiagnosticReport = async () => {
    const report = buildDiagnosticReport({ ecuInfo, data, diagStatus });
    const safeVin = sanitizeFilePart(ecuInfo.vin).slice(0, 12) || 'NO_VIN';
    const fileUri = `${FileSystem.documentDirectory}JDP_OBD_REPORT_${safeVin}.txt`;

    try {
      await FileSystem.writeAsStringAsync(fileUri, report);
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Eksportuj raport OBD',
      });
    } catch (err) {
      Alert.alert('Blad eksportu', err.message);
    }
  };

  return (
    <ScreenScaffold testID="diagnostics-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>OBD</Text>
          <Text style={styles.subtitle}>Identyfikacja ECU i raport</Text>
        </View>
        <StatusPill connected={isConnected} label={diagStatus} />
      </View>

      <ResponsiveGrid compact>
        <CommandButton label="Info ECU" icon="hardware-chip" onPress={() => sendCommand('IDENTIFY')} />
        <CommandButton label="Raport" icon="document-text" onPress={exportDiagnosticReport} />
      </ResponsiveGrid>

      <SectionPanel title="Identyfikacja OBD">
        <InfoLine label="VIN" value={ecuInfo.vin} />
        <InfoLine label="CAL ID" value={ecuInfo.sw} />
        <InfoLine label="CVN" value={ecuInfo.sw_upg} />
      </SectionPanel>

      <SectionPanel title="Migawka OBD">
        {PRIMARY_OBD_FIELDS.map((field) => (
          <InfoLine key={field.key} label={field.label} value={field.format(data[field.key])} />
        ))}
      </SectionPanel>
    </ScreenScaffold>
  );
}

function CommandButton({ label, icon, onPress, danger = false }) {
  return (
    <TouchableOpacity style={[styles.commandButton, danger && styles.commandDanger]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={danger ? '#ffd0cb' : '#081015'} />
      <Text style={[styles.commandText, danger && styles.commandDangerText]}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoLine({ label, value }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable>
        {value || '--'}
      </Text>
    </View>
  );
}

const sanitizeFilePart = (value) => String(value || '').replace(/[^a-z0-9_-]/gi, '_');

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  title: typography.title,
  subtitle: typography.subtitle,
  commandButton: {
    minHeight: 48,
    backgroundColor: colors.amber,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  commandDanger: {
    backgroundColor: '#311816',
    borderColor: colors.red,
    borderWidth: 1,
  },
  commandText: { color: colors.bg, fontWeight: '900', fontSize: 13 },
  commandDangerText: { color: '#ffd0cb' },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  infoLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  infoValue: { color: colors.textSoft, fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'right' },
});
