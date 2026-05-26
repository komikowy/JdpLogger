import {
  PID_PRESETS,
  HISTORY_KEYS,
  SUPPORTED_PID_PROFILES,
  createEmptyTelemetry,
  formatValue,
  getAlarmEvents,
  getDefinition,
  normalizeRawFrame,
  normalizeTelemetry,
} from '../services/telemetry';

describe('telemetry helpers', () => {
  test('exposes only the three production presets', () => {
    expect(Object.keys(PID_PRESETS)).toEqual(['aftertreatment', 'performance', 'temperatures']);
    expect(PID_PRESETS.performance.pids).toEqual(expect.arrayContaining(['0C', '0B', '23', '10']));
    expect(PID_PRESETS.aftertreatment.pids).toEqual(expect.arrayContaining(['2C', '2D', '78', '7A']));
    expect(PID_PRESETS.temperatures.pids).toEqual(expect.arrayContaining(['05', '0F', '3C', '5C']));
  });

  test('supported profiles still document Opel aftertreatment availability', () => {
    expect(SUPPORTED_PID_PROFILES.bmwDiesel.pids).not.toEqual(expect.arrayContaining(['5C', '78', '7A']));
    expect(SUPPORTED_PID_PROFILES.opelDiesel.pids).toEqual(expect.arrayContaining(['5C', '78', '7A']));
  });

  test('normalizes telemetry and rejects out-of-range sanitized values', () => {
    const previous = createEmptyTelemetry();
    const next = normalizeTelemetry({ rpm: 812, oil_temp: 260, battery: 14.2 }, previous);
    expect(next.rpm).toBe(812);
    expect(next.battery).toBe(14.2);
    expect(next.oil_temp).toBeNull();
  });

  test('keeps dead and hidden parameters out of logging definitions', () => {
    expect(getDefinition('distance_mil')).toBeUndefined();
    expect(getDefinition('warmups_clear')).toBeUndefined();
    expect(getDefinition('fseries_engine_speed')).toBeUndefined();
    expect(PID_PRESETS.fseriesPassive).toBeUndefined();
    expect(PID_PRESETS.bmwDiesel).toBeUndefined();
  });

  test('restores the broader trend list after removing gauges', () => {
    expect(HISTORY_KEYS).toEqual(
      expect.arrayContaining(['rpm', 'map_press', 'rail', 'maf', 'vss', 'egt', 'oil_temp', 'dpf_diff'])
    );
  });

  test('formats scaled definitions', () => {
    expect(formatValue(29900, getDefinition('rail'))).toBe('299');
    expect(formatValue(null, getDefinition('rpm'))).toBe('--');
  });

  test('normalizes raw CAN frames', () => {
    expect(normalizeRawFrame({ t: 123, id: '0x7E8', data: '03410C00', dir: 'rx' })).toMatchObject({
      timestamp_ms: 123,
      can_id: 0x7e8,
      dlc: 4,
      data_hex: '03410C00',
      direction: 'rx',
    });
  });

  test('builds alarm events with cooldown', () => {
    const ref = { current: {} };
    const events = getAlarmEvents({ battery: 16 }, { battery: { high: 15, enabled: true } }, ref, 10000);
    expect(events).toHaveLength(1);
    expect(
      getAlarmEvents({ battery: 16 }, { battery: { high: 15, enabled: true } }, ref, 10200)
    ).toHaveLength(0);
  });
});
