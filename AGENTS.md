# Project conventions

- Render the application brand through the shared BrandLogo component backed by a Lovable Assets pointer; keep favicon and install icons as square, padded derivatives of the same source so branding stays consistent.
- Keep system redemptions in public.system_orders and process approval/refunds through admin-validated RPCs; this preserves the existing required partner-store association and prevents client-side financial updates.
- Use src/lib/orders.ts for system-order filtering and archival grouping so admin order rules remain independently testable.