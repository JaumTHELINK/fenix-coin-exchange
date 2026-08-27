import { describe, it, expect } from "vitest";
import {
  formatCPF,
  formatPhone,
  validateCPF,
  validatePhone,
  isPasswordStrong,
  passwordRules,
} from "@/lib/validation";

describe("validateCPF", () => {
  it("aceita CPFs válidos", () => {
    expect(validateCPF("529.982.247-25")).toBe(true);
    expect(validateCPF("52998224725")).toBe(true);
    expect(validateCPF("111.444.777-35")).toBe(true);
  });

  it("rejeita dígitos verificadores errados", () => {
    expect(validateCPF("529.982.247-24")).toBe(false);
    expect(validateCPF("111.444.777-30")).toBe(false);
  });

  it("rejeita sequências repetidas", () => {
    expect(validateCPF("000.000.000-00")).toBe(false);
    expect(validateCPF("111.111.111-11")).toBe(false);
    expect(validateCPF("99999999999")).toBe(false);
  });

  it("rejeita tamanho inválido ou vazio", () => {
    expect(validateCPF("")).toBe(false);
    expect(validateCPF("529982247")).toBe(false);
    expect(validateCPF("529982247251")).toBe(false);
    expect(validateCPF("abc.def.ghi-jk")).toBe(false);
  });

  it("cobre o caso de resto 10 (dígito 0)", () => {
    // CPF cujo cálculo gera resto 10 -> dígito deve virar 0
    expect(validateCPF("400.000.000-00")).toBe(false);
    expect(validateCPF("153.996.740-01")).toBe(false);
  });
});

describe("formatCPF", () => {
  it("aplica a máscara progressivamente", () => {
    expect(formatCPF("529")).toBe("529");
    expect(formatCPF("5299")).toBe("529.9");
    expect(formatCPF("529982")).toBe("529.982");
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
  });

  it("descarta caracteres não numéricos e excesso", () => {
    expect(formatCPF("a5b2c9d9e8f2g2h4i7j2k5")).toBe("529.982.247-25");
    expect(formatCPF("52998224725999")).toBe("529.982.247-25");
  });
});

describe("formatPhone", () => {
  it("formata celular e fixo", () => {
    expect(formatPhone("11999998888")).toBe("(11) 99999-8888");
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
  });

  it("formata parcialmente durante a digitação", () => {
    expect(formatPhone("1")).toBe("1");
    expect(formatPhone("11")).toBe("11");
    expect(formatPhone("119")).toBe("(11) 9");
    expect(formatPhone("(11) 99999-88889999")).toBe("(11) 99999-8888");
  });
});

describe("validatePhone", () => {
  it("exige ao menos 10 dígitos", () => {
    expect(validatePhone("(11) 3333-4444")).toBe(true);
    expect(validatePhone("(11) 99999-8888")).toBe(true);
    expect(validatePhone("(11) 9999-444")).toBe(false);
    expect(validatePhone("")).toBe(false);
  });
});

describe("regras de senha", () => {
  it("aprova senha que cumpre todos os requisitos", () => {
    expect(isPasswordStrong("Ecoteiner#2026")).toBe(true);
  });

  it("reprova senha faltando um requisito", () => {
    expect(isPasswordStrong("ecoteiner#2026")).toBe(false); // sem maiúscula
    expect(isPasswordStrong("ECOTEINER#2026")).toBe(false); // sem minúscula
    expect(isPasswordStrong("Ecoteiner#abc")).toBe(false); // sem número
    expect(isPasswordStrong("Ecoteiner2026")).toBe(false); // sem especial
    expect(isPasswordStrong("Eco#26")).toBe(false); // curta
    expect(isPasswordStrong("")).toBe(false);
  });

  it("expõe 5 regras com rótulos", () => {
    expect(passwordRules).toHaveLength(5);
    passwordRules.forEach((r) => expect(r.label.length).toBeGreaterThan(0));
  });
});
