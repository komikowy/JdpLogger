import React, { useContext, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ResponsiveGrid from '../components/ResponsiveGrid';
import ScreenScaffold from '../components/ScreenScaffold';
import { TelemetryContext } from '../context/TelemetryContext';
import {
  CORE_PID_DEFINITIONS,
  DEFAULT_ALARMS,
  PID_PRESETS,
  SUPPORTED_PID_PROFILES,
} from '../services/telemetry';

export default function SettingsScreen() {
  const {
    selectedPids,
    pidPreset,
    alarmConfig,
    rawTraceEnabled,
    gpsEnabled,
    gpsStatus,
    gatewayUrl,
    rawFrames,
    updateSelectedPids,
    applyPidPreset,
    setRawTrace,
    toggleGps,
    updateAlarm,
    setGatewayAndReconnect,
  } = useContext(TelemetryContext);

  const [gatewayDraft, setGatewayDraft] = useState(gatewayUrl);

  const togglePid = (pid) => {
    const next = selectedPids.includes(pid)
      ? selectedPids.filter((item) => item !== pid)
      : [...selectedPids, pid];
    updateSelectedPids(next);
  };

  return (
    <ScreenScaffold testID="settings-screen">
      <Text style={styles.title}>Konfiguracja</Text>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Gateway</Text>
        <View style={styles.gatewayRow}>
          <TextInput
            value={gatewayDraft}
            onChangeText={setGatewayDraft}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.gatewayInput}
          />
          <TouchableOpacity style={styles.iconButton} onPress={() => setGatewayAndReconnect(gatewayDraft)}>
            <Ionicons name="refresh" size={18} color="#66fcf1" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Presety PID</Text>
        <ResponsiveGrid compact>
          {Object.entries(PID_PRESETS).map(([key, preset]) => (
            <TouchableOpacity
              key={key}
              style={[styles.segmentButton, pidPreset === key && styles.segmentActive]}
              onPress={() => applyPidPreset(key)}
            >
              <Text style={[styles.segmentText, pidPreset === key && styles.segmentTextActive]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ResponsiveGrid>

        <ResponsiveGrid compact>
          {CORE_PID_DEFINITIONS.map((pid) => {
            const active = selectedPids.includes(pid.id);
            const bmwDiesel = SUPPORTED_PID_PROFILES.bmwDiesel.pids.includes(pid.id);
            const bmwGasoline = SUPPORTED_PID_PROFILES.bmwGasoline.pids.includes(pid.id);
            const opelDiesel = SUPPORTED_PID_PROFILES.opelDiesel.pids.includes(pid.id);
            return (
              <TouchableOpacity
                key={pid.id}
                style={[styles.pidButton, active && styles.pidActive]}
                onPress={() => togglePid(pid.id)}
              >
                <Text style={[styles.pidText, active && styles.pidTextActive]}>{pid.label}</Text>
                <View style={styles.pidFooter}>
                  <Text style={styles.pidCode}>{pid.id}</Text>
                  <View style={styles.pidBadges}>
                    {bmwDiesel && <Text style={styles.pidBadge}>BMW</Text>}
                    {!bmwDiesel && bmwGasoline && <Text style={styles.pidBadge}>BENZ</Text>}
                    {opelDiesel && <Text style={styles.pidBadge}>OPEL</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ResponsiveGrid>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Rejestracja</Text>
        <ToggleRow label="Raw CAN trace" value={rawTraceEnabled} onValueChange={setRawTrace} />
        <ToggleRow label="GPS telefonu" value={gpsEnabled} onValueChange={toggleGps} meta={gpsStatus} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Alarmy</Text>
        {Object.entries(DEFAULT_ALARMS).map(([key]) => (
          <AlarmRow key={key} metricKey={key} config={alarmConfig[key]} onChange={updateAlarm} />
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Raw preview</Text>
        {rawFrames.length === 0 && <Text style={styles.emptyText}>Brak ramek</Text>}
        {rawFrames.slice(0, 12).map((frame, index) => (
          <View key={`${frame.timestamp_ms}-${index}`} style={styles.rawRow}>
            <Text style={styles.rawId}>0x{Number(frame.can_id).toString(16).toUpperCase()}</Text>
            <Text style={styles.rawData} selectable>
              {frame.data_hex}
            </Text>
          </View>
        ))}
      </View>
    </ScreenScaffold>
  );
}

function ToggleRow({ label, value, onValueChange, meta }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {!!meta && <Text style={styles.toggleMeta}>{meta}</Text>}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function AlarmRow({ metricKey, config, onChange }) {
  const [highDraft, setHighDraft] = useState(config?.high === undefined ? '' : String(config.high));
  const [lowDraft, setLowDraft] = useState(config?.low === undefined ? '' : String(config.low));

  const commit = (patch) => onChange(metricKey, patch);

  return (
    <View style={styles.alarmRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.alarmKey}>{metricKey}</Text>
        <View style={styles.thresholdRow}>
          <ThresholdInput
            label="LOW"
            value={lowDraft}
            onChangeText={setLowDraft}
            onEndEditing={() => commit({ low: toOptionalNumber(lowDraft) })}
          />
          <ThresholdInput
            label="HIGH"
            value={highDraft}
            onChangeText={setHighDraft}
            onEndEditing={() => commit({ high: toOptionalNumber(highDraft) })}
          />
        </View>
      </View>
      <Switch value={!!config?.enabled} onValueChange={(enabled) => commit({ enabled })} />
    </View>
  );
}

function ThresholdInput({ label, value, onChangeText, onEndEditing }) {
  return (
    <View style={styles.thresholdBox}>
      <Text style={styles.thresholdLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onEndEditing={onEndEditing}
        keyboardType="numeric"
        style={styles.thresholdInput}
      />
    </View>
  );
}

const toOptionalNumber = (value) => {
  if (value === '') return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const styles = StyleSheet.create({
  title: { color: '#f5f7fa', fontSize: 23, fontWeight: '900' },
  panel: {
    backgroundColor: '#111c25',
    borderColor: '#253442',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  panelTitle: { color: '#f5f7fa', fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  gatewayRow: { flexDirection: 'row', gap: 10 },
  gatewayInput: {
    flex: 1,
    backgroundColor: '#081015',
    borderColor: '#253442',
    borderWidth: 1,
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 12,
    minHeight: 42,
  },
  iconButton: {
    width: 48,
    borderColor: '#66fcf1',
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButton: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#253442',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: '#66fcf1', borderColor: '#66fcf1' },
  segmentText: { color: '#d7e1ea', fontWeight: '900', fontSize: 12 },
  segmentTextActive: { color: '#081015' },
  pidButton: {
    minHeight: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#253442',
    padding: 8,
    justifyContent: 'space-between',
  },
  pidActive: { borderColor: '#66fcf1', backgroundColor: '#0d2a2e' },
  pidText: { color: '#8fa1b3', fontSize: 10, fontWeight: '900' },
  pidTextActive: { color: '#66fcf1' },
  pidCode: { color: '#d7e1ea', fontSize: 11, fontWeight: '900' },
  pidFooter: { gap: 5 },
  pidBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pidBadge: {
    color: '#081015',
    backgroundColor: '#f39c12',
    borderRadius: 4,
    overflow: 'hidden',
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontSize: 8,
    fontWeight: '900',
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toggleLabel: { color: '#d7e1ea', fontSize: 14, fontWeight: '800' },
  toggleMeta: { color: '#8fa1b3', fontSize: 11, marginTop: 2 },
  alarmRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#1d2b38',
  },
  alarmKey: { color: '#66fcf1', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  thresholdRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  thresholdBox: { flex: 1 },
  thresholdLabel: { color: '#8fa1b3', fontSize: 9, fontWeight: '900' },
  thresholdInput: {
    backgroundColor: '#081015',
    borderColor: '#253442',
    borderWidth: 1,
    borderRadius: 8,
    color: '#fff',
    minHeight: 36,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  emptyText: { color: '#8fa1b3', fontWeight: '800' },
  rawRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  rawId: { width: 70, color: '#f39c12', fontSize: 11, fontWeight: '900' },
  rawData: { color: '#d7e1ea', fontSize: 11, fontFamily: 'monospace', flex: 1 },
});
