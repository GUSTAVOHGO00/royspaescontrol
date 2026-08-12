const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export function normalizeStoreUsername(value: string): string {
  const normalized = value.trim().toLocaleLowerCase("pt-BR");
  if (normalized.length < 3) {
    throw new Error("O login precisa ter pelo menos 3 caracteres.");
  }
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new Error("Use somente letras, números, ponto, hífen ou sublinhado.");
  }
  return normalized;
}

export function storeUsernameToEmail(value: string): string {
  return `${normalizeStoreUsername(value)}@lojas.roys.internal`;
}
