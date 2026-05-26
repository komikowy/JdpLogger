export const CORE_PID_DEFINITIONS = [
  { id: '0C', key: 'rpm', label: 'RPM', unit: 'rpm', decimals: 0, group: 'core' },
  { id: '0B', key: 'map_press', label: 'MAP absolute', unit: 'mbar', decimals: 0, group: 'air' },
  { id: '23', key: 'rail', label: 'Fuel rail', unit: 'bar', decimals: 0, scale: 0.01, group: 'fuel' },
  { id: '24', key: 'lambda_b1s1', label: 'Lambda B1S1', unit: 'lambda', decimals: 2, group: 'air' },
  { id: '10', key: 'maf', label: 'MAF', unit: 'g/s', decimals: 1, group: 'air' },
  { id: '04', key: 'load', label: 'Engine load', unit: '%', decimals: 0, group: 'core' },
  { id: '11', key: 'throttle', label: 'Throttle PID11', unit: '%', decimals: 0, group: 'air' },
  { id: '49', key: 'accel_d', label: 'Accel D', unit: '%', decimals: 0, group: 'core' },
  { id: '0D', key: 'vss', label: 'Speed', unit: 'km/h', decimals: 0, group: 'core' },
  { id: '05', key: 'ect', label: 'Coolant', unit: 'degC', decimals: 0, group: 'thermal' },
  { id: '0F', key: 'iat', label: 'IAT', unit: 'degC', decimals: 0, group: 'thermal' },
  { id: '78', key: 'egt', label: 'EGT B1', unit: 'degC', decimals: 0, group: 'thermal' },
  { id: '33', key: 'baro', label: 'Baro', unit: 'mbar', decimals: 0, group: 'air' },
  { id: '2C', key: 'egr', label: 'EGR command', unit: '%', decimals: 0, group: 'emissions' },
  { id: '2D', key: 'egr_error', label: 'EGR error', unit: '%', decimals: 0, group: 'emissions' },
  { id: '2F', key: 'fuel_level', label: 'Fuel level', unit: '%', decimals: 0, group: 'fuel' },
  { id: '7A', key: 'dpf_diff', label: 'DPF diff B1', unit: 'mbar', decimals: 1, group: 'emissions' },
  { id: '42', key: 'battery', label: 'ECU voltage', unit: 'V', decimals: 2, group: 'electrical' },
  { id: '3C', key: 'cat_temp_b1s1', label: 'Cat temp B1S1', unit: 'degC', decimals: 0, group: 'thermal' },
  { id: '45', key: 'relative_throttle', label: 'Relative throttle', unit: '%', decimals: 0, group: 'air' },
  { id: '46', key: 'ambient_temp', label: 'Ambient temp', unit: 'degC', decimals: 0, group: 'thermal' },
  { id: '4C', key: 'cmd_throttle', label: 'Throttle actuator', unit: '%', decimals: 0, group: 'air' },
  { id: '5C', key: 'oil_temp', label: 'Oil temp', unit: 'degC', decimals: 0, group: 'thermal' },
  { id: '61', key: 'torque_demand', label: 'Torque demand', unit: '%', decimals: 0, group: 'torque' },
  { id: '62', key: 'torque_actual', label: 'Torque actual', unit: '%', decimals: 0, group: 'torque' },
  { id: '63', key: 'torque_reference', label: 'Torque reference', unit: 'Nm', decimals: 0, group: 'torque' },
];

export const SUPPORTED_PID_PROFILES = {
  bmwGasoline: {
    label: 'BMW gasoline',
    pids: [
      '04',
      '05',
      '0B',
      '0C',
      '0D',
      '0F',
      '10',
      '11',
      '23',
      '2F',
      '33',
      '3C',
      '42',
      '45',
      '46',
      '49',
      '4C',
    ],
  },
  bmwDiesel: {
    label: 'BMW diesel',
    pids: [
      '04',
      '05',
      '0B',
      '0C',
      '0D',
      '0F',
      '10',
      '11',
      '23',
      '24',
      '2C',
      '2D',
      '33',
      '3C',
      '42',
      '45',
      '46',
      '49',
      '4C',
    ],
  },
  opelDiesel: {
    label: 'Opel diesel',
    pids: [
      '04',
      '05',
      '0B',
      '0C',
      '0D',
      '0F',
      '10',
      '11',
      '23',
      '24',
      '2C',
      '2D',
      '2F',
      '33',
      '3C',
      '42',
      '45',
      '46',
      '49',
      '4C',
      '5C',
      '61',
      '62',
      '63',
      '78',
      '7A',
    ],
  },
};

