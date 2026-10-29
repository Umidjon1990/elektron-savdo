# POS reports and subscription controls

The POS uses one period and one receipt set for its four cards and their detail
dialogs. The old monthly card is removed. Today and yesterday, a date, a month,
or an inclusive date range use Asia/Tashkent calendar boundaries on every device.
Revenue includes credit sales; gross profit subtracts frozen historical cost.
Later debt collections are not new revenue. Voids/refunds are excluded from the
cards; voided receipts can be inspected separately. Product quantities are grouped
by unit rather than adding kilograms to pieces. Details include line adjustments.
Document rounding remainders are allocated to product details so their totals
reconcile; inconsistent historical snapshots are flagged instead of hidden.

`GET /api/pos/report` reads the complete tenant-scoped range in a repeatable-read
snapshot, without list pagination. The browser merges unsent local operations by
ID without counting acknowledged sales twice. Missing connectivity is labelled
as a local, unconfirmed snapshot. Checkout/reversal/sync invalidate the report;
visible pages also refresh every 30 seconds and on focus.

All subscription plans honor `trialEnd` as the single expiry instant. The old
`subscriptionDays` field is descriptive, not the access-control condition.
Suspended accounts are blocked independently of their expiry. Signed-in expired
accounts can inspect their own session and subscription to recover after payment;
business API reads and writes remain forbidden. Super admins can manage expired
tenants. Access checks load current tenant data rather than a five-minute cache.

Tenant editing defaults to **keep the existing term**. Explicit operations are:
set a future date/time in Toshkent, extend a dated subscription, or make it
unlimited. Extension starts from the later of the current deadline or now.
Quick +30-day extensions include the expected prior deadline; the server locks
the tenant row and rejects concurrent stale edits. Creation also offers a day
count. Invalid/fractional/negative/excessive terms are rejected.

Client countdowns anchor to server time and advance with a monotonic clock.
There is a small corner indicator, a full-screen warning within 72 hours with an
explicit acknowledgement (remembered per user/tenant/deadline in that browser),
and an expiry screen that removes the business interface. A heartbeat every 30
seconds, plus focus/online checks, detects renewal and restores access. There is
also a manual recheck button. An offline browser still reaches its known expiry.

Super admins get in-app subscription notices and a searchable/filterable tenant
list with live countdowns, exact end dates, expiry counts and quick renewals.
Notices are derived from current saved deadlines, so expiration is visible on
the next visit without depending on a browser tab having stayed open. These are
in-app notifications; no external messages are sent.

Validation uses synthetic SQL/IndexedDB/API fixtures and browser scenarios for
desktop/mobile cards, date selection, warning acknowledgement across reload,
timed expiry, renewal without reload, and super-admin term editing. Production
customer data was not changed. This feature uses existing tenant columns and
adds no migration of its own; its financial base branch still requires the
documented JWT secret and financial startup migration before production rollout.
