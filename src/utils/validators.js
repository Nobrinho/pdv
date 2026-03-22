// =============================================================
// validators.js — Máscaras e validações centralizadas do SysControl
// =============================================================

/**
 * Aplica máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
 */
export const applyCpfCnpjMask = (value) => {
  if (!value) return "";
  let clean = value.replace(/\D/g, "");
  if (clean.length <= 11) {
    // CPF
    clean = clean.slice(0, 11);
    return clean
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    // CNPJ
    clean = clean.slice(0, 14);
    return clean
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }
};

/**
 * Valida CPF ou CNPJ matematicamente (Módulo 11)
 * Retorna true se válido, false caso contrário
 */
export const validarDocumento = (value) => {
  if (!value) return false;
  const clean = value.replace(/\D/g, "");

  if (clean.length === 11) {
    // CPF
    if (/^(\d)\1+$/.test(clean)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
    let r = (sum * 10) % 11;
    if (r === 10 || r === 11) r = 0;
    if (r !== parseInt(clean[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
    r = (sum * 10) % 11;
    if (r === 10 || r === 11) r = 0;
    return r === parseInt(clean[10]);
  }

  if (clean.length === 14) {
    // CNPJ
    if (/^(\d)\1+$/.test(clean)) return false;
    const calc = (s, n) => {
      let sum = 0;
      let pos = n - 7;
      for (let i = s; i >= 1; i--) {
        sum += parseInt(clean[s - i]) * pos--;
        if (pos < 2) pos = 9;
      }
      return sum % 11 < 2 ? 0 : 11 - (sum % 11);
    };
    return calc(12, 5) === parseInt(clean[12]) && calc(13, 6) === parseInt(clean[13]);
  }

  return false;
};

/**
 * Aplica máscara de nome — permite apenas letras e espaços
 */
export const applyNameMask = (value) => {
  return value.replace(/[^a-zA-ZÀ-ÿ\s]/g, "");
};

/**
 * Aplica máscara de telefone — formato (XX) XXXXX-XXXX
 */
export const applyPhoneMask = (value) => {
  if (!value) return "";
  let clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 10) {
    return clean
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return clean
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};
