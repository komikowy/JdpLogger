import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TelemetryProvider } from './context/TelemetryContext';
import DashboardScreen from './screens/DashboardScreen';
import DiagnosticsScreen from './screens/DiagnosticsScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import { colors } from './theme/automotive';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const JDTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.cyan,
    background: colors.bg,
    card: colors.surface,
    text: colors.textSoft,
    border: colors.border,
  },
};

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <TelemetryProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <AppNavigator />
      </TelemetryProvider>
    </SafeAreaProvider>
  );
}

function AppNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <NavigationContainer theme={JDTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={getTabIcon(route.name, focused)} size={size} color={color} />
          ),
          tabBarActiveTintColor: colors.cyan,
          tabBarInactiveTintColor: '#85929e',
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 6),
            paddingTop: 6,
            height: 58 + Math.max(insets.bottom, 6),
            backgroundColor: colors.surface,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
        })}
      >
        <Tab.Screen name="Live" component={LiveStack} />
        <Tab.Screen name="OBD" component={ObdStack} />
        <Tab.Screen name="Historia" component={HistoryStack} />
        <Tab.Screen name="Setup" component={SetupStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const stackOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
  headerTitleStyle: { fontWeight: '900' },
};

function LiveStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen
        name="LiveDashboard"
        component={DashboardScreen}
        options={{ title: 'JD Performance Live' }}
      />
    </Stack.Navigator>
  );
}

function ObdStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen
        name="ObdDiagnostics"
        component={DiagnosticsScreen}
        options={{ title: 'Diagnostyka OBD' }}
      />
    </Stack.Navigator>
  );
}

function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="HistoryList" component={HistoryScreen} options={{ title: 'Historia logow' }} />
    </Stack.Navigator>
  );
}

function SetupStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Konfiguracja' }} />
    </Stack.Navigator>
  );
}

function getTabIcon(name, focused) {
  const icons = {
    Live: focused ? 'speedometer' : 'speedometer-outline',
    OBD: focused ? 'hardware-chip' : 'hardware-chip-outline',
    Historia: focused ? 'folder-open' : 'folder-outline',
    Setup: focused ? 'options' : 'options-outline',
  };
  return icons[name] || 'ellipse-outline';
}
