// Multi-step form / wizard — onboarding, registration, configuration.
//
// Pattern: step index in state, per-step validation, Back/Next buttons.
// All form data in one flat object so steps can read each other.

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import clsx from 'clsx';

const STEPS = [
  { id: 'profile', label: 'Profile' },
  { id: 'company', label: 'Company' },
  { id: 'plan',    label: 'Plan' },
  { id: 'review',  label: 'Review' },
];

const PLANS = [
  { id: 'starter',  name: 'Starter',  price: 29,  desc: 'Up to 5 seats, basic analytics' },
  { id: 'team',     name: 'Team',     price: 99,  desc: '20 seats, advanced analytics, API' },
  { id: 'business', name: 'Business', price: 299, desc: 'Unlimited, SSO, priority support' },
];

export default function App() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    fullName: '', email: '',
    company: '', size: '',
    plan: 'team',
  });
  const [done, setDone] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e?.target ? e.target.value : e }));

  const stepValid = (() => {
    if (step === 0) return form.fullName.trim() && /\S+@\S+\.\S+/.test(form.email);
    if (step === 1) return form.company.trim() && form.size;
    if (step === 2) return !!form.plan;
    return true;
  })();

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check size={24} strokeWidth={3} />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-zinc-900">You're all set</h1>
          <p className="mt-1 text-sm text-zinc-500">A confirmation email is on its way to {form.email}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-xl">
        <Stepper step={step} />

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
          {step === 0 && (
            <Step title="Tell us about you" subtitle="Just the basics — you can change anything later.">
              <Field label="Full name">
                <input
                  value={form.fullName} onChange={update('fullName')}
                  className="input" placeholder="Jordan Lee"
                />
              </Field>
              <Field label="Work email">
                <input
                  type="email" value={form.email} onChange={update('email')}
                  className="input" placeholder="jordan@company.com"
                />
              </Field>
            </Step>
          )}

          {step === 1 && (
            <Step title="Company details">
              <Field label="Company name">
                <input value={form.company} onChange={update('company')} className="input" placeholder="Acme Inc" />
              </Field>
              <Field label="Team size">
                <select value={form.size} onChange={update('size')} className="input">
                  <option value="">Select…</option>
                  <option>1–10</option>
                  <option>11–50</option>
                  <option>51–200</option>
                  <option>201+</option>
                </select>
              </Field>
            </Step>
          )}

          {step === 2 && (
            <Step title="Pick a plan" subtitle="Annual billing, cancel anytime.">
              <div className="space-y-2">
                {PLANS.map((p) => (
                  <label
                    key={p.id}
                    className={clsx(
                      'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition',
                      form.plan === p.id ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300',
                    )}
                  >
                    <input
                      type="radio" name="plan"
                      checked={form.plan === p.id}
                      onChange={() => update('plan')(p.id)}
                      className="mt-1 accent-zinc-900"
                    />
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between">
                        <span className="font-medium text-zinc-900">{p.name}</span>
                        <span className="font-mono tabular-nums text-zinc-700">${p.price}<span className="text-xs text-zinc-500">/mo</span></span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">{p.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step title="Review" subtitle="Confirm and we'll get you started.">
              <dl className="divide-y divide-zinc-100 text-sm">
                <Row label="Name">{form.fullName}</Row>
                <Row label="Email">{form.email}</Row>
                <Row label="Company">{form.company}</Row>
                <Row label="Team size">{form.size}</Row>
                <Row label="Plan">{PLANS.find((p) => p.id === form.plan)?.name}</Row>
              </dl>
            </Step>
          )}

          <div className="mt-6 flex justify-between border-t border-zinc-100 pt-4">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!stepValid}
                className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => setDone(true)}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Confirm
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .input { width: 100%; border-radius: 0.375rem; border: 1px solid rgb(212 212 216); background: #fff; padding: 0.5rem 0.75rem; font-size: 0.875rem; }
        .input:focus { outline: none; box-shadow: 0 0 0 2px rgb(24 24 27); border-color: transparent; }
      `}</style>
    </div>
  );
}

function Stepper({ step }) {
  return (
    <nav className="flex items-center justify-between">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex flex-1 items-center">
          <div className={clsx(
            'flex h-7 w-7 flex-none items-center justify-center rounded-full border text-xs font-medium transition',
            i < step ? 'border-emerald-500 bg-emerald-500 text-white'
              : i === step ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-300 text-zinc-400',
          )}>
            {i < step ? <Check size={12} strokeWidth={3} /> : i + 1}
          </div>
          <span className={clsx(
            'ml-2 text-xs font-medium tracking-wide',
            i === step ? 'text-zinc-900' : 'text-zinc-500',
          )}>{s.label}</span>
          {i < STEPS.length - 1 && <div className="mx-3 h-px flex-1 bg-zinc-200" />}
        </div>
      ))}
    </nav>
  );
}

function Step({ title, subtitle, children }) {
  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-zinc-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between py-2.5">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-900">{children}</dd>
    </div>
  );
}
