# State and effect patterns

Recipes for the React patterns that come up most often in artifacts. All of these work in the iframe runtime as-is.

---

## Form state — flat with derived submit

```jsx
const [form, setForm] = useState({ name: '', email: '', age: '' });
const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

const isValid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email);

return (
  <div className="space-y-3">
    <input value={form.name} onChange={update('name')} placeholder="Name" />
    <input value={form.email} onChange={update('email')} placeholder="Email" />
    <button disabled={!isValid}>Submit</button>
  </div>
);
```

---

## Lists — append / remove / edit by id

```jsx
const [items, setItems] = useState([
  { id: '1', text: 'Read book', done: false },
]);

const add = (text) => setItems((xs) => [...xs, { id: crypto.randomUUID(), text, done: false }]);
const toggle = (id) => setItems((xs) => xs.map((x) => x.id === id ? { ...x, done: !x.done } : x));
const remove = (id) => setItems((xs) => xs.filter((x) => x.id !== id));
const edit = (id, text) => setItems((xs) => xs.map((x) => x.id === id ? { ...x, text } : x));
```

`crypto.randomUUID()` is available inside the sandbox. Use it for stable IDs.

---

## Reducer for multi-action state

When you have ≥3 distinct actions on the same state shape, useReducer is cleaner than chained useState:

```jsx
const initial = { items: [], filter: 'all', editingId: null };

function reducer(state, action) {
  switch (action.type) {
    case 'add':       return { ...state, items: [...state.items, action.item] };
    case 'remove':    return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case 'toggle':    return { ...state, items: state.items.map((i) => i.id === action.id ? { ...i, done: !i.done } : i) };
    case 'set-filter':return { ...state, filter: action.filter };
    case 'edit':      return { ...state, editingId: action.id };
    case 'commit':    return { ...state, items: state.items.map((i) => i.id === action.id ? { ...i, text: action.text } : i), editingId: null };
    default:          return state;
  }
}

const [state, dispatch] = useReducer(reducer, initial);

dispatch({ type: 'add', item: { id: crypto.randomUUID(), text: 'New' } });
```

---

## Derived values — useMemo

```jsx
const total = useMemo(
  () => items.reduce((sum, i) => sum + (i.price * i.qty), 0),
  [items],
);

const grouped = useMemo(() => {
  const out = {};
  for (const i of items) (out[i.category] ??= []).push(i);
  return out;
}, [items]);
```

Don't over-memoize. Only wrap in useMemo when:
- The computation is non-trivial (filter+sort over hundreds of items, big object construction), OR
- The result is passed as a prop to a memoized child component.

---

## Stable callbacks — useCallback

Same rule: don't over-use. Wrap a callback when it's passed to a memoized child OR used as an effect dependency:

```jsx
const handleSelect = useCallback((id) => {
  setSelected(id);
  onSelect?.(id);
}, [onSelect]);
```

---

## Refs for DOM access

```jsx
const inputRef = useRef(null);

useEffect(() => {
  inputRef.current?.focus();
}, []);

return <input ref={inputRef} />;
```

For non-DOM mutable values (timers, latest props), refs work too:

```jsx
const latestValue = useRef(value);
useEffect(() => { latestValue.current = value; }, [value]);
```

---

## Debounced search input

The most-asked pattern. Use a `setTimeout` with cleanup; no library needed:

```jsx
const [query, setQuery] = useState('');
const [debounced, setDebounced] = useState('');

useEffect(() => {
  const t = setTimeout(() => setDebounced(query), 250);
  return () => clearTimeout(t);
}, [query]);

const results = useMemo(
  () => items.filter((i) => i.name.toLowerCase().includes(debounced.toLowerCase())),
  [items, debounced],
);
```

---

## Interval / timer (Pomodoro pattern)

```jsx
const [secondsLeft, setSecondsLeft] = useState(25 * 60);
const [running, setRunning] = useState(false);

useEffect(() => {
  if (!running) return;
  const id = setInterval(() => {
    setSecondsLeft((s) => {
      if (s <= 1) { setRunning(false); return 0; }
      return s - 1;
    });
  }, 1000);
  return () => clearInterval(id);
}, [running]);
```

Clean up on unmount and when `running` flips. Important: don't put a `setInterval` outside an effect — it'll leak.

---

## Animation frame loop (drawing canvas)

```jsx
const canvasRef = useRef(null);

useEffect(() => {
  const ctx = canvasRef.current.getContext('2d');
  let raf = 0;
  let t = 0;

  const draw = () => {
    t += 0.02;
    ctx.clearRect(0, 0, 400, 400);
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(200 + 100 * Math.cos(t), 200 + 100 * Math.sin(t), 20, 0, Math.PI * 2);
    ctx.fill();
    raf = requestAnimationFrame(draw);
  };

  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}, []);

return <canvas ref={canvasRef} width={400} height={400} className="rounded-md border" />;
```

Always cancel on cleanup. Pause when the document is hidden if the loop is non-essential:

```jsx
useEffect(() => {
  const onVis = () => { /* setRunning(!document.hidden) or similar */ };
  document.addEventListener('visibilitychange', onVis);
  return () => document.removeEventListener('visibilitychange', onVis);
}, []);
```

---

## Async work without fetch

Inside the sandbox, `fetch` is blocked. So async usually means timed work or `await` inside a generator-style handler:

```jsx
const [busy, setBusy] = useState(false);
const [result, setResult] = useState(null);

const run = async () => {
  setBusy(true);
  try {
    // Simulate work
    await new Promise((r) => setTimeout(r, 800));
    setResult(computeSomething());
  } finally {
    setBusy(false);
  }
};
```

If the user wants real network data, refuse and ask them to paste it.

---

## Local storage substitute — useState lifted to URL hash

Sometimes you want state to survive a refresh. `localStorage` is blocked, but `location.hash` works:

```jsx
function useHashState(defaultValue) {
  const [value, setValue] = useState(() => {
    const h = decodeURIComponent(window.location.hash.slice(1));
    return h ? JSON.parse(h) : defaultValue;
  });
  useEffect(() => {
    window.location.hash = encodeURIComponent(JSON.stringify(value));
  }, [value]);
  return [value, setValue];
}
```

Use sparingly — most artifacts are throwaway demos and don't need persistence.

---

## Select / multi-select with toggle

```jsx
const [selected, setSelected] = useState(new Set());

const toggle = (id) => setSelected((s) => {
  const next = new Set(s);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
});

// Render: items.map((i) => <Row key={i.id} active={selected.has(i.id)} onClick={() => toggle(i.id)} />)
```

`Set` works fine in React state — just remember to spread to a new Set on mutation.
