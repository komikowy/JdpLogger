import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../theme/automotive';

export default function SectionPanel({ title, meta, children, style, contentStyle, testID }) {
  return (
    <View testID={testID} style={[styles.panel, style]}>
      {!!title && (
        <View style={styles.header}>
          <Text style={typography.section}>{title}</Text>
          {!!meta && (
            <Text style={styles.meta} selectable>
              {meta}
            </Text>
          )}
        </View>
      )}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.panel,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  content: { gap: spacing.sm },
  meta: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
});