export const SYSTEM_TELEMETRY_DEFINITIONS = [
  { key: 'can_rx_count', label: 'CAN RX', unit: '', decimals: 0, group: 'system' },
  { key: 'can_tx_count', label: 'CAN TX', unit: '', decimals: 0, group: 'system' },
  { key: 'can_error_count', label: 'CAN errors', unit: '', decimals: 0, group: 'system' },
  { key: 'can_tx_error_count', label: 'CAN TX err', unit: '', decimals: 0, group: 'system' },
  { key: 'can_rx_error_count', label: 'CAN RX err', unit: '', decimals: 0, group: 'system' },
  { key: 'can_bus_error_count', label: 'CAN bus err', unit: '', decimals: 0, group: 'system' },
  { key: 'can_tx_failed_count', label: 'CAN TX fail', unit: '', decimals: 0, group: 'system' },
  { key: 'can_rx_missed_count', label: 'CAN RX missed', unit: '', decimals: 0, group: 'system' },
  { key: 'can_arb_lost_count', label: 'CAN arb lost', unit: '', decimals: 0, group: 'system' },
  { key: 'can_state', label: 'TWAI state', unit: '', decimals: 0, group: 'system' },
  { key: 'packet_hz', label: 'Packet Hz', unit: 'Hz', decimals: 0, group: 'system' },
  { key: 'ui_hz', label: 'UI Hz', unit: 'Hz', decimals: 0, group: 'system' },
  { key: 'db_flush_count', label: 'DB flush', unit: '', decimals: 0, group: 'system' },
  { key: 'raw_dropped_count', label: 'RAW skipped', unit: '', decimals: 0, group: 'system' },
];

export const TELEMETRY_DEFINITIONS = [...CORE_PID_DEFINITIONS, ...SYSTEM_TELEMETRY_DEFINITIONS];

export const TELEMETRY_KEYS = TELEMETRY_DEFINITIONS.map((item) => item.key);

export const PID_PRESETS = {
  aftertreatment: {
    label: 'Aftertreatment',
    pids: ['0C', '05', '0F', '2C', '2D', '3C', '78', '7A', '42'],
  },
  performance: {
    label: 'Performance',
    pids: ['0C', '0B', '23', '10', '0D', '11', '49', '42'],
  },
  temperatures: {
    label: 'Temperatures',
    pids: ['0C', '05', '0F', '46', '3C', '5C', '42'],
  },
};

export const DEFAULT_ALARMS = {
  egt: { high: 850, enabled: true },
  ect: { high: 108, enabled: true },
  oil_temp: { high: 125, enabled: true },
  dpf_diff: { high: 300, enabled: false },
  rail: { high: 185000, enabled: false },
  map_press: { high: 3200, enabled: false },
  battery: { low: 11.8, high: 15.0, enabled: true },
};

export const HISTORY_KEYS = [
  'rpm',
  'map_press',
  'rail',
  'maf',
  'vss',
  'egt',
  'oil_temp',
  'dpf_diff',
  'torque_actual',
];

