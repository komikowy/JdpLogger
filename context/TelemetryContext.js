import React, { createContext, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import * as Location from 'expo-location';
import {
  addSessionMarker,
  initDatabase,
  insertAlert,
  insertBulkRawFrames,
  insertBulkRecords,
  insertDebugLog,
  startSession,
  updateSessionMetadata,
} from '../services/database';
import {
  DEFAULT_ALARMS,
  HISTORY_KEYS,
  PID_PRESETS,
  TELEMETRY_KEYS,
  createEmptyTelemetry,
  getAlarmEvents,
  normalizeRawFrame,
  normalizeTelemetry,
} from '../services/telemetry';
import { initialRuntimeState, runtimeReducer } from './runtimeState';

export const TelemetryContext = createContext();

const DEFAULT_WS_URL = 'ws://192.168.4.1:81';
const UI_REFRESH_RATE_MS = 100;
const TELEMETRY_FLUSH_SIZE = 25;
const TELEMETRY_FLUSH_SIZE_PERF = 100;
const RAW_FLUSH_SIZE = 80;
const RAW_FLUSH_SIZE_PERF = 250;
const HISTORY_LIMIT = 80;
const RAW_PREVIEW_LIMIT = 80;
const RAW_PREVIEW_SAMPLE_PERF = 12;
const APP_RUNTIME_RECORD_KEYS = new Set(['packet_hz', 'ui_hz', 'db_flush_count', 'raw_dropped_count']);

export const TelemetryProvider = ({ children }) => {
  const [data, setData] = useState(createEmptyTelemetry());
  const [history, setHistory] = useState(() => createEmptyHistory());
  const [minMax, setMinMax] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [rawFrames, setRawFrames] = useState([]);
  const [runtime, dispatchRuntime] = useReducer(runtimeReducer, initialRuntimeState);

  const [ecuInfo, setEcuInfo] = useState({
    vin: 'Brak danych',
    hw: 'Brak danych',
    sw: 'Brak danych',
    sw_upg: 'Brak danych',
    serial: 'Brak danych',
  });
  const [selectedPids, setSelectedPids] = useState(PID_PRESETS.performance.pids);
  const [pidPreset, setPidPreset] = useState('essential');
  const [alarmConfig, setAlarmConfig] = useState(DEFAULT_ALARMS);
  const [rawTraceEnabled, setRawTraceEnabled] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [location, setLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('GPS off');

  const [gatewayUrl, setGatewayUrl] = useState(DEFAULT_WS_URL);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecordingState] = useState(false);
  const mountedRef = useRef(false);
  const reconnectTimerRef = useRef(null);
  const locationSubscriptionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const currentSessionId = useRef(null);
  const telemetryBuffer = useRef([]);
  const rawBuffer = useRef([]);
  const packetCount = useRef(0);
  const uiUpdateCount = useRef(0);
  const lastHzCheck = useRef(nowMs());
  const lastUiHzCheck = useRef(nowMs());
  const ws = useRef(null);
  const lastUIUpdate = useRef(0);
  const dataRef = useRef(createEmptyTelemetry());
  const runtimeRef = useRef(initialRuntimeState);
  const ecuInfoRef = useRef(ecuInfo);
  const selectedPidsRef = useRef(selectedPids);
  const rawTraceEnabledRef = useRef(rawTraceEnabled);
  const performanceModeRef = useRef(false);
  const rawPreviewSkipRef = useRef(0);
  const locationRef = useRef(null);
  const alarmConfigRef = useRef(alarmConfig);
  const lastAlertRef = useRef({});

  useEffect(() => {
    mountedRef.current = true;
    try {
      initDatabase();
    } catch (err) {
      dispatchRuntime({ type: 'error', errorType: 'database', message: `DB init: ${err.message}` });
    }
    connectWebSocket(gatewayUrl);

    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }
      locationSubscriptionRef.current?.remove?.();
    };
    // WebSocket lifecycle intentionally mounts once; mutable refs carry live state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ecuInfoRef.current = ecuInfo;
    if (currentSessionId.current) {
      updateSessionMetadata(currentSessionId.current, ecuInfo);
    }
  }, [ecuInfo]);

  useEffect(() => {
    selectedPidsRef.current = selectedPids;
  }, [selectedPids]);

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);

  useEffect(() => {
    rawTraceEnabledRef.current = rawTraceEnabled;
  }, [rawTraceEnabled]);

  useEffect(() => {
    performanceModeRef.current = runtime.performanceMode;
  }, [runtime.performanceMode]);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    alarmConfigRef.current = alarmConfig;
  }, [alarmConfig]);

  const connectWebSocket = useCallback(
    (url = gatewayUrl) => {
      clearReconnectTimer();
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        dispatchRuntime({ type: 'clearErrorType', errorType: 'gateway' });
        dispatchRuntime({ type: 'status', value: 'Polaczono' });
        sendRaw(`CFG:${selectedPidsRef.current.join(',')}`);
        sendRaw(`CFG:RAW=${rawTraceEnabledRef.current ? 1 : 0}`);
      };

      ws.current.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        dispatchRuntime({ type: 'status', value: 'Ponowne laczenie' });
        reconnectTimerRef.current = setTimeout(() => connectWebSocket(url), 2000);
      };

      ws.current.onerror = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        dispatchRuntime({ type: 'status', value: 'Gateway WebSocket: ponawiam' });
      };

      ws.current.onmessage = handleMessage;
    },
    // Stable connection callback uses refs for mutable state and recurses with explicit URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleMessage = useCallback((event) => {
    try {
      if (!event.data) return;
      const parsed = JSON.parse(event.data);

      if (parsed.status) {
        dispatchRuntime({ type: 'status', value: parsed.status });
        return;
      }

      if (parsed.debug) {
        insertDebugLog(parsed.debug, currentSessionId.current);
        return;
      }

      if (parsed.raw) {
        handleRawFrame(parsed.raw);
        return;
      }

      if (parsed.vin || parsed.hw || parsed.sw || parsed.sw_upg || parsed.serial) {
        setEcuInfo((prev) => ({
          ...prev,
          vin: parsed.vin || prev.vin,
          hw: parsed.hw || parsed.hw_hex || prev.hw,
          sw: parsed.sw || parsed.sw_hex || prev.sw,
          sw_upg: parsed.sw_upg_hex || parsed.sw_upg || prev.sw_upg,
          serial: parsed.serial || parsed.serial_hex || prev.serial,
        }));
        return;
      }

      handleTelemetry(parsed);
    } catch (err) {
      insertDebugLog(`App Parser Error: ${err.message} | Data: ${event.data}`, currentSessionId.current);
      dispatchRuntime({ type: 'error', errorType: 'parser', message: `Parser: ${err.message}` });
    }
    // Message handler is wired once to WebSocket; downstream state is ref-backed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTelemetry = (parsed) => {
    const receivedAt = nowMs();
    const next = normalizeTelemetry(parsed, dataRef.current);
    dataRef.current = next;

    packetCount.current += 1;
    if (receivedAt - lastHzCheck.current >= 1000) {
      dispatchRuntime({
        type: 'packetHz',
        value: Math.round((packetCount.current * 1000) / (receivedAt - lastHzCheck.current)),
      });
      packetCount.current = 0;
      lastHzCheck.current = receivedAt;
    }

    next.packet_hz = runtimeRef.current.packetHz;
    next.ui_hz = runtimeRef.current.uiHz;
    next.db_flush_count = runtimeRef.current.dbFlushCount;
    next.raw_dropped_count = runtimeRef.current.rawDroppedCount;

    const alertEvents = getAlarmEvents(next, alarmConfigRef.current, lastAlertRef, Date.now());
    if (alertEvents.length > 0) {
      setAlerts((prev) => [...alertEvents, ...prev].slice(0, 30));
      alertEvents.forEach((alert) => insertAlert(currentSessionId.current, alert));
    }

    if (isRecordingRef.current) {
      telemetryBuffer.current.push(makeRecord(next, parsed, locationRef.current));
      if (telemetryBuffer.current.length >= getTelemetryFlushSize()) flushTelemetry();
    }

    if (receivedAt - lastUIUpdate.current > UI_REFRESH_RATE_MS) {
      setData(next);
      setHistory((prev) => appendHistory(prev, next));
      setMinMax((prev) => updateMinMax(prev, next));
      uiUpdateCount.current += 1;
      if (receivedAt - lastUiHzCheck.current >= 1000) {
        dispatchRuntime({
          type: 'uiHz',
          value: Math.round((uiUpdateCount.current * 1000) / (receivedAt - lastUiHzCheck.current)),
        });
        uiUpdateCount.current = 0;
        lastUiHzCheck.current = receivedAt;
      }
      lastUIUpdate.current = receivedAt;
    }
  };

  const handleRawFrame = (raw) => {
    const frame = normalizeRawFrame(raw);
    if (!frame) return;

    if (shouldUpdateRawPreview()) {
      setRawFrames((prev) => [frame, ...prev].slice(0, RAW_PREVIEW_LIMIT));
    } else {
      dispatchRuntime({ type: 'rawDropped' });
    }

    if (isRecordingRef.current && rawTraceEnabledRef.current) {
      rawBuffer.current.push(frame);
      if (rawBuffer.current.length >= getRawFlushSize()) flushRawFrames();
    }
  };

  const startLogging = (description) => {
    try {
      currentSessionId.current = startSession(description, {
        ...ecuInfoRef.current,
        preset: pidPreset,
        selected_pids: selectedPidsRef.current,
        raw_trace_enabled: rawTraceEnabledRef.current,
        app_version: '1.0.0',
        location: locationRef.current,
      });
    } catch (err) {
      dispatchRuntime({ type: 'error', errorType: 'database', message: `DB start: ${err.message}` });
      return;
    }
    telemetryBuffer.current = [];
    rawBuffer.current = [];
    lastAlertRef.current = {};
    setAlerts([]);
    isRecordingRef.current = true;
    setIsRecordingState(true);
  };

  const stopLogging = () => {
    isRecordingRef.current = false;
    setIsRecordingState(false);
    flushTelemetry();
    flushRawFrames();
    try {
      updateSessionMetadata(currentSessionId.current, {
        ...ecuInfoRef.current,
        preset: pidPreset,
        selected_pids: selectedPidsRef.current,
        raw_trace_enabled: rawTraceEnabledRef.current,
        location: locationRef.current,
      });
    } catch (err) {
      dispatchRuntime({ type: 'error', errorType: 'database', message: `DB stop: ${err.message}` });
    }
    currentSessionId.current = null;
  };

  const updateSelectedPids = (newPids) => {
    setSelectedPids(newPids);
    setPidPreset(findPresetForPids(newPids));
    const emptyTelemetry = createEmptyTelemetry();
    dataRef.current = emptyTelemetry;
    setData(emptyTelemetry);
    setHistory(createEmptyHistory());
    setMinMax({});
    sendRaw(`CFG:${newPids.join(',')}`);
  };

  const applyPidPreset = (presetKey) => {
    const preset = PID_PRESETS[presetKey];
    if (!preset) return;
    setPidPreset(presetKey);
    updateSelectedPids(preset.pids);
  };

  const setRawTrace = (enabled) => {
    setRawTraceEnabled(enabled);
    sendRaw(`CFG:RAW=${enabled ? 1 : 0}`);
  };

  const setGatewayAndReconnect = (url) => {
    const nextUrl = url?.trim() || DEFAULT_WS_URL;
    setGatewayUrl(nextUrl);
    connectWebSocket(nextUrl);
  };

  const sendCommand = (cmd) => {
    if (!sendRaw(`CMD:${cmd}`)) {
      dispatchRuntime({ type: 'error', errorType: 'gateway', message: 'Brak polaczenia' });
      return false;
    }
    dispatchRuntime({ type: 'status', value: `Wyslano: ${cmd}` });
    return true;
  };

  const addMarker = (label = 'Marker', note = null) => {
    if (!currentSessionId.current) return false;
    addSessionMarker(currentSessionId.current, label, note);
    return true;
  };

  const toggleGps = async (enabled) => {
    setGpsEnabled(enabled);

    if (!enabled) {
      locationSubscriptionRef.current?.remove?.();
      locationSubscriptionRef.current = null;
      setGpsStatus('GPS off');
      setLocation(null);
      return;
    }

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setGpsEnabled(false);
      setGpsStatus('Brak zgody GPS');
      dispatchRuntime({ type: 'error', errorType: 'gps', message: 'Brak zgody GPS' });
      return;
    }

    setGpsStatus('GPS szuka');
    locationSubscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 1000,
        distanceInterval: 0,
      },
      (nextLocation) => {
        setLocation(nextLocation);
        setGpsStatus('GPS aktywny');
      }
    );
  };

  const updateAlarm = (key, patch) => {
    setAlarmConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }));
  };

  const flushTelemetry = () => {
    if (telemetryBuffer.current.length === 0) return;
    try {
      insertBulkRecords(currentSessionId.current, [...telemetryBuffer.current]);
      telemetryBuffer.current = [];
      dispatchRuntime({ type: 'dbFlush' });
    } catch (err) {
      dispatchRuntime({ type: 'error', errorType: 'database', message: `DB telemetry: ${err.message}` });
    }
  };

  const flushRawFrames = () => {
    if (rawBuffer.current.length === 0) return;
    try {
      insertBulkRawFrames(currentSessionId.current, [...rawBuffer.current]);
      rawBuffer.current = [];
      dispatchRuntime({ type: 'dbFlush' });
    } catch (err) {
      dispatchRuntime({ type: 'error', errorType: 'database', message: `DB raw: ${err.message}` });
    }
  };

  const getTelemetryFlushSize = () =>
    performanceModeRef.current ? TELEMETRY_FLUSH_SIZE_PERF : TELEMETRY_FLUSH_SIZE;

  const getRawFlushSize = () => (performanceModeRef.current ? RAW_FLUSH_SIZE_PERF : RAW_FLUSH_SIZE);

  const shouldUpdateRawPreview = () => {
    if (!performanceModeRef.current || !isRecordingRef.current) return true;
    rawPreviewSkipRef.current += 1;
    return rawPreviewSkipRef.current % RAW_PREVIEW_SAMPLE_PERF === 0;
  };

  const setPerformanceMode = (enabled) => {
    dispatchRuntime({ type: 'performanceMode', enabled });
  };

  const clearReconnectTimer = () => {
    if (!reconnectTimerRef.current) return;
    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  };

  const sendRaw = (message) => {
    if (ws.current?.readyState !== WebSocket.OPEN) return false;
    ws.current.send(message);
    return true;
  };

  return (
    <TelemetryContext.Provider
      value={{
        data,
        history,
        minMax,
        alerts,
        rawFrames,
        isConnected,
        isRecording,
        hz: runtime.packetHz,
        packetHz: runtime.packetHz,
        uiHz: runtime.uiHz,
        appErrors: runtime.appErrors,
        dbFlushCount: runtime.dbFlushCount,
        rawDroppedCount: runtime.rawDroppedCount,
        performanceMode: runtime.performanceMode,
        ecuInfo,
        diagStatus: runtime.diagStatus,
        selectedPids,
        pidPreset,
        alarmConfig,
        rawTraceEnabled,
        gpsEnabled,
        gpsStatus,
        location,
        gatewayUrl,
        startLogging,
        stopLogging,
        updateSelectedPids,
        applyPidPreset,
        sendCommand,
        addMarker,
        setRawTrace,
        toggleGps,
        updateAlarm,
        setGatewayAndReconnect,
        setPerformanceMode,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

const makeRecord = (data, rawPayload, location) => {
  const record = {
    timestamp: new Date().toISOString(),
    gps_lat: location?.coords?.latitude ?? null,
    gps_lon: location?.coords?.longitude ?? null,
    gps_speed: location?.coords?.speed ?? null,
    gps_accuracy: location?.coords?.accuracy ?? null,
    raw_json: JSON.stringify(rawPayload),
  };

  TELEMETRY_KEYS.forEach((key) => {
    record[key] = rawPayload[key] !== undefined || APP_RUNTIME_RECORD_KEYS.has(key) ? data[key] : null;
  });

  return record;
};

const createEmptyHistory = () => {
  const history = {};
  HISTORY_KEYS.forEach((key) => {
    history[key] = [];
  });
  return history;
};

const appendHistory = (previous, data) => {
  const next = { ...previous };
  HISTORY_KEYS.forEach((key) => {
    const value = data[key];
    if (value === null || value === undefined) return;
    next[key] = [...(next[key] || []), value].slice(-HISTORY_LIMIT);
  });
  return next;
};

const updateMinMax = (previous, data) => {
  const next = { ...previous };
  HISTORY_KEYS.forEach((key) => {
    const value = data[key];
    if (value === null || value === undefined || Number.isNaN(value)) return;
    const current = next[key] || { min: value, max: value };
    next[key] = {
      min: Math.min(current.min, value),
      max: Math.max(current.max, value),
    };
  });
  return next;
};

const findPresetForPids = (pids) => {
  const joined = [...pids].sort().join(',');
  const match = Object.entries(PID_PRESETS).find(
    ([, preset]) => [...preset.pids].sort().join(',') === joined
  );
  return match?.[0] || 'custom';
};

const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
