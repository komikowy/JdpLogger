import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/automotive';

export function EmptyState({ title = 'Brak danych', detail }) {
  return (
    <View style={styles.state}>
      <Ionicons name="file-tray-outline" size={22} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {!!detail && <Text style={styles.detail}>{detail}</Text>}
    </View>
  );
}

export function ErrorState({ title = 'Blad', detail }) {
  return (
    <View style={[styles.state, styles.error]}>
      <Ionicons name="warning-outline" size={22} color={colors.redSoft} />
      <Text style={[styles.title, styles.errorTitle]}>{title}</Text>
      {!!detail && (
        <Text style={styles.detail} selectable>
          {detail}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    minHeight: 92,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surfaceDeep,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
  },
  error: { borderColor: colors.red, backgroundColor: '#231416' },
  title: { color: colors.textSoft, fontWeight: '900' },
  errorTitle: { color: colors.redSoft },
  detail: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
