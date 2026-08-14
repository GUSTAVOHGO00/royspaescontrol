export type OperationalSection = "regular" | "essential" | "offers";

export interface OperationalReportItem {
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly section: OperationalSection;
  readonly breadFactor: number;
  readonly aliases: readonly string[];
}

export const OPERATIONAL_REPORT_ITEMS = [
  {
    id: "smart",
    label: "Subs Smart",
    shortLabel: "Smart",
    section: "regular",
    breadFactor: 0.5,
    aliases: ["SANDUICHE SMART", "SUBS SMART", "SMART"],
  },
  {
    id: "super",
    label: "Subs Super",
    shortLabel: "Super",
    section: "regular",
    breadFactor: 1,
    aliases: ["SANDUICHE SUPER", "SUBS SUPER", "SUPER"],
  },
  {
    id: "combo-smart",
    label: "Combos Smart",
    shortLabel: "Combo Smart",
    section: "regular",
    breadFactor: 0.5,
    aliases: ["COMBOS SMART", "COMBO SMART"],
  },
  {
    id: "combo-super",
    label: "Combos Super",
    shortLabel: "Combo Super",
    section: "regular",
    breadFactor: 1,
    aliases: ["COMBOS SUPER", "COMBO SUPER"],
  },
  {
    id: "integrator",
    label: "Integrador Padrão",
    shortLabel: "Integrador",
    section: "regular",
    breadFactor: 0.5,
    aliases: ["INTEGRADOR PADRAO", "INTEGRADOR"],
  },
  {
    id: "essential-1",
    label: "Roy's Essential 1",
    shortLabel: "Essential 1",
    section: "essential",
    breadFactor: 0.5,
    aliases: [
      "ROYS ESSENTIAL 1",
      "ROY'S ESSENTIAL 1",
      "ROYS ESSENCIAL 1",
      "ROY'S ESSENCIAL 1",
      "ESSENTIAL 1",
      "ESSENCIAL 1",
    ],
  },
  {
    id: "essential-2",
    label: "Roy's Essential 2",
    shortLabel: "Essential 2",
    section: "essential",
    breadFactor: 1,
    aliases: [
      "ROYS ESSENTIAL 2",
      "ROY'S ESSENTIAL 2",
      "ROYS ESSENCIAL 2",
      "ROY'S ESSENCIAL 2",
      "ESSENTIAL 2",
      "ESSENCIAL 2",
    ],
  },
  {
    id: "double-smash",
    label: "Double Smash",
    shortLabel: "Double Smash",
    section: "offers",
    breadFactor: 1,
    aliases: ["DOUBLE SMASH"],
  },
  {
    id: "crispy-lover",
    label: "Crispy Lover",
    shortLabel: "Crispy Lover",
    section: "offers",
    breadFactor: 1,
    aliases: ["CRISPY LOVER"],
  },
  {
    id: "trio-mix",
    label: "Trio Mix",
    shortLabel: "Trio Mix",
    section: "offers",
    breadFactor: 1.5,
    aliases: ["TRIO MIX"],
  },
  {
    id: "big-king",
    label: "Big King",
    shortLabel: "Big King",
    section: "offers",
    breadFactor: 2,
    aliases: ["BIG KING"],
  },
  {
    id: "mega-mix",
    label: "Mega Mix",
    shortLabel: "Mega Mix",
    section: "offers",
    breadFactor: 2,
    aliases: ["MEGA MIX"],
  },
] as const satisfies readonly OperationalReportItem[];

export type OperationalItemId = (typeof OPERATIONAL_REPORT_ITEMS)[number]["id"];

export interface OperationalReportGroup {
  readonly id: OperationalSection;
  readonly label: string;
  readonly description: string;
  readonly items: readonly OperationalItemId[];
}

export const OPERATIONAL_REPORT_GROUPS = [
  {
    id: "regular",
    label: "Cardápio regular",
    description: "Smart, Super, combos e integrador.",
    items: ["smart", "super", "combo-smart", "combo-super", "integrator"],
  },
  {
    id: "essential",
    label: "Roy's Essential",
    description: "Categoria própria, separada das ofertas.",
    items: ["essential-1", "essential-2"],
  },
  {
    id: "offers",
    label: "Ofertas especiais",
    description: "Ofertas com equivalências próprias de pão.",
    items: [
      "double-smash",
      "crispy-lover",
      "trio-mix",
      "big-king",
      "mega-mix",
    ],
  },
] as const satisfies readonly OperationalReportGroup[];

const OPERATIONAL_ITEMS_BY_ID = new Map(
  OPERATIONAL_REPORT_ITEMS.map((item) => [item.id, item]),
);

export function findOperationalItem(
  id: string,
): (typeof OPERATIONAL_REPORT_ITEMS)[number] | undefined {
  return OPERATIONAL_ITEMS_BY_ID.get(id as OperationalItemId);
}

export function operationalItemsForSection(section: OperationalSection) {
  return OPERATIONAL_REPORT_ITEMS.filter((item) => item.section === section);
}

const LEGACY_REPORT_KEY_ALIASES: Readonly<Record<string, OperationalItemId>> = {
  comboSmart: "combo-smart",
  comboSuper: "combo-super",
  essential1: "essential-1",
  essential2: "essential-2",
};

export function normalizeOperationalReport(
  report: Readonly<Record<string, number>>,
): Record<string, number> {
  const normalized = { ...report };
  for (const [legacyKey, canonicalKey] of Object.entries(
    LEGACY_REPORT_KEY_ALIASES,
  )) {
    if (
      normalized[canonicalKey] === undefined &&
      Number.isFinite(normalized[legacyKey])
    ) {
      normalized[canonicalKey] = normalized[legacyKey];
    }
    delete normalized[legacyKey];
  }
  return normalized;
}

export function calculateReportEquivalent(
  report: Readonly<Record<string, number>>,
): number {
  const normalized = normalizeOperationalReport(report);
  return OPERATIONAL_REPORT_ITEMS.reduce((total, item) => {
    const quantity = normalized[item.id];
    if (!Number.isFinite(quantity) || quantity === undefined || quantity <= 0) {
      return total;
    }

    return total + quantity * item.breadFactor;
  }, 0);
}
