export const applyNameMask = (v) => {
  if (!v) return "";
  return String(v).replace(/[^a-zA-ZÀ-ÿ\s]/g, "");
};

export const applyPhoneMask = (v) => {
  if (!v) return "";
  v = String(v).replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
  }
  if (v.length > 9) {
    v = v.replace(/(\d{4,5})(\d{4})$/, "$1-$2");
  }
  return v;
};

export const applyCpfCnpjMask = (v) => {
  if (!v) return "";
  v = String(v).replace(/\D/g, "");
  if (v.length <= 11) {
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }
  return v;
};

export const validarCPF = (cpf) => {
  if (!cpf) return false;
  cpf = String(cpf).replace(/[^\d]+/g, "");
  if (cpf === "" || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0,
    resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf.substring(10, 11));
};

export const validarCNPJ = (cnpj) => {
  if (!cnpj) return false;
  cnpj = String(cnpj).replace(/[^\d]+/g, "");
  if (cnpj === "" || cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != digitos.charAt(0)) return false;
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado == digitos.charAt(1);
};

export const validarDocumento = (doc) => {
  if (!doc) return false;
  const clean = String(doc).replace(/[^\d]+/g, "");
  if (clean.length === 11) return validarCPF(clean);
  if (clean.length === 14) return validarCNPJ(clean);
  return false;
};
