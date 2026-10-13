import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export function RevenueChart({ data }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-zinc-700">Monthly revenue</h2>
        <span className="text-xs text-zinc-500">$K</span>
      </div>
      <div className="mt-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid stroke="#f4f4f5" vertical={false} />
            <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#18181b', border: 0, borderRadius: 6, fontSize: 12 }}
              itemStyle={{ color: '#fafafa' }}
              labelStyle={{ color: '#a1a1aa' }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
