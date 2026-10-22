import { afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Explicit opt-in: run only against an approved test store with an admin session.
const token = process.env.STORE_ACCESS_TEST_TOKEN;
const storeId = process.env.STORE_ACCESS_TEST_STORE;
const ownerId = process.env.STORE_ACCESS_TEST_OWNER;
const client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
});

describe.skipIf(!token || !storeId || !ownerId)("store activation synchronizes access", () => {
  afterAll(async () => {
    if (storeId) await client.from("stores").update({ active: false }).eq("id", storeId);
  });
  it("reactivation restores merchant access", async () => {
    if (!storeId || !ownerId) throw new Error("Missing approved test store");
    const update = await client.from("stores").update({ active: true }).eq("id", storeId);
    expect(update.error).toBeNull();
    const roles = await client.from("user_roles").select("role").eq("user_id", ownerId);
    expect(roles.error).toBeNull();
    expect(roles.data?.map(r => r.role)).toContain("lojista");
  });
  it("deactivation removes merchant access but preserves the active user", async () => {
    if (!storeId || !ownerId) throw new Error("Missing approved test store");
    const update = await client.from("stores").update({ active: false }).eq("id", storeId);
    expect(update.error).toBeNull();
    const roles = await client.from("user_roles").select("role").eq("user_id", ownerId);
    expect(roles.error).toBeNull();
    expect(roles.data?.map(r => r.role)).not.toContain("lojista");
    const profile = await client.from("profiles").select("is_active").eq("user_id", ownerId).single();
    expect(profile.error).toBeNull();
    expect(profile.data?.is_active).toBe(true);
  });
});