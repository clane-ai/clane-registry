// KPI dashboard with a single bar chart — Recharts pattern.
// Adapt: replace the data + KPI labels for the user's domain.
//
// Pattern: top-row KPI cards + headline chart. Restrained palette
// (zinc neutrals + ONE accent: indigo). No purple gradients.

import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const monthly = [
  { month: 'Jan', revenue: 120, cost: 80 },
  { month: 'Feb', revenue: 145, cost: 88 },
  { month: 'Mar', revenue: 132, cost: 86 },
  { month: 'Apr', revenue: 168, cost: 95 },
  { month: 'May', revenue: 184, cost: 102 },
  { month: 'Jun', revenue: 196, cost: 108 },
  { month: 'Jul', revenue: 215, cost: 115 },
  { month: 'Aug', revenue: 232, cost: 121 },
  { month: 'Sep', revenue: 248, cost: 128 },
  { month: 'Oct', revenue: 267, cost: 135 },
  { month: 'Nov', revenue: 285, cost: 144 },
  { month: 'Dec', revenue: 312, cost: 152 },
];

const fmt = (n) => `$${n.toLocaleString()}K`;

export default function App() {
  const [range, setRange] = useState('YTD');

  const lastMonth = monthly[monthly.length - 1];
  const prevMonth = monthly[monthly.length - 2];
  const ytdRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const ytdCost = monthly.reduce((s, m) => s + m.cost, 0);
  const margin = ((ytdRevenue - ytdCost) / ytdRevenue * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-baseline justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-zinc-900">Revenue overview</h1>
            <p className="mt-1 text-sm text-zinc-500">FY26 · all segments</p>
          </div>
          <div className="flex gap-1 rounded-md bg-white p-1 ring-1 ring-zinc-200">
            {['MTD', 'QTD', 'YTD'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded px-3 py-1 text-xs font-medium transition ${range === r ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Kpi label="Revenue (YTD)" value={fmt(ytdRevenue)} delta="+18.4%" trend="up" icon={DollarSign} />
          <Kpi label="Cost (YTD)" value={fmt(ytdCost)} delta="+9.2%" trend="up" icon={ShoppingCart} muted />
          <Kpi label="Gross margin" value={`${margin}%`} delta="+2.1pp" trend="up" icon={TrendingUp} />
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-zinc-700">Monthly revenue vs cost</h2>
            <span className="text-xs text-zinc-500">$K</span>
          </div>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthly} barCategoryGap={8}>
                <CartesianGrid stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(228, 228, 231, 0.4)' }}
                  contentStyle={{ background: '#18181b', border: 0, borderRadius: 6, fontSize: 12 }}
                  itemStyle={{ color: '#fafafa' }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cost" fill="#e4e4e7" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, delta, trend, icon: Icon, muted = false }) {
  const Trend = trend === 'up' ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
        <Icon size={14} className="text-zinc-400" />
      </div>
      <p className="mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight text-zinc-900">{value}</p>
      <div className={`mt-2 inline-flex items-center gap-1 text-xs ${muted ? 'text-zinc-500' : trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
        <Trend size={12} />
        <span className="tabular-nums">{delta}</span>
        <span className="text-zinc-400">vs last period</span>
      </div>
    </div>
  );
}
