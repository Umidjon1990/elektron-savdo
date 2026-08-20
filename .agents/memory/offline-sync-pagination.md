---
name: Offline sync pagination
description: Why catalog and transaction browsing must be separated from authoritative POS offline synchronization.
---

Paginate large browsing surfaces independently, but do not replace the POS product or transaction reconciliation feed with a single page. A partial authoritative feed can make valid offline records appear missing and can corrupt local totals.

**Why:** A partial authoritative feed can make valid offline records appear missing, duplicate reconciliation work, or produce incorrect local totals. Correctness is more important than reducing the sync payload without a complete cursor protocol.

**How to apply:** When optimizing product or transaction contexts, first design cursor-based incremental sync with deletion/tombstone handling, deterministic ordering, resumability, and server-side aggregate totals. Until then, use separate paginated queries for admin/history UI.