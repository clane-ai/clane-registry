// Tabbed dashboard — multi-file template.
// Demonstrates: ./KPICards, ./RevenueChart, ./CustomerList sibling
// imports; a shared Sidebar; tab switching; mock data baked into the
// entry so the demo is self-contained.
//
// Adapt this for any "left nav + main content with tabs" shape:
// admin panels, customer 360, settings, analytics overviews.

import { useState } from 'react';
import { LayoutGrid, Users, TrendingUp, Settings } from 'lucide-react';
import clsx from 'clsx';
import { KPICards } from './KPICards';
import { RevenueChart } from './RevenueChart';
import { CustomerList } from './CustomerList';
import { customers, revenueByMonth } from './mockData';

const SECTIONS = [
  { id: 'overview',  label: 'Overview',  icon: LayoutGrid },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'revenue',   label: 'Revenue',   icon: TrendingUp },
  { id: 'settings',  label: 'Settings',  icon: Settings },
];

export default function App() {
  const [active, setActive] = useState('overview');

  return (
    <div className="grid min-h-screen grid-cols-[200px_1fr] bg-zinc-50">
      <aside className="border-r border-zinc-200 bg-white p-4">
        <div className="px-2 pb-4 font-serif text-lg font-semibold text-zinc-900">Atlas</div>
        <nav className="space-y-0.5">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={clsx(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition',
                  active === s.id
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                )}
              >
                <Icon size={15} />
                {s.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="overflow-y-auto p-8">
        {active === 'overview' && (
          <div className="space-y-6">
            <header>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-zinc-900">Overview</h1>
              <p className="mt-1 text-sm text-zinc-500">Key metrics across the business · FY26 YTD</p>
            </header>
            <KPICards customers={customers} />
            <RevenueChart data={revenueByMonth} />
          </div>
        )}

        {active === 'customers' && (
          <div className="space-y-6">
            <header>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-zinc-900">Customers</h1>
              <p className="mt-1 text-sm text-zinc-500">{customers.length} accounts · sortable, filterable</p>
            </header>
            <CustomerList customers={customers} />
          </div>
        )}

        {active === 'revenue' && (
          <div className="space-y-6">
            <header>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-zinc-900">Revenue</h1>
            </header>
            <RevenueChart data={revenueByMonth} />
          </div>
        )}

        {active === 'settings' && (
          <div className="rounded-md border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
            Settings panel — customize as needed.
          </div>
        )}
      </main>
    </div>
  );
}
