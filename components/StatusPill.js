import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/automotive';

function StatusPill({ connected, recording, hz, label }) {
  return (
    <View style={styles.box}>
      <View style={[styles.dot, { backgroundColor: connected ? colors.green : colors.red }]} />
      <Text style={styles.text}>{label || (connected ? 'ONLINE' : 'OFFLINE')}</Text>
      {hz !== undefined && <Text style={styles.hz}>{hz} Hz</Text>}
      {recording && <Ionicons name="ellipse" size={8} color={colors.red} />}
    </View>
  );
}

export default memo(StatusPill);

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { color: colors.textSoft, fontSize: 11, fontWeight: '900' },
  hz: { color: colors.cyan, fontSize: 11, fontWeight: '900', fontVariant: ['tabular-nums'] },
});
