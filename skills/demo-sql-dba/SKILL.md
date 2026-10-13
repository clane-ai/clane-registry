---
publisher: clane
name: demo-sql-dba
version: 0.1.2
description: |
  Pre-campaign guardrail audit for a retail bank's customer database.
  Use this skill ANY time the user is preparing a marketing or transactional
  campaign and needs to filter the target list for consent, compliance,
  vulnerability, eligibility, or frequency-cap violations before email or
  SMS is sent. Connects to the `customers.duckdb` file already present in
  the project files folder. Every recommendation is backed by the actual
  SQL query echoed in the response so the bank's data team can verify and
  reuse it. Trigger on phrases like: "send this campaign to ...", "build me
  a list for the new ...", "which customers can we offer ...", "audit this
  target list", "before we hit send", "show me the rejection breakdown",
  "who got filtered out and why", "frequency cap", "consent check",
  "do not contact", "KYC status", or any bank-campaign workflow even when
  SQL is not mentioned. Also activate for ad-hoc questions about the bank
  customer book ("how many customers in Cork", "average balance by tier").
when_to_use: |
  Trigger whenever the conversation involves the bank's customer database
  (file: customers.duckdb). The two anchor scenarios:
  1. CAMPAIGN AUDIT — user is preparing email/SMS and needs the eligible
     list with all guardrails applied. ALWAYS show both the SQL and the
     rejection-reason breakdown.
  2. AD-HOC ANALYTICS — user asks a question about the customer book
     (counts, segments, balances, holdings). Answer with SQL + result.
  Do NOT trigger for: code generation unrelated to this DB; general SQL
  tutoring; questions about real production data the user hasn't loaded.
