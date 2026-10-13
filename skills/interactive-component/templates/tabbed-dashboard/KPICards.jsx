import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

export function KPICards({ customers }) {
  const total = customers.length;
  const revenue = customers.reduce((s, c) => s + c.ltv, 0);
  const healthy = customers.filter((c) => c.status === 'Healthy').length;
  const avgSat = Math.round(customers.reduce((s, c) => s + c.satisfaction, 0) / customers.length);

  const kpis = [
    { label: 'Total accounts',  value: total,        icon: Users,      delta: '+3' },
    { label: 'Total LTV',       value: `$${(revenue / 1000).toFixed(0)}K`, icon: DollarSign, delta: '+12.4%' },
    { label: 'Healthy',         value: `${healthy} / ${total}`, icon: Activity, delta: '−1' },
    { label: 'Avg satisfaction', value: `${avgSat}%`, icon: TrendingUp, delta: '+2pp' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <div key={k.label} className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{k.label}</span>
              <Icon size={14} className="text-zinc-400" />
            </div>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">{k.value}</p>
            <p className="mt-1 text-xs text-emerald-600 tabular-nums">{k.delta} vs last period</p>
          </div>
        );
      })}
    </div>
  );
}
