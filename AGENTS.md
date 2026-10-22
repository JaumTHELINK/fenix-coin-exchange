# Project conventions

- Render the application brand through the shared BrandLogo component backed by a Lovable Assets pointer; keep favicon and install icons as square, padded derivatives of the same source so branding stays consistent.
- Keep system redemptions in public.system_orders and process approval/refunds through admin-validated RPCs; this preserves the existing required partner-store association and prevents client-side financial updates.
- Use src/lib/orders.ts for system-order filtering and archival grouping so admin order rules remain independently testable.
- Synchronize store activation and merchant roles through a database trigger, restricted to administrators; this makes role removal atomic with store deactivation across every UI path.
- Use server-computed available partner-store IDs in catalog and product details, including for admins; RLS retains management access while order insertion guards prevent redemption from unavailable owners.