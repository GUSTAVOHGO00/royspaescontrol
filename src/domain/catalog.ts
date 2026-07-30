import type {
  CatalogItem,
  LegacyCatalogItem,
  OfficialCatalogItem,
} from './types'

const VERSIONS = {
  smart: { breadFactor: 0.5 },
  super: { breadFactor: 1 },
} as const

function officialItem(
  id: string,
  name: string,
  category: OfficialCatalogItem['category'],
  aliases: readonly string[] = [],
): OfficialCatalogItem {
  return {
    id,
    name,
    category,
    aliases: [normalizeCatalogName(name), ...aliases],
    official: true,
    legacy: false,
    versions: VERSIONS,
  }
}

export function normalizeCatalogName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’']/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

export const OFFICIAL_V5_CATALOG: readonly OfficialCatalogItem[] = [
  officialItem('steak', 'Steak', 'chef'),
  officialItem('almondega', 'Almôndega', 'chef', ['ALMONDEGA']),
  officialItem('rosbife', 'Rosbife', 'chef', ['ROAST BEEF']),
  officialItem('camarao-cream-cheese', 'Camarão com Cream Cheese', 'chef', [
    'CAMARAO C CREAM CHEESE',
    'CAMARAO CREAM CHEESE',
  ]),
  officialItem(
    'carne-seca-cream-cheese',
    'Carne Seca com Cream Cheese',
    'chef',
    ['CARNE SECA C CREAM CHEESE', 'CARNE SECA CREAM CHEESE'],
  ),
  officialItem('choripan', 'Choripán', 'chef', ['CHORIPAN']),
  officialItem('frango', 'Frango', 'classic'),
  officialItem('frango-cream-cheese', 'Frango com Cream Cheese', 'classic', [
    'FRANGO C CREAM CHEESE',
    'FRANGO CREAM CHEESE',
  ]),
  officialItem('frango-crispy-king', 'Frango Crispy King', 'classic', ['CRISPY KING']),
  officialItem('frango-crispy-royal', 'Frango Crispy Royal', 'classic', ['CRISPY ROYAL']),
  officialItem('smash-blend', 'Smash Blend', 'classic', ['SMASH']),
]

export const LEGACY_CATALOG: readonly LegacyCatalogItem[] = [
  {
    id: 'legacy-integrador-padrao',
    name: 'Integrador Padrão',
    aliases: ['INTEGRADOR PADRAO'],
    official: false,
    legacy: true,
    breadFactor: 0.5,
  },
  {
    id: 'legacy-roys-essencial-1',
    name: "Roy's Essencial 1",
    aliases: ['ROYS ESSENCIAL 1'],
    official: false,
    legacy: true,
    breadFactor: 0.5,
  },
  {
    id: 'legacy-roys-essencial-2',
    name: "Roy's Essencial 2",
    aliases: ['ROYS ESSENCIAL 2'],
    official: false,
    legacy: true,
    breadFactor: 1,
  },
  {
    id: 'legacy-double-smash',
    name: 'Double Smash',
    aliases: ['DOUBLE SMASH'],
    official: false,
    legacy: true,
    breadFactor: 1,
  },
  {
    id: 'legacy-crispy-lover',
    name: 'Crispy Lover',
    aliases: ['CRISPY LOVER'],
    official: false,
    legacy: true,
    breadFactor: 1,
  },
  {
    id: 'legacy-trio-mix',
    name: 'Trio Mix',
    aliases: ['TRIO MIX'],
    official: false,
    legacy: true,
    breadFactor: 1.5,
  },
  {
    id: 'legacy-big-king',
    name: 'Big King',
    aliases: ['BIG KING'],
    official: false,
    legacy: true,
    breadFactor: 2,
  },
  {
    id: 'legacy-mega-mix',
    name: 'Mega Mix',
    aliases: ['MEGA MIX'],
    official: false,
    legacy: true,
    breadFactor: 2,
  },
]

export const CATALOG: readonly CatalogItem[] = [
  ...OFFICIAL_V5_CATALOG,
  ...LEGACY_CATALOG,
]

export function findCatalogItem(value: string): CatalogItem | undefined {
  const normalized = normalizeCatalogName(value)

  return CATALOG.find((item) =>
    item.aliases.some((alias) => normalizeCatalogName(alias) === normalized),
  )
}
