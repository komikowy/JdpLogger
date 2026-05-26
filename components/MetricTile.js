import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/automotive';
import { TELEMETRY_DEFINITIONS, formatValue, getDefinition } from '../services/telemetry';

function MetricTile({
  metricKey,
  value,
  minMax,
  large = false,
  compact = false,
  accent = colors.cyan,
  footer,
}) {
  const definition = getDefinition(metricKey) || TELEMETRY_DEFINITIONS[0];
  return (
    <View style={[styles.tile, large && styles.large, compact && styles.compact]}>
      <Text style={styles.label} numberOfLines={2}>
        {definition.label}
      </Text>
      <Text style={[styles.value, large && styles.valueLarge, { color: accent }]} selectable>
        {formatValue(value, definition)}
        {!!definition.unit && <Text style={styles.unit}> {definition.unit}</Text>}
      </Text>
      {!!minMax && !compact && (
        <Text style={styles.meta} numberOfLines={1}>
          min {formatValue(minMax.min, definition)} / max {formatValue(minMax.max, definition)}
        </Text>
      )}
      {!!footer && <Text style={styles.meta}>{footer}</Text>}
    </View>
  );
}

export default memo(MetricTile);

const styles = StyleSheet.create({
  tile: {
    minHeight: 92,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  large: { minHeight: 120 },
  compact: { minHeight: 74, padding: spacing.sm },
  label: typography.label,
  value: typography.value,
  valueLarge: { fontSize: 30 },
  unit: { color: colors.textSoft, fontSize: 10, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 10, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
