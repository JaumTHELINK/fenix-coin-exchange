import { describe, it, expect } from "vitest";
import { productAvailable } from "@/lib/catalog";
describe("catalog availability", () => {
  it("hides products when their store or owner is unavailable", () => {
    expect(productAvailable({ active: true, store_id: "disabled-owner-store" }, [])).toBe(false);
  });
  it("hides deactivated products even for administrators", () => {
    expect(productAvailable({ active: false, store_id: null }, [])).toBe(false);
  });
  it("allows active partner products only for available stores", () => {
    expect(productAvailable({ active: true, store_id: "active-store" }, ["active-store"])).toBe(true);
  });
});