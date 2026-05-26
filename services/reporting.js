import { TELEMETRY_KEYS, formatValue, getDefinition } from './telemetry';

export const PRIMARY_OBD_FIELDS = [
  { key: 'rpm', label: 'RPM', format: (value) => formatByKey('rpm', value) },
  { key: 'map_press', label: 'MAP absolute', format: (value) => formatByKey('map_press', value) },
  { key: 'rail', label: 'Fuel rail', format: (value) => formatByKey('rail', value) },
  { key: 'maf', label: 'MAF', format: (value) => formatByKey('maf', value) },
  { key: 'accel_d', label: 'Accel D', format: (value) => formatByKey('accel_d', value) },
  { key: 'vss', label: 'Speed', format: (value) => formatByKey('vss', value) },
  { key: 'ect', label: 'Coolant', format: (value) => formatByKey('ect', value) },
  { key: 'iat', label: 'IAT', format: (value) => formatByKey('iat', value) },
  { key: 'egt', label: 'EGT B1', format: (value) => formatByKey('egt', value) },
  { key: 'dpf_diff', label: 'DPF diff B1', format: (value) => formatByKey('dpf_diff', value) },
  { key: 'oil_temp', label: 'Oil temp', format: (value) => formatByKey('oil_temp', value) },
  { key: 'battery', label: 'ECU voltage', format: (value) => formatByKey('battery', value) },
];

export const buildDiagnosticReport = ({ ecuInfo, data, diagStatus }) => {
  const lines = [];
  lines.push('=== JDP PERFORMANCE - RAPORT OBD-II ===');
  lines.push(`Data: ${new Date().toLocaleString()}`);
  lines.push(`Status: ${diagStatus || 'Brak'}`);
  lines.push('');
  lines.push('--- IDENTYFIKACJA OBD ---');
  lines.push(`VIN: ${ecuInfo.vin || 'Brak'}`);
  lines.push(`CAL ID: ${ecuInfo.sw || 'Brak'}`);
  lines.push(`CVN: ${ecuInfo.sw_upg || 'Brak'}`);
  lines.push('');
  lines.push('--- TELEMETRIA SAE OBD-II ---');
  TELEMETRY_KEYS.forEach((key) => {
    const definition = getDefinition(key);
    lines.push(
      `${definition?.label || key}: ${formatValue(data[key], definition)} ${definition?.unit || ''}`.trim()
    );
  });

  return `${lines.join('\n')}\n`;
};

const formatByKey = (key, value) => {
  const definition = getDefinition(key);
  const formatted = formatValue(value, definition);
  return definition?.unit ? `${formatted} ${definition.unit}` : formatted;
};
