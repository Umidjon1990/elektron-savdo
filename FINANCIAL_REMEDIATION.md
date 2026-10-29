# Financial audit remediation

Base audit: 2026-10-25, commit `72875e9`. This change fixes forward processing;
it does not invent opening balances or rewrite historical transactions.

## Execution plan

1. Introduce tenant-scoped, atomic operations, durable request IDs, immutable audit
   records, purchase obligations, stock movements, and exact document arithmetic.
2. Route checkout, settlements, restock, expenses and cash through that engine.
   Create a delivery order with its sale in the same database transaction.
3. Preserve the offline outbox across logout and age; replay explicit reversals.
   Separate tenant caches and retain unassigned legacy records for reconciliation.
4. Use actual aggregates, UTC timestamps and Asia/Tashkent calendar boundaries.
   Distinguish account movements, sales revenue, COGS and operating expenses.
5. Run SQL/IndexedDB regression tests, typecheck, build and browser QA. Configure
   a production signing secret before pushing the fail-closed authentication code.

## Finding coverage

| Audit IDs | Change |
|---|---|
| F01, F20 | Immutable purchase principals and separate payments, transaction-wide settlement, explicit documented legacy opening. Sales never change purchase principal. |
| F02 | Locked, bounded, idempotent debt collection, including account and settlement date. |
| F03-F04 | Persistent tenant outbox, no time expiry, logout preservation, explicit void replay, no overwriting pending reversal with old server status. |
| F05 | Every checkout is priced on server, including legacy clients. Explicit offline snapshots preserve the existing trusted-cashier policy. |
| F06 | Immutable identity/tenant fields, entry allowlists and tenant-scoped reads/writes. |
| F07, F17 | Conditional SQL stock decrement, transaction rollback on shortage, delta restock, compare-and-set stock corrections; products with stock or unresolved supplier debt cannot be deleted. |
| F08-F13, F26 | Dated payment events, opening plus movements, separate accounts including Click/custom methods, negative balances visible. Supplier principal outflow is not operating expense. |
| F14-F15 | Real history charts, explicit Toshkent calendar and UTC server/DB connection contract. |
| F16, F18 | Dynamic percent adjustment, shared exact document total, unique payment methods and exact split equality. Stale cart requires confirmation. |
| F19, F24 | Bounded inputs, SQL constraints, Decimal arithmetic, NUMERIC money and preserved legacy REAL decimal text. Display rounding is separate. |
| F21 | Sale/order/delivery linked and written together; payment status follows settlements. Explicit full void refunds received money once and cancels linked delivery. |
| F22 | Public product DTO excludes costs, supplier obligations and exchange-rate fields. |
| F23 | Missing/offline net profit is marked unknown; unclassified old expenses are not silently treated as zero. |
| F25 | Append-only finance audit with actor, operation, before/after data; expenses/manual cash use soft reversal, not deletion; management roles enforced. |
| F27 | No static signing-key fallback; production startup requires JWT_SECRET (32+ characters). |

## Deliberate accounting limits

- Replacement cost remains the product's current cost. There is no new FIFO,
  batch valuation or reconstructed purchase history.
- Old supplier liabilities are **unknown**, not zero. The owner enters a
  documented remaining opening balance (including an explicitly confirmed zero).
  New purchase documents and payments are tracked independently from stock.
- Existing expenses without a classification/account remain unclassified. Net
  profit stays unknown until the owner reconciles them. Existing unspecified debt
  payment methods stay in an unknown account; no invented cash classification.
- Cash closing balance is opening movements plus subsequent account movements.
  An unrecorded real-world opening float still requires a documented cash entry.
- Full void requires explicit confirmation that received funds were refunded.
  Legacy payments with an unknown refund account require reconciliation first.
  Partial return/refund, currency trading gains, tax and commissions are not
  introduced by this patch.
- Standalone Nasiya remains a memo ledger, deliberately outside inventory/P&L/cash.
- UZS document totals and COGS round once to two decimal places; gross profit is
  their difference. Quantities accept six decimals; original USD inputs eight.
  Converting old REAL stock/USD to unconstrained NUMERIC preserves its stored
  decimal text; it cannot recover precision already lost before this change.

## Migration and rollback

Versioned startup migration is transactional and advisory-locked. It adds
journals and fields; it does not backfill guessed principal or remove records.
New CHECK constraints are NOT VALID for historical rows: new writes are checked,
old anomalies need explicit review. Existing timestamps continue to mean UTC.

Keep the prior deployment as a rollback point. Rolling code back does not undo
the new journal entries; do not drop the journals or cast money back to INTEGER.
If rolling back, stop financial writes until compatibility is assessed. Changing
JWT_SECRET invalidates old sessions: users sign in again; local pending sales
are retained. Previously deleted offline records cannot be recreated from code.

## Validation scope

`node --import tsx --test tests/*.test.ts`, `npm run check`, and
`node --import tsx script/build.ts` are the release checks. SQL tests use isolated
PGlite/PostgreSQL with no production credentials; the adapter serializes its
single connection. They exercise rollback, duplicate attempts, shortages,
settlement, linked delivery, legacy reconciliation and audit. They are not a
multi-connection Railway load/lock test. IndexedDB tests use fake-indexeddb.
Browser QA uses synthetic API responses, including desktop/mobile dialogs.

The private production transaction history was not available during the audit;
historical loss/recovery totals have not been certified.

## Follow-up review (2026-10-29)

Production still runs the `main` source; the October 25 financial changes were
only on `fix/financial-audit-2026-10-25`. The follow-up branch includes those
changes and corrects these additional cases:

- Online attempts keep current-price validation during replay. Percentage
  adjustment intent survives local persistence and upload.
- Catalog/category responses are discarded after a tenant or token change.
  Catalog replacement and metadata writes are atomic in IndexedDB.
- Legacy v1 local sales without tenant identity remain unattributed for owner
  reconciliation. The account active during upgrade is not proof of ownership.
- A void queued while an upload is in flight is preserved and sent explicitly.
  Acknowledged sales replay only their reversal, including when later debt
  collections changed their paid balance. Failed reversal retries never recreate
  the original checkout.
- Daily reports enumerate calendar days, including the final day of a partial
  day range. The SQL query continues to honor the exact requested timestamps.
- Reusing a new sale ID with different initial collection/customer information
  is rejected. Invalid sale dates fail validation before any database operation.
- Checkout attempts include tenant/delivery identity and reset on session
  changes. Authentication, timeout and rate-limit responses retain the outbox.

Release prerequisites: set a strong production `JWT_SECRET` before deploying
the fail-closed code, retain a database backup/previous deployment, then apply
the versioned startup migration in a controlled release. Existing sessions must
sign in again. Supplier opening balances and unclassified historical expenses
still require documents; no historical balances are invented by this patch.

Follow-up validation: 49 SQL/IndexedDB/pricing/inventory tests; TypeScript check;
client/server production build. The build is invoked with
`node --import tsx script/build.ts` in hosts that prohibit the tsx CLI IPC pipe.
No live financial writes, configuration changes or deployment were performed
during this follow-up review.

## Release verification (2026-10-25)

- 41 automated tests passed (20 existing, 16 SQL/finance, 5 IndexedDB/retry).
- TypeScript check passed with no errors. Existing JSON-schema inference and
  target settings were corrected as part of obtaining a clean check.
- Client/server production build passed.
- Browser checks passed for inventory debt scope, supplier opening confirmation,
  expense account selection, unknown net profit, real empty history, and mobile
  opening dialog. Test data and all API responses were synthetic.
