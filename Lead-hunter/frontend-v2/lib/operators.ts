// Operadores fixos da Balmor. A identidade vem do LOGIN (Cloudflare Access
// injeta cf-access-authenticated-user-email em toda request) — sem seletor manual.

export interface Operator {
  id: string;
  name: string;
  shortName: string;
  initials: string;
}

const BY_EMAIL: Record<string, Operator> = {
  "samuelarmanelli2004@gmail.com": {
    id: "samuel",
    name: "Samuel Armanelli",
    shortName: "Samuel",
    initials: "SA",
  },
  "vini.ramosrock@gmail.com": {
    id: "jose",
    name: "José Vinícius",
    shortName: "José",
    initials: "JV",
  },
};

const BY_ID: Record<string, Operator> = Object.fromEntries(
  Object.values(BY_EMAIL).map((op) => [op.id, op])
);

export function operatorFromEmail(email: string | null): Operator | null {
  if (!email) return null;
  const known = BY_EMAIL[email.toLowerCase()];
  if (known) return known;
  const prefix = email.split("@")[0];
  return {
    id: prefix.toLowerCase(),
    name: email,
    shortName: prefix,
    initials: prefix.slice(0, 2).toUpperCase(),
  };
}

export function operatorById(id: string | null | undefined): Operator | null {
  if (!id) return null;
  return (
    BY_ID[id] ?? {
      id,
      name: id,
      shortName: id,
      initials: id.slice(0, 2).toUpperCase(),
    }
  );
}