export const createEmptyTelemetry = () => {
  const data = {};
  TELEMETRY_KEYS.forEach((key) => {
    data[key] = null;
  });
  data.rpm = 0;
  data.map_press = 0;
  data.rail = 0;
  data.maf = 0;
  data.load = 0;
  data.throttle = 0;
  data.accel_d = null;
  data.vss = 0;
  data.ect = null;
  data.iat = null;
  data.egt = null;
  data.baro = 0;
  data.egr = 0;
  data.dpf_diff = null;
  data.battery = null;
  data.oil_temp = null;
  data.can_rx_count = 0;
  data.can_tx_count = 0;
  data.can_error_count = 0;
  data.can_tx_error_count = 0;
  data.can_rx_error_count = 0;
  data.can_bus_error_count = 0;
  data.can_tx_failed_count = 0;
  data.can_rx_missed_count = 0;
  data.can_arb_lost_count = 0;
  data.can_state = 0;
  data.packet_hz = 0;
  data.ui_hz = 0;
  data.db_flush_count = 0;
  data.raw_dropped_count = 0;
  data.received_at = null;
  return data;
};

export const normalizeTelemetry = (incoming, previous = createEmptyTelemetry()) => {
  const next = { ...previous };
  const source = { ...incoming };

  if (source.map !== undefined && source.map_press === undefined) {
    source.map_press = source.map;
  }

  if (source.app !== undefined && source.throttle === undefined) {
    source.throttle = source.app;
  }

  TELEMETRY_KEYS.forEach((key) => {
    if (source[key] === undefined) return;
    next[key] = sanitizeTelemetryValue(key, normalizeNumber(source[key]));
  });

  next.received_at = source.t_ms ?? Date.now();
  return next;
};

export const normalizeRawFrame = (raw) => {
  if (!raw || raw.id === undefined || !raw.data) return null;

  return {
    timestamp_ms: raw.t ?? Date.now(),
    can_id: typeof raw.id === 'string' ? parseInt(raw.id, 16) : raw.id,
    is_ext: raw.ext ? 1 : 0,
    dlc: raw.dlc ?? String(raw.data).length / 2,
    data_hex: String(raw.data).toUpperCase(),
    direction: raw.dir || 'rx',
    bus: raw.bus || 'twai',
  };
};

export const formatValue = (value, definition) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';

  const scaled = definition?.scale ? value * definition.scale : value;
  const decimals = definition?.decimals ?? 0;
  return Number(scaled).toFixed(decimals);
};

export const getDefinition = (key) => TELEMETRY_DEFINITIONS.find((item) => item.key === key);

export const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\r\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

export const getAlarmEvents = (data, alarmConfig, lastAlertRef, now = Date.now()) => {
  const events = [];
  const cooldownMs = 5000;

  Object.entries(alarmConfig).forEach(([key, config]) => {
    if (!config?.enabled) return;
    const value = data[key];
    if (value === null || value === undefined || Number.isNaN(value)) return;

    const checks = [
      ['high', config.high, value > config.high],
      ['low', config.low, value < config.low],
    ];

    checks.forEach(([kind, threshold, active]) => {
      if (threshold === undefined || !active) return;
      const alertKey = `${key}:${kind}`;
      if (now - (lastAlertRef.current[alertKey] || 0) < cooldownMs) return;
      lastAlertRef.current[alertKey] = now;

      const definition = getDefinition(key);
      events.push({
        field: key,
        value,
        threshold,
        kind,
        message: `${definition?.label || key} ${kind === 'high' ? '>' : '<'} ${threshold}`,
        timestamp: new Date().toISOString(),
      });
    });
  });

  return events;
};

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (value === true) return 1;
  if (value === false) return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const TELEMETRY_LIMITS = {
  lambda_b1s1: { min: 0.5, max: 2.0 },
  egr_error: { min: -100, max: 100 },
  fuel_level: { min: 0, max: 100 },
  cat_temp_b1s1: { min: -40, max: 1000 },
  relative_throttle: { min: 0, max: 100 },
  cmd_throttle: { min: 0, max: 100 },
  ambient_temp: { min: -40, max: 85 },
  oil_temp: { min: -40, max: 180 },
  torque_demand: { min: -125, max: 130 },
  torque_actual: { min: -125, max: 130 },
  torque_reference: { min: 0, max: 2000 },
};

const sanitizeTelemetryValue = (key, value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const limit = TELEMETRY_LIMITS[key];
  if (!limit) return value;
  if (value < limit.min || value > limit.max) return null;
  return value;
};
