import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface SeriesConfig {
  key: string;
  color: string;
  label: string;
}

interface MiniAreaChartProps {
  data: Array<Record<string, number | string>>;
  series: SeriesConfig[];
  xKey: string;
  height?: number;
  yUnit?: string;
  showGrid?: boolean;
}