inputs:
  - type: campaign_brief
    required: false
    description: Free-text campaign intent (e.g. "new green personal loan
      to existing current-account holders"). The skill maps this to the
      right guardrail rule set.
  - type: analytics_question
    required: false
    description: Free-text question about the customer book (e.g. "average
      monthly balance by segment").
outputs:
  - type: sql_query
    description: The actual SQL the skill ran, echoed in a code block
      before the result table.
  - type: result_table
    description: The query result, formatted as a markdown table when small,
      or as a numeric summary when large.
  - type: rejection_breakdown
    description: For campaign audits only — count of customers filtered
      out per failing rule.
requires_tools:
  - python_exec
  - org_file_read
  - org_file_list
category: analysis
tags:
  - bank
  - campaign
  - guardrail
  - sql
  - duckdb
  - consent
  - compliance
  - kyc
  - vulnerable-customer
  - gdpr
---

# Demo SQL DBA — bank pre-campaign guardrail auditor

A retail-bank analyst skill. The job: before any campaign goes out, audit
the target list against consent, compliance, vulnerability, eligibility,
and frequency rules — and **always show the SQL** behind every answer.
The bank's data team is in the room. If they can't verify the query, they
can't trust the answer.

## The dataset

Single DuckDB file: **`customers.duckdb`** (~1.8 MB). It lives in Org
Files, NOT in the conversation working directory by default — so the
first thing every session needs is a one-time stage into the sandbox.

### First-turn setup — stage the file into the sandbox

Find the file first, then stage it: call
`org_file_list(scope="user", folder="Demo")` and take the id of the row
whose `name == "customers.duckdb"`, then call `org_file_read` with that
id and `stage_locally=true`. The bytes land at `customers.duckdb` in the
working directory and stay there for the rest of the conversation.

```
org_file_read(
  id="<id of customers.duckdb from org_file_list>",
  stage_locally=true
)
```

If `stage_locally` returns an error like "file not found in this org",
the user has not uploaded the DB to this tenant. Stop and ask them to
upload it to **Private Files → Demo** as `customers.duckdb` — don't try
to proceed.

### Subsequent turns — file is already staged

After the first `org_file_read({stage_locally:true})` in a conversation,
the file persists in the sandbox. Just open it:

```python
import duckdb
con = duckdb.connect("customers.duckdb", read_only=True)
```

If `import duckdb` fails, install it first:
`subprocess.run(["pip", "install", "duckdb", "--quiet"])`. Then retry.

**Use `read_only=True`** — the demo must never mutate the dataset.

### Defensive check — skip restaging if already present

```python
import os
if not os.path.exists("customers.duckdb"):
    # call org_file_read with stage_locally=true via a separate tool turn
    raise SystemExit("customers.duckdb not staged - call org_file_read first")
```

## Schema cheat sheet

**The only source table is `customers`** — 44 columns, primary key
`customer_id`, no foreign keys (denormalized single-table by design so
demo SQL stays short and readable).

Everything else the DB contains — the four `v_*_eligible` views and
`v_rejection_reasons` — are **PRE-BAKED OUTPUTS this role would normally
PRODUCE**. They exist as convenience shortcuts in case the demo needs to
fall back, but the role's *job* is to build those outputs LIVE from the
`customers` table on each request. That's what makes the audit
demonstrably real — the bank's data team sees the WHERE clauses being
composed against their actual columns, not a pre-canned view name they
have to take on faith.

**Default behaviour: write the SELECT against `customers` from scratch.**
Use a view only when explicitly asked ("just pull from the
loan-eligible view") or as a one-line sanity check at the end of an
act.

### Table: `customers` (the only input)

| Group | Columns |
|---|---|
| Identity | `customer_id` (PK), `first_name`, `last_name`, `date_of_birth`, `gender`, `email`, `phone_mobile`, `address_line1`, `city`, `eircode`, `preferred_language` |
| Relationship | `customer_since`, `segment` (mass/mass_affluent/affluent/private), `branch`, `monthly_avg_balance_eur`, `lifetime_value_eur` |
| Product holdings | `has_current_account`, `has_savings`, `has_credit_card`, `has_mortgage`, `has_personal_loan`, `has_investment`, `credit_card_limit_eur`, `outstanding_loan_balance_eur`, `mortgage_balance_eur` |
| Consent & comms | `email_opt_in`, `sms_opt_in`, `marketing_consent_date`, `do_not_contact`, `last_campaign_sent_at`, `email_bounce_count` |
| Compliance & risk | `kyc_status` (verified/expired/pending), `aml_risk` (low/medium/high), `pep_flag`, `sanctions_flag`, `vulnerable_customer_flag`, `vulnerability_reason` (bereavement/financial_hardship/health/cognitive), `deceased_flag` |
| Account state | `account_status` (active/dormant/closed), `complaint_open_flag`, `arrears_flag` |
| Eligibility | `credit_score` (300-850), `income_band` (under_25k / 25k_50k / 50k_75k / 75k_100k / 100k_plus), `employment_status` (employed/self_employed/unemployed/retired/student) |

**Invariants** the data already enforces (the agent does NOT need to
re-check these):
- `outstanding_loan_balance_eur` null iff `has_personal_loan = false`
- `credit_card_limit_eur` null iff `has_credit_card = false`
- `mortgage_balance_eur` null iff `has_mortgage = false`
- `vulnerability_reason` null iff `vulnerable_customer_flag = false`
- Deceased customers are never `account_status = 'active'`

### Pre-baked outputs (fallback shortcuts only — DO NOT lead with these)

The DB ships five views that represent canned forms of what this role
PRODUCES. Use them only as a sanity-check after writing the SQL live,
or as a one-line fallback if a live query fails on stage. The bank
won't have views like these in their own DB on day one — the role's
demonstrable value is BUILDING the equivalent SELECT from scratch.

| Pre-baked output | Equivalent SELECT against `customers` |
|---|---|
| `v_loan_eligible` | Personal loan WHERE clause (see below) |
| `v_card_eligible` | Platinum card upgrade WHERE clause |
| `v_mortgage_eligible` | Remortgage WHERE clause |
| `v_deposit_eligible` | Fixed-term deposit WHERE clause (lighter compliance bar) |
| `v_rejection_reasons` | UNION ALL of one-row-per-failing-rule per customer |

### Approximate edge-case counts (10,000 total)

So you know what's there to find:

| Edge case | Count |
|---|---|
| Deceased | ~30 |
| Vulnerable customers | ~425 |
| PEP (politically exposed) | ~20 |
| Sanctions flag | ~7 |
| Email opted out | ~1,556 |
| SMS opted out | ~2,519 |
| Do-not-contact (master flag) | ~100 |
| KYC expired | ~362 |
| Open complaint | ~174 |
| In arrears | ~300 |
| Contacted in last 14 days | ~824 |
| Email bounces ≥ 3 | ~220 |

Plus **50 deliberately-seeded multi-flag "wow" customers** carrying 3-5
blocking flags each. Top of the list: **CUST09290** (7 reasons stacked).
These are perfect for the "show me the most concerning rejections" moment.

## How to answer

For EVERY question:
1. **Run the SQL** via `python_exec` — never paraphrase numbers without
   running the query.
2. **Echo the SQL in a fenced code block** ABOVE the result. The bank's
   data team must be able to copy the SQL into their own SQL Server /
   Oracle environment and get the same shape of answer.
3. **Show the result** as a markdown table for ≤ 20 rows, or as a numeric
   summary + sample 5 rows for larger results.
4. **For campaign audits, ALWAYS also run the rejection-reason breakdown**
   even if not explicitly asked. The breakdown is the moment that sells
   the value of the guardrail.

## Campaign guardrails — canonical WHERE clauses (BUILD THESE LIVE)

These are the rule sets the role must compose against the `customers`
table on demand. The four pre-baked views in the DB encode the same
logic, but the demo's value is showing the agent assemble these against
real columns the bank recognises. Default behaviour: write the SELECT
from scratch; only fall back to `SELECT * FROM v_loan_eligible` if you
need a one-line sanity check.

### Personal loan
```sql
WHERE has_personal_loan = FALSE
  AND email_opt_in = TRUE
  AND do_not_contact = FALSE
  AND deceased_flag = FALSE
  AND account_status = 'active'
  AND kyc_status = 'verified'
  AND vulnerable_customer_flag = FALSE
  AND arrears_flag = FALSE
  AND complaint_open_flag = FALSE
  AND sanctions_flag = FALSE
  AND credit_score >= 600
  AND email_bounce_count < 3
  AND (last_campaign_sent_at IS NULL
       OR last_campaign_sent_at < CURRENT_TIMESTAMP - INTERVAL '14 days')
```

### Credit card upgrade (platinum)
```sql
WHERE has_credit_card = TRUE
  AND income_band IN ('75k_100k', '100k_plus')
  AND email_opt_in = TRUE
  AND do_not_contact = FALSE
  AND deceased_flag = FALSE
  AND account_status = 'active'
  AND kyc_status = 'verified'
  AND arrears_flag = FALSE
  AND complaint_open_flag = FALSE
  AND sanctions_flag = FALSE
  AND (vulnerability_reason IS NULL
       OR vulnerability_reason <> 'financial_hardship')
  AND email_bounce_count < 3
  AND (last_campaign_sent_at IS NULL
       OR last_campaign_sent_at < CURRENT_TIMESTAMP - INTERVAL '14 days')
```

### Mortgage / remortgage
```sql
WHERE has_mortgage = TRUE
  AND email_opt_in = TRUE
  AND do_not_contact = FALSE
  AND deceased_flag = FALSE
  AND account_status = 'active'
  AND kyc_status = 'verified'
  AND complaint_open_flag = FALSE
  AND sanctions_flag = FALSE
  AND employment_status IN ('employed', 'self_employed', 'retired')
  AND email_bounce_count < 3
  AND (last_campaign_sent_at IS NULL
       OR last_campaign_sent_at < CURRENT_TIMESTAMP - INTERVAL '14 days')
```

### Fixed-term deposit
```sql
WHERE email_opt_in = TRUE
  AND do_not_contact = FALSE
  AND deceased_flag = FALSE
  AND account_status = 'active'
  AND sanctions_flag = FALSE
  AND email_bounce_count < 3
  AND (last_campaign_sent_at IS NULL
       OR last_campaign_sent_at < CURRENT_TIMESTAMP - INTERVAL '14 days')
```

## The rejection breakdown (the moment that sells the demo)

Built LIVE against `customers` (do this — do NOT just `GROUP BY` against
the canned view). Each clause counts customers failing one specific
rule:

```sql
SELECT
  COUNT(*) FILTER (WHERE deceased_flag)               AS deceased,
  COUNT(*) FILTER (WHERE NOT email_opt_in)            AS no_email_consent,
  COUNT(*) FILTER (WHERE do_not_contact)              AS do_not_contact,
  COUNT(*) FILTER (WHERE kyc_status <> 'verified')    AS kyc_not_verified,
  COUNT(*) FILTER (WHERE account_status <> 'active')  AS account_inactive,
  COUNT(*) FILTER (WHERE vulnerable_customer_flag)    AS vulnerable,
  COUNT(*) FILTER (WHERE arrears_flag)                AS arrears,
  COUNT(*) FILTER (WHERE complaint_open_flag)         AS open_complaint,
  COUNT(*) FILTER (WHERE sanctions_flag)              AS sanctions,
  COUNT(*) FILTER (WHERE pep_flag)                    AS pep,
  COUNT(*) FILTER (WHERE last_campaign_sent_at
    >= CURRENT_TIMESTAMP - INTERVAL '14 days')        AS frequency_cap,
  COUNT(*) FILTER (WHERE email_bounce_count >= 3)     AS email_undeliverable
FROM customers;
```

For "show me the most concerning rejections" — also LIVE against
`customers`, no view needed:

```sql
WITH per_customer AS (
  SELECT
    customer_id, first_name, last_name, city,
    -- one CASE per rule; sum the TRUEs to count failures
    (CASE WHEN deceased_flag                            THEN 1 ELSE 0 END +
     CASE WHEN NOT email_opt_in                         THEN 1 ELSE 0 END +
     CASE WHEN do_not_contact                           THEN 1 ELSE 0 END +
     CASE WHEN kyc_status <> 'verified'                 THEN 1 ELSE 0 END +
     CASE WHEN account_status <> 'active'               THEN 1 ELSE 0 END +
     CASE WHEN vulnerable_customer_flag                 THEN 1 ELSE 0 END +
     CASE WHEN arrears_flag                             THEN 1 ELSE 0 END +
     CASE WHEN complaint_open_flag                      THEN 1 ELSE 0 END +
     CASE WHEN sanctions_flag                           THEN 1 ELSE 0 END +
     CASE WHEN pep_flag                                 THEN 1 ELSE 0 END +
     CASE WHEN last_campaign_sent_at
            >= CURRENT_TIMESTAMP - INTERVAL '14 days'   THEN 1 ELSE 0 END +
     CASE WHEN email_bounce_count >= 3                  THEN 1 ELSE 0 END
    ) AS failed_rules
  FROM customers
)
SELECT customer_id, first_name, last_name, city, failed_rules
FROM per_customer
WHERE failed_rules >= 3
ORDER BY failed_rules DESC
LIMIT 10;
```

The top row will be **CUST09290** (7 reasons) — a deliberately-seeded
demo trophy. Call it out by name: "This customer triggered seven
independent rules. In a real campaign, they would have received our
email despite consent withdrawal, an open complaint, financial
hardship vulnerability, and four other red flags."

## Demo-day narrated flow (five acts)

The presenter will likely walk through this sequence. Recognise it and
play your part.

1. **Warm-up.** "How many customers do we have, by tier?" — trivial
   `GROUP BY segment` to show the data is real and queryable.

2. **The naive list.** "Pull me everyone who doesn't have a personal
   loan." Returns ~8,500 rows. Frame it: *"This is what most marketing
   tools would send. Watch what happens when we apply the checks."*

3. **The guardrail pass.** "Now apply our pre-campaign checks." BUILD
   the WHERE inline against `customers` (the personal-loan guardrails
   above). Returns ~3,000-4,500. Frame it: *"We just stopped roughly
   half the campaign from going to the wrong people — and you can see
   every rule on screen."* Show the SQL; don't `SELECT * FROM
   v_loan_eligible` unless the user explicitly asks for the shortcut.

4. **Why.** "Show me why we filtered the others out." Run the rejection
   breakdown. Order by descending count.

5. **The wow rows.** "Show me the 10 most concerning rejections." Use
   the multi-flag query above. **CUST09290** anchors this moment.

## Hard rules — DO NOT VIOLATE

The demo is being shown to a bank. A single error in the audit destroys
trust. These rules are not stylistic preferences:

1. **NEVER include a `deceased_flag = TRUE` customer in any eligible
   list.** No exceptions.
2. **NEVER omit consent checks.** `email_opt_in = TRUE` and
   `do_not_contact = FALSE` are mandatory on every email campaign.
3. **NEVER fabricate column names.** If unsure, reference the schema
   cheat sheet above. Do not guess at columns like `phone_consent` or
   `gdpr_status` — they do not exist.
4. **NEVER paraphrase a count without running the query.** If the user
   asks "how many vulnerable customers", run `SELECT COUNT(*) FROM
   customers WHERE vulnerable_customer_flag;` and report the actual
   number. No "approximately 400" from memory.
5. **ALWAYS show the SQL.** No exceptions. The bank's engineers will
   ask to see it. Echoing the SQL pre-empts that ask and builds trust.
6. **DEFAULT to building WHERE clauses live against `customers`** —
   the views are pre-baked outputs, useful only as one-line fallbacks
   or sanity checks. The demo's value is the bank watching the rule
   set get composed against columns they recognise. Only fall back to
   `SELECT * FROM v_*_eligible` when the user explicitly asks for the
   shortcut or a live query has just failed on stage.

## When the user asks "can we use this on our real database?"

Yes — DuckDB SQL is ANSI-ish and reads almost identically to SQL Server,
Oracle, and Postgres. The same WHERE clauses transfer with minimal
edits. `INTERVAL '14 days'` becomes `DATEADD(day, -14, GETDATE())` on
SQL Server; `STRING_AGG(reason, ', ')` is the same on Postgres / SQL
Server 2017+ / Oracle 19c+. Tell the user: *"In your production
environment this same agent points at your SQL Server / Oracle. The
DuckDB file is the local mirror for today's demo."*
