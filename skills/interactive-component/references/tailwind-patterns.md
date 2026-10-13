# Tailwind UI patterns

Copyable JSX snippets for common UI shapes. Adapt colors and spacing to the artifact's overall aesthetic — these are starting points, not finished components.

---

## Buttons

### Primary

```jsx
<button className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 active:bg-zinc-950 disabled:cursor-not-allowed disabled:opacity-50">
  <Plus size={16} /> Add
</button>
```

### Secondary

```jsx
<button className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 active:bg-zinc-100">
  Cancel
</button>
```

### Ghost / icon-only

```jsx
<button className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900" aria-label="More">
  <MoreHorizontal size={16} />
</button>
```

### Destructive

```jsx
<button className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
  <Trash2 size={16} /> Delete
</button>
```

---

## Inputs

### Text input

```jsx
<div className="space-y-1.5">
  <label className="text-sm font-medium text-zinc-700">Email</label>
  <input
    type="email"
    placeholder="you@example.com"
    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-zinc-900"
  />
</div>
```

### With leading icon

```jsx
<div className="relative">
  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
  <input
    placeholder="Search…"
    className="w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
  />
</div>
```

### Select

```jsx
<select className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900">
  <option>All segments</option>
  <option>Enterprise</option>
  <option>Mid-Market</option>
</select>
```

### Textarea

```jsx
<textarea
  rows={4}
  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
  placeholder="Notes…"
/>
```

### Range slider

```jsx
<input
  type="range"
  min="0" max="100"
  className="w-full h-1.5 rounded-full bg-zinc-200 accent-zinc-900"
/>
```

---

## Cards

### KPI card

```jsx
<div className="rounded-lg border border-zinc-200 bg-white p-5">
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-zinc-500">Revenue</span>
    <TrendingUp size={16} className="text-emerald-500" />
  </div>
  <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">$284.5K</p>
  <p className="mt-1 text-xs text-emerald-600">+12.4% vs last month</p>
</div>
```

### Item card with action

```jsx
<div className="group flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300">
  <div className="min-w-0">
    <p className="truncate text-sm font-medium text-zinc-900">{item.name}</p>
    <p className="text-xs text-zinc-500">{item.subtitle}</p>
  </div>
  <button className="opacity-0 group-hover:opacity-100 transition">
    <Trash2 size={14} className="text-zinc-400 hover:text-red-600" />
  </button>
</div>
```

---

## Badges / pills

```jsx
<span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
  Active
</span>
<span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
  Pending
</span>
<span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
  Failed
</span>
```

### Status dot + label

```jsx
<div className="inline-flex items-center gap-2 text-sm">
  <span className="h-2 w-2 rounded-full bg-emerald-500" />
  <span className="text-zinc-700">Healthy</span>
</div>
```

---

## Tabs

```jsx
const [tab, setTab] = useState('overview');
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'customers', label: 'Customers' },
  { id: 'revenue', label: 'Revenue' },
];

<div className="border-b border-zinc-200">
  <nav className="flex gap-6">
    {tabs.map((t) => (
      <button
        key={t.id}
        onClick={() => setTab(t.id)}
        className={clsx(
          '-mb-px border-b-2 px-1 py-3 text-sm font-medium transition',
          tab === t.id
            ? 'border-zinc-900 text-zinc-900'
            : 'border-transparent text-zinc-500 hover:text-zinc-900',
        )}
      >
        {t.label}
      </button>
    ))}
  </nav>
</div>
```

---

## Modal / dialog

```jsx
{isOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Confirm</h2>
        <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-600">
          <X size={18} />
        </button>
      </div>
      <p className="mt-2 text-sm text-zinc-600">Are you sure you want to proceed?</p>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={() => setIsOpen(false)} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">
          Cancel
        </button>
        <button onClick={confirm} className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white">
          Confirm
        </button>
      </div>
    </div>
  </div>
)}
```

---

## Toast / inline alert

```jsx
<div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
  <CheckCircle2 size={16} className="mt-0.5 text-emerald-600" />
  <div className="text-sm text-emerald-900">
    <p className="font-medium">Saved.</p>
    <p className="text-emerald-700">Your changes have been applied.</p>
  </div>
</div>
```

Variants by color: emerald (success), amber (warning), red (error), blue (info), zinc (neutral).

---

## Empty state

```jsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Users size={32} className="text-zinc-300" />
  <p className="mt-4 text-sm font-medium text-zinc-900">No customers yet</p>
  <p className="mt-1 text-xs text-zinc-500">Add your first customer to get started.</p>
  <button className="mt-4 rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white">
    <Plus size={12} className="inline mr-1" /> Add customer
  </button>
</div>
```

---

## Skeleton loader

```jsx
<div className="space-y-3">
  <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200" />
  <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-200" />
  <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200" />
</div>
```

---

## Tables

```jsx
<table className="w-full text-sm">
  <thead className="border-b border-zinc-200">
    <tr>
      <th className="pb-2 text-left font-medium text-zinc-500">Name</th>
      <th className="pb-2 text-left font-medium text-zinc-500">Status</th>
      <th className="pb-2 text-right font-medium text-zinc-500 tabular-nums">LTV</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-zinc-100">
    {rows.map((r) => (
      <tr key={r.id} className="transition hover:bg-zinc-50">
        <td className="py-2.5 font-medium">{r.name}</td>
        <td className="py-2.5">
          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
            {r.status}
          </span>
        </td>
        <td className="py-2.5 text-right tabular-nums">${r.ltv.toLocaleString()}</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## Loading spinner

```jsx
<Loader2 size={16} className="animate-spin text-zinc-500" />
```

---

## Color palette starting points

Pick ONE accent and a neutral; do not mix two saturated colors.

| Aesthetic | Neutral | Accent | Example use |
|---|---|---|---|
| Default crisp | `zinc-900` text on white | `indigo-500` | Most apps |
| Editorial | `stone-900` on `stone-50` | `emerald-500` | Long-form, content-heavy |
| Financial | `slate-900` on white | `blue-600` | Dashboards, data |
| Friendly | `neutral-800` on `neutral-50` | `amber-500` | Onboarding, marketing |
| Bold dark | `white` text on `zinc-950` | `lime-400` | Hero sections, demos |

`tabular-nums` font-feature on every number column. Numbers are non-negotiable; align them.
