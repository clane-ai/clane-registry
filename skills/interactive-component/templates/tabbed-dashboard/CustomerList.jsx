const STATUS_STYLES = {
  Healthy:   'bg-emerald-50 text-emerald-700',
  'At Risk': 'bg-amber-50 text-amber-700',
  Churning:  'bg-red-50 text-red-700',
};

export function CustomerList({ customers }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50/50">
          <tr className="text-left">
            <th className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">ID</th>
            <th className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Name</th>
            <th className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Segment</th>
            <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500">LTV</th>
            <th className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {customers.map((c) => (
            <tr key={c.id} className="transition hover:bg-zinc-50">
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{c.id}</td>
              <td className="px-4 py-2.5 font-medium text-zinc-900">{c.name}</td>
              <td className="px-4 py-2.5 text-zinc-600">{c.segment}</td>
              <td className="px-4 py-2.5 text-right font-mono tabular-nums">${c.ltv.toLocaleString()}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}>
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
