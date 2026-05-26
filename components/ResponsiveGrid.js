import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useResponsiveGrid } from '../utils/responsive';

export default function ResponsiveGrid({ children, compact = false, gap = 10, style }) {
  const { itemStyle } = useResponsiveGrid({ compact, gap });
  return (
    <View style={[styles.grid, { marginRight: -gap, marginBottom: -gap }, style]}>
      {React.Children.map(children, (child) => (
        <View style={itemStyle}>{child}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
