export type SandwichVersion = 'smart' | 'super'

export interface CatalogVersion {
  breadFactor: number
}

export interface OfficialCatalogItem {
  id: string
  name: string
  category: 'chef' | 'classic'
  aliases: readonly string[]
  official: true
  legacy: false
  versions: Record<SandwichVersion, CatalogVersion>
}

export interface LegacyCatalogItem {
  id: string
  name: string
  aliases: readonly string[]
  official: false
  legacy: true
  breadFactor: number
}

export type CatalogItem = OfficialCatalogItem | LegacyCatalogItem

export interface PhysicalMovementInput {
  opening: number
  produced: number
  waste: number
  courtesy: number
  finalStock: number
}

export type ReconciliationStatus = 'balanced' | 'attention' | 'critical'

export interface ClosingReconciliation {
  physicalMovement: number
  salesEquivalent: number
  difference: number
  absoluteDifference: number
  tolerance: number
  status: ReconciliationStatus
}
