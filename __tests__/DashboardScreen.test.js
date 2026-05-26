import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DashboardScreen from '../screens/DashboardScreen';
import { TelemetryContext } from '../context/TelemetryContext';
import { createEmptyTelemetry } from '../services/telemetry';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderDashboard = (overrides = {}) => {
  const data = {
    ...createEmptyTelemetry(),
    rpm: 820,
    map_press: 1010,
    rail: 30000,
    maf: 17.2,
    packet_hz: 20,
    ui_hz: 10,
  };
  const value = {
    data,
    history: { rpm: [780, 800, 820] },
    minMax: {},
    alerts: [],
    appErrors: [],
    isConnected: true,
    isRecording: false,
    hz: 20,
    uiHz: 10,
    performanceMode: false,
    setPerformanceMode: jest.fn(),
    startLogging: jest.fn(),
    stopLogging: jest.fn(),
    addMarker: jest.fn(),
    location: null,
    gpsEnabled: false,
    gpsStatus: 'GPS off',
    ...overrides,
  };

  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <TelemetryContext.Provider value={value}>
        <DashboardScreen />
      </TelemetryContext.Provider>
    </SafeAreaProvider>
  );
};

describe('DashboardScreen', () => {
  test('renders main automotive dashboard status and metrics', () => {
    const screen = renderDashboard();
    expect(screen.getByTestId('dashboard-screen')).toBeTruthy();
    expect(screen.getByText('JD Performance')).toBeTruthy();
    expect(screen.getAllByText(/20 Hz/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('RPM').length).toBeGreaterThan(0);
  });

  test('renders latest app error state', () => {
    const screen = renderDashboard({
      appErrors: [{ type: 'gateway', message: 'Brak polaczenia', timestamp: 'now' }],
      isConnected: false,
    });
    expect(screen.getByText('GATEWAY')).toBeTruthy();
    expect(screen.getByText('Brak polaczenia')).toBeTruthy();
  });
});
