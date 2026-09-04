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

function GlassTooltip({ active, payload, label, yUnit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 px-3.5 py-2.5 text-xs shadow-glass backdrop-blur-xl">
      <div className="mb-1 font-semibold text-ink-muted">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 font-semibold text-ink">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.value}
          {yUnit ? ` ${yUnit}` : ''}
        </div>
      ))}
    </div>
  );
}

/** Soft gradient-filled area chart with a glass tooltip. Animates on load. */
export function MiniAreaChart({
  data,
  series,
  xKey,
  height = 180,
  yUnit,
  showGrid = false,
}: MiniAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: '#9aa3ba', fontWeight: 600 }}
          dy={6}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: '#9aa3ba', fontWeight: 600 }}
          width={38}
          hide={!showGrid}
        />
        <Tooltip
          content={<GlassTooltip yUnit={yUnit} />}
          cursor={{ stroke: 'rgba(63,102,240,0.35)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
        />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2.4}
            fill={`url(#grad-${s.key})`}
            dot={false}
            activeDot={{ r: 4.5, strokeWidth: 2, stroke: '#fff' }}
            animationDuration={1400}
            animationEasing="ease-out"
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
