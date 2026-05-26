import { initialRuntimeState, runtimeReducer } from '../context/runtimeState';

describe('runtime reducer', () => {
  test('tracks performance metrics', () => {
    const state = runtimeReducer(initialRuntimeState, { type: 'packetHz', value: 42 });
    expect(state.packetHz).toBe(42);
    expect(runtimeReducer(state, { type: 'uiHz', value: 9 }).uiHz).toBe(9);
  });

  test('stores bounded app errors and updates status', () => {
    const state = runtimeReducer(initialRuntimeState, {
      type: 'error',
      errorType: 'gateway',
      message: 'Brak polaczenia',
    });
    expect(state.diagStatus).toBe('Brak polaczenia');
    expect(state.appErrors[0]).toMatchObject({ type: 'gateway', message: 'Brak polaczenia' });
  });

  test('toggles performance mode and counts skipped raw frames', () => {
    const perf = runtimeReducer(initialRuntimeState, { type: 'performanceMode', enabled: true });
    expect(perf.performanceMode).toBe(true);
    expect(runtimeReducer(perf, { type: 'rawDropped', count: 3 }).rawDroppedCount).toBe(3);
  });

  test('clears only selected error type after reconnect', () => {
    const gateway = runtimeReducer(initialRuntimeState, {
      type: 'error',
      errorType: 'gateway',
      message: 'Gateway down',
    });
    const database = runtimeReducer(gateway, {
      type: 'error',
      errorType: 'database',
      message: 'DB down',
    });

    const state = runtimeReducer(database, { type: 'clearErrorType', errorType: 'gateway' });
    expect(state.appErrors).toHaveLength(1);
    expect(state.appErrors[0].type).toBe('database');
  });
});
