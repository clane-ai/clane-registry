# Library quick-reference

Every module the runtime makes available. Importing anything else fails — both the CSP and the import map are explicit allowlists.

---

## React 18

```jsx
import {
  useState, useEffect, useMemo, useCallback, useReducer, useRef,
  useContext, createContext, useId, useLayoutEffect,
  Fragment, memo, forwardRef, lazy, Suspense,
} from 'react';
```

Concurrent features (`useTransition`, `useDeferredValue`, `useSyncExternalStore`) are available — react@18.3.1 is loaded. JSX runtime is auto-imported.

---

## Lucide icons (`lucide-react`)

~1000 icons; tree-shakable named imports. Use `size={N}` (defaults to 24). Common ones for artifacts:

```jsx
import {
  // Actions
  Plus, Minus, X, Check, Edit, Edit2, Edit3, Trash, Trash2, Copy, Save, Send, Download, Upload, Search,
  // Navigation
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight,
  Menu, MoreHorizontal, MoreVertical,
  // Status / feedback
  Check, CheckCircle, CheckCircle2, AlertCircle, AlertTriangle,
  Info, HelpCircle, Loader, Loader2, RefreshCw,
  // Domain
  User, Users, Mail, Phone, Calendar, Clock, MapPin, Globe,
  Home, Settings, Bell, Star, Heart, Bookmark, Tag,
  ShoppingCart, CreditCard, DollarSign, TrendingUp, TrendingDown,
  // Files / data
  File, FileText, Folder, FolderOpen, Image, Camera, Paperclip,
  // Layout
  Grid, List, LayoutGrid, Columns, Rows, Sidebar,
  // Charts / data viz
  BarChart, BarChart2, BarChart3, LineChart, PieChart, Activity,
  // Misc
  Sun, Moon, Eye, EyeOff, Lock, Unlock, Filter, ArrowUpDown,
} from 'lucide-react';

<Plus size={16} className="text-zinc-500" />
```

Sizing: 14–16 for inline icons, 18–20 for primary buttons, 24+ for empty-state illustrations.

Coloring: use `className="text-..."` (Lucide icons inherit `currentColor`).

---

## Recharts

Composition-based — every chart is a tree of components inside `<ResponsiveContainer>`.

```jsx
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter,
  XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ReferenceArea, Brush,
} from 'recharts';
```

### Bar chart

```jsx
const data = [
  { month: 'Jan', revenue: 12 },
  { month: 'Feb', revenue: 18 },
];
<ResponsiveContainer width="100%" height={320}>
  <BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
    <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
    <YAxis stroke="#71717a" fontSize={12} />
    <Tooltip />
    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### Line chart with multiple series

```jsx
<LineChart data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="month" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
  <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} dot={false} />
</LineChart>
```

### Pie chart with custom colors

```jsx
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
<PieChart>
  <Pie
    data={data}
    dataKey="value"
    nameKey="name"
    cx="50%"
    cy="50%"
    outerRadius={100}
    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
  >
    {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
  </Pie>
  <Tooltip />
</PieChart>
```

### Sizing tips

- Always wrap in `<ResponsiveContainer width="100%" height={N}>` so charts adapt to the artifact pane width.
- For dashboards with multiple charts, use a fixed pixel height (300–360 typical) rather than aspect ratios.
- `fontSize={12}` on axes — defaults are too large.

---

## clsx

Conditional class strings:

```jsx
import clsx from 'clsx';

<button className={clsx(
  'rounded-md px-3 py-2 text-sm',
  isPrimary && 'bg-zinc-900 text-white',
  isDisabled && 'opacity-50 cursor-not-allowed',
  size === 'sm' && 'px-2 py-1 text-xs',
)}>…</button>
```

Equivalent to chaining `&&` with strings; clsx handles falsy / arrays / objects. Use it; don't string-concat classNames manually.

---

## date-fns

Tree-shakable, function-per-import. Most-used:

```jsx
import {
  format, formatDistance, formatDistanceToNow, formatRelative,
  parse, parseISO,
  addDays, addMonths, addHours, subDays,
  startOfDay, startOfWeek, startOfMonth, startOfYear,
  endOfDay, endOfWeek, endOfMonth,
  differenceInDays, differenceInHours, differenceInMinutes,
  isBefore, isAfter, isToday, isThisWeek,
  eachDayOfInterval,
} from 'date-fns';

format(new Date(), 'MMM d, yyyy');         // "Mar 5, 2026"
format(new Date(), 'h:mm a');              // "2:34 PM"
formatDistanceToNow(new Date(2026, 0, 1)); // "2 months ago"
addDays(new Date(), 7);                    // Date 7 days from now
```

Format-string reference: https://date-fns.org/v4/docs/format

---

## Motion (`motion/react`)

Modern Framer Motion API. For most artifacts, Tailwind `transition` classes are enough; reach for Motion when you need:

- Layout animations (`<motion.div layout>`)
- Enter/exit animations (`<AnimatePresence>`)
- Spring physics

```jsx
import { motion, AnimatePresence } from 'motion/react';

<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
    >
      …
    </motion.div>
  )}
</AnimatePresence>
```

Keep it restrained. ONE well-orchestrated animation beats five scattered micro-interactions.

---

## Tailwind v3

Loaded via `cdn.tailwindcss.com`. Every utility class is available, plus arbitrary values via `[…]` syntax: `w-[420px]`, `text-[#6366f1]`, `grid-cols-[220px_1fr]`.

Caveats:
- No custom `tailwind.config.js`. The defaults work for 99% of artifacts.
- The Play CDN regenerates classes on the fly — slightly slower than a precompiled bundle, but fine for artifacts.
- Animation utilities: `animate-spin`, `animate-pulse`, `animate-bounce`, `transition`, `duration-150/200/300`, `ease-out`.

See `tailwind-patterns.md` for full UI recipes.
