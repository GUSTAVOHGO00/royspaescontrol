import { describe, expect, it } from 'vitest'
import {
  OFFICIAL_V5_CATALOG,
  findCatalogItem,
  normalizeCatalogName,
} from './catalog'

describe('catálogo oficial V5', () => {
  it('contém os 11 sanduíches oficiais, cada um nas versões Smart e Super', () => {
    expect(OFFICIAL_V5_CATALOG).toHaveLength(11)

    for (const item of OFFICIAL_V5_CATALOG) {
      expect(item.official).toBe(true)
      expect(item.versions).toEqual({
        smart: { breadFactor: 0.5 },
        super: { breadFactor: 1 },
      })
    }
  })

  it('normaliza caixa, espaços e acentos para tornar a busca resistente ao OCR', () => {
    expect(normalizeCatalogName('  Almôndega  ')).toBe('ALMONDEGA')
    expect(normalizeCatalogName('Camarão com   Cream Cheese')).toBe(
      'CAMARAO COM CREAM CHEESE',
    )
  })

  it('encontra Almôndega pelo alias sem acento', () => {
    const match = findCatalogItem('ALMONDEGA')

    expect(match?.name).toBe('Almôndega')
    expect(match?.legacy).toBe(false)
  })

  it('mantém aliases legados identificados de forma explícita', () => {
    const legacy = findCatalogItem('ROYS ESSENCIAL 1')

    expect(legacy).toMatchObject({
      official: false,
      legacy: true,
      breadFactor: 0.5,
    })
  })
})
