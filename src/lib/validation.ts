export const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

export const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const validateCPF = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(digits[10]);
};

export const validatePhone = (phone: string): boolean =>
  phone.replace(/\D/g, "").length >= 10;

export const passwordRules = [
  { id: "length", label: "Pelo menos 8 caracteres", test: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "Uma letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "Uma letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "Um número", test: (p: string) => /\d/.test(p) },
  { id: "special", label: "Um caractere especial (!@#$...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const isPasswordStrong = (p: string): boolean =>
  passwordRules.every((rule) => rule.test(p));

export const formatCNPJ = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

export const validateCNPJ = (cnpj: string): boolean => {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + parseInt(d[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(d[12]) && calc(13) === parseInt(d[13]);
};

/** Formats as CPF up to 11 digits, CNPJ beyond that. */
export const formatDocument = (value: string) =>
  value.replace(/\D/g, "").length > 11 ? formatCNPJ(value) : formatCPF(value);

export const validateDocument = (value: string): boolean => {
  const len = value.replace(/\D/g, "").length;
  return len === 14 ? validateCNPJ(value) : validateCPF(value);
};

/** Login identifier: CPF/CNPJ (digits only) mapped to an internal, non-deliverable auth address. */
export const CPF_LOGIN_DOMAIN = "cpf.ecoteiner.app";
export const cpfToLoginEmail = (doc: string): string =>
  `${doc.replace(/\D/g, "")}@${CPF_LOGIN_DOMAIN}`;
export const isCpfLoginEmail = (email?: string | null): boolean =>
  !!email && email.endsWith(`@${CPF_LOGIN_DOMAIN}`);
