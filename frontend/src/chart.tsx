import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// Colors come from CSS custom properties so the chart follows the light/dark theme.
export default function AttendanceChart({ days }: { days: { date: string; count: number }[] }) {
  return <ResponsiveContainer width="100%" height="100%" minWidth={0}>
    <BarChart data={days} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
      <CartesianGrid vertical={false} style={{ stroke: 'var(--line)' }} />
      <XAxis dataKey="date" tickFormatter={value => value.slice(5)} tick={{ fontSize: 12, style: { fill: 'var(--muted)' } }}
        axisLine={{ style: { stroke: 'var(--line)' } }} tickLine={false} />
      <YAxis allowDecimals={false} domain={[0, (maximum: number) => Math.max(1, maximum)]}
        tick={{ fontSize: 12, style: { fill: 'var(--muted)' } }} axisLine={false} tickLine={false} />
      <Tooltip labelFormatter={value => String(value)} formatter={value => [value, 'Check-ins']}
        cursor={{ style: { fill: 'var(--hover)' } }}
        contentStyle={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)' }} />
      <Bar dataKey="count" maxBarSize={42} radius={[6, 6, 0, 0]} style={{ fill: 'var(--accent)' }} />
    </BarChart>
  </ResponsiveContainer>
}
