import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export const getColumnCount = (width, compact = false) => {
  if (width >= 760) return compact ? 4 : 3;
  if (width >= 430) return compact ? 3 : 2;
  return compact ? 2 : 1;
};

export const getGridItemStyle = (width, gap = 10, compact = false) => {
  const columns = getColumnCount(width, compact);
  return {
    width: `${100 / columns}%`,
    maxWidth: `${100 / columns}%`,
    paddingRight: gap,
    paddingBottom: gap,
  };
};

export const useResponsiveGrid = ({ gap = 10, compact = false } = {}) => {
  const { width, height } = useWindowDimensions();
  return useMemo(
    () => ({
      width,
      height,
      columns: getColumnCount(width, compact),
      itemStyle: getGridItemStyle(width, gap, compact),
      isNarrow: width < 380,
      isWide: width >= 760,
    }),
    [compact, gap, height, width]
  );
};

export const formatCompactNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '--';
  if (Math.abs(numeric) >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`;
  if (Math.abs(numeric) >= 10000) return `${Math.round(numeric / 1000)}k`;
  return String(Math.round(numeric));
};
