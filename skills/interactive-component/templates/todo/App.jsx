// Todo / list-CRUD template — adapt for shopping list, kanban column,
// any "list with add / edit / remove / toggle" shape.
//
// Pattern: array state with crypto.randomUUID() ids; functional updates
// to setState so successive operations compose without races.

import { useState } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export default function App() {
  const [items, setItems] = useState([
    { id: crypto.randomUUID(), text: 'Read the brief', done: true },
    { id: crypto.randomUUID(), text: 'Draft the proposal', done: false },
    { id: crypto.randomUUID(), text: 'Send for review', done: false },
  ]);
  const [draft, setDraft] = useState('');

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setItems((xs) => [...xs, { id: crypto.randomUUID(), text, done: false }]);
    setDraft('');
  };
  const toggle = (id) => setItems((xs) => xs.map((x) => x.id === id ? { ...x, done: !x.done } : x));
  const remove = (id) => setItems((xs) => xs.filter((x) => x.id !== id));

  const remaining = items.filter((i) => !i.done).length;

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-md">
        <header className="flex items-baseline justify-between">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-stone-900">Today</h1>
          <span className="font-mono text-sm tabular-nums text-stone-500">
            {remaining} remaining
          </span>
        </header>

        <div className="mt-6 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            placeholder="Add a task…"
            className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent"
          />
          <button
            onClick={add}
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-40"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        <ul className="mt-6 space-y-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 transition hover:border-stone-200 hover:bg-white"
            >
              <button
                onClick={() => toggle(item.id)}
                className={clsx(
                  'flex h-5 w-5 flex-none items-center justify-center rounded-full border transition',
                  item.done
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-stone-300 hover:border-stone-500',
                )}
                aria-label={item.done ? 'Mark incomplete' : 'Mark complete'}
              >
                {item.done && <Check size={12} strokeWidth={3} />}
              </button>
              <span className={clsx(
                'flex-1 text-sm',
                item.done ? 'text-stone-400 line-through' : 'text-stone-900',
              )}>
                {item.text}
              </span>
              <button
                onClick={() => remove(item.id)}
                className="opacity-0 transition group-hover:opacity-100 text-stone-400 hover:text-red-600"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="py-12 text-center text-sm text-stone-400">No tasks yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
