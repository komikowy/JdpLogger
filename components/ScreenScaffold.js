import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/automotive';

export default function ScreenScaffold({ children, scroll = true, style, contentStyle, testID }) {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(spacing.lg, insets.top + spacing.sm);
  const paddingBottom = Math.max(spacing.xl, insets.bottom + spacing.lg);
  const composedContent = [styles.content, { paddingTop, paddingBottom }, contentStyle];

  if (!scroll) {
    return (
      <View testID={testID} style={[styles.container, style]}>
        <View style={composedContent}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      testID={testID}
      style={[styles.container, style]}
      contentContainerStyle={composedContent}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
});
