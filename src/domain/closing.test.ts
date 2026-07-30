import { describe, expect, it } from 'vitest'
import { calculatePhysicalMovement, reconcileClosing } from './closing'

describe('movimentação física de pães', () => {
  it('calcula abertura + produzidos - desperdícios - cortesias - sobra', () => {
    expect(
      calculatePhysicalMovement({
        opening: 20,
        produced: 30,
        waste: 2,
        courtesy: 1,
        finalStock: 7,
      }),
    ).toBe(40)
  })

  it('rejeita contagens negativas', () => {
    expect(() =>
      calculatePhysicalMovement({
        opening: 20,
        produced: -1,
        waste: 0,
        courtesy: 0,
        finalStock: 5,
      }),
    ).toThrow('não pode ser negativa')
  })
})

describe('reconciliação do fechamento', () => {
  it('considera balanceada somente uma diferença igual a zero', () => {
    expect(reconcileClosing(40, 40).status).toBe('balanced')
  })

  it('sinaliza atenção quando há diferença dentro da tolerância de 0,5 pão', () => {
    expect(reconcileClosing(40, 39.5)).toEqual({
      physicalMovement: 40,
      salesEquivalent: 39.5,
      difference: -0.5,
      absoluteDifference: 0.5,
      tolerance: 0.5,
      status: 'attention',
    })
  })

  it('sinaliza como crítica uma diferença maior que a tolerância', () => {
    expect(reconcileClosing(40, 39).status).toBe('critical')
  })

  it('permite configurar a tolerância de atenção', () => {
    expect(reconcileClosing(40, 39, 1).status).toBe('attention')
  })
})
