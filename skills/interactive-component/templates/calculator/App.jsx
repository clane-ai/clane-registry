// Tip splitter — a calculator-shaped artifact template.
// Adapt: replace the inputs, the math, and the result label.
//
// Pattern: numeric inputs as STRING state (not number, to keep the cursor
// behavior correct), parsed lazily where used. One useMemo for the
// derived result. Fully keyboard-accessible.

import { useState, useMemo } from 'react';
import { DollarSign, Users, Percent } from 'lucide-react';

export default function App() {
  const [bill, setBill] = useState('100');
  const [tipPct, setTipPct] = useState('15');
  const [people, setPeople] = useState('2');

  const result = useMemo(() => {
    const b = parseFloat(bill) || 0;
    const t = parseFloat(tipPct) || 0;
    const p = Math.max(1, parseInt(people, 10) || 1);
    const tipAmount = b * (t / 100);
    const total = b + tipAmount;
    const perPerson = total / p;
    return { tipAmount, total, perPerson };
  }, [bill, tipPct, people]);

  const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-zinc-900">Tip splitter</h1>
        <p className="mt-1 text-sm text-zinc-500">Enter the bill, tip %, and how many people are splitting.</p>

        <div className="mt-8 space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
          <Field label="Bill amount" icon={DollarSign}>
            <input
              type="number" inputMode="decimal" min="0" step="0.01"
              value={bill} onChange={(e) => setBill(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent tabular-nums"
            />
          </Field>

          <Field label="Tip" icon={Percent}>
            <input
              type="number" inputMode="numeric" min="0" max="100" step="1"
              value={tipPct} onChange={(e) => setTipPct(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent tabular-nums"
            />
            <div className="mt-2 flex gap-2">
              {[10, 15, 18, 20, 25].map((v) => (
                <button
                  key={v}
                  onClick={() => setTipPct(String(v))}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${tipPct === String(v) ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'}`}
                >
                  {v}%
                </button>
              ))}
            </div>
          </Field>

          <Field label="Split between" icon={Users}>
            <input
              type="number" inputMode="numeric" min="1" step="1"
              value={people} onChange={(e) => setPeople(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent tabular-nums"
            />
          </Field>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-900 bg-zinc-900 p-5 text-white">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-zinc-400">Per person</span>
            <span className="font-mono text-3xl font-semibold tabular-nums">{fmt(result.perPerson)}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3 text-xs text-zinc-300">
            <div className="flex items-baseline justify-between">
              <span>Tip</span>
              <span className="font-mono tabular-nums">{fmt(result.tipAmount)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span>Total</span>
              <span className="font-mono tabular-nums">{fmt(result.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <div className="relative mt-1.5">
        <Icon size={14} className="absolute left-3 top-3 text-zinc-400" />
        {children}
      </div>
    </label>
  );
}
