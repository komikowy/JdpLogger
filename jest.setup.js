jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }) => React.createElement(Text, { accessibilityLabel: name }, ''),
  };
});

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
}));

jest.mock('expo-sqlite', () => {
  const statement = { executeSync: jest.fn(), finalizeSync: jest.fn() };
  const db = {
    execSync: jest.fn(),
    runSync: jest.fn(() => ({ lastInsertRowId: 1 })),
    getAllSync: jest.fn(() => []),
    getFirstSync: jest.fn(() => null),
    prepareSync: jest.fn(() => statement),
    withTransactionSync: jest.fn((callback) => callback()),
  };
  return { openDatabaseSync: jest.fn(() => db) };
});

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///tmp/',
  writeAsStringAsync: jest.fn(async () => undefined),
}));
