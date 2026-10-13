// Sortable + filterable data table — the "rows of business records"
// shape (customers, orders, transactions, search results).
//
// Pattern: data + filters in state, derived rows via useMemo, sort
// handled by clicking column headers. Use ArrowUpDown / ArrowUp /
// ArrowDown icons from Lucide for the sort indicator.

import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const customers = [
  { id: 'C-1001', name: 'Acme Corp',       segment: 'Enterprise', region: 'NA', ltv: 284500, status: 'Healthy' },
  { id: 'C-1002', name: 'TechNova Ltd',    segment: 'Mid-Market', region: 'EU', ltv: 156200, status: 'At Risk' },
  { id: 'C-1003', name: 'GlobalEdge Inc',  segment: 'Enterprise', region: 'APAC', ltv: 312800, status: 'Healthy' },
  { id: 'C-1004', name: 'StartUp.io',      segment: 'SMB',        region: 'NA', ltv: 42300,  status: 'Healthy' },
  { id: 'C-1005', name: 'RetailMax',       segment: 'Mid-Market', region: 'EU', ltv: 128700, status: 'Churning' },
  { id: 'C-1006', name: 'FinServe Global', segment: 'Enterprise', region: 'NA', ltv: 445000, status: 'Healthy' },
  { id: 'C-1007', name: 'MediCare Plus',   segment: 'Mid-Market', region: 'APAC', ltv: 98500, status: 'At Risk' },
  { id: 'C-1008', name: 'EduLearn Co',     segment: 'SMB',        region: 'EU', ltv: 35600,  status: 'Healthy' },
];

const STATUS_STYLES = {
  Healthy:  'bg-emerald-50 text-emerald-700',
  'At Risk':'bg-amber-50 text-amber-700',
  Churning: 'bg-red-50 text-red-700',
};

export default function App() {
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState('All');
  const [sortBy, setSortBy] = useState({ key: 'ltv', dir: 'desc' });

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    let r = customers.filter((c) =>
      (segment === 'All' || c.segment === segment) &&
      (q === '' || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
    );
    r = [...r].sort((a, b) => {
      const av = a[sortBy.key], bv = b[sortBy.key];
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sortBy.dir === 'asc' ? cmp : -cmp;
    });
    return r;
  }, [query, segment, sortBy]);

  const toggleSort = (key) => {
    setSortBy((s) => s.key === key
      ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' }
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-zinc-900">Customers</h1>
        <p className="mt-1 text-sm text-zinc-500">{customers.length} total · {rows.length} matching</p>

        <div className="mt-6 flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or ID…"
              className="w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
          </div>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            <option>All</option>
            <option>Enterprise</option>
            <option>Mid-Market</option>
            <option>SMB</option>
          </select>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200">
              <tr className="text-left">
                <Th label="ID" sortKey="id" sortBy={sortBy} onClick={toggleSort} />
                <Th label="Name" sortKey="name" sortBy={sortBy} onClick={toggleSort} />
                <Th label="Segment" sortKey="segment" sortBy={sortBy} onClick={toggleSort} />
                <Th label="Region" sortKey="region" sortBy={sortBy} onClick={toggleSort} />
                <Th label="LTV" sortKey="ltv" sortBy={sortBy} onClick={toggleSort} align="right" />
                <Th label="Status" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((c) => (
                <tr key={c.id} className="transition hover:bg-zinc-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{c.id}</td>
                  <td className="px-4 py-2.5 font-medium text-zinc-900">{c.name}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{c.segment}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{c.region}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">${c.ltv.toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-400">No matches.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ label, sortKey, sortBy, onClick, align = 'left' }) {
  const isActive = sortBy?.key === sortKey;
  const Icon = !sortKey ? null : isActive ? (sortBy.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className={`px-4 py-2 text-${align} text-xs font-medium uppercase tracking-wide text-zinc-500`}>
      {sortKey ? (
        <button
          onClick={() => onClick(sortKey)}
          className={`inline-flex items-center gap-1 transition ${align === 'right' ? 'justify-end' : ''} hover:text-zinc-900`}
        >
          {label}
          {Icon && <Icon size={12} className={isActive ? 'text-zinc-700' : 'text-zinc-300'} />}
        </button>
      ) : (
        label
      )}
    </th>
  );
}
