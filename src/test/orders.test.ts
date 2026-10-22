import { describe, expect, it } from "vitest";
import { orderGroup } from "@/lib/orders";

describe("procedimentos dos pedidos", () => {
  const now = Date.parse("2026-10-22T16:00:00Z");
  it("mantém pendentes destacados mesmo após um dia", () => {
    expect(orderGroup({ status: "pendente", updated_at: "2026-10-20T16:00:00Z" }, now)).toBe("pending");
  });
  it("separa aprovados nas primeiras 24 horas", () => {
    expect(orderGroup({ status: "entregue", updated_at: "2026-10-21T16:00:00Z" }, now)).toBe("received");
  });
  it("arquiva aprovados após mais de 24 horas", () => {
    expect(orderGroup({ status: "entregue", updated_at: "2026-10-21T15:59:59Z" }, now)).toBe("archived");
  });
  it("arquiva cancelados após mais de 24 horas", () => {
    expect(orderGroup({ status: "cancelado", updated_at: "2026-10-20T16:00:00Z" }, now)).toBe("archived");
  });
});