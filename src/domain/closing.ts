import type {
  ClosingReconciliation,
  PhysicalMovementInput,
  ReconciliationStatus,
} from './types'

export const DEFAULT_TOLERANCE = 0.5
function validateCount(label: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} deve ser um número válido`)
  }

  if (value < 0) {
    throw new Error(`${label} não pode ser negativa`)
  }
}

export function calculatePhysicalMovement(input: PhysicalMovementInput): number {
  validateCount('Abertura', input.opening)
  validateCount('Produção', input.produced)
  validateCount('Desperdício', input.waste)
  validateCount('Cortesia', input.courtesy)
  validateCount('Sobra final', input.finalStock)

  return (
    input.opening +
    input.produced -
    input.waste -
    input.courtesy -
    input.finalStock
  )
}

function reconciliationStatus(
  absoluteDifference: number,
  tolerance: number,
): ReconciliationStatus {
  if (absoluteDifference < 0.001) {
    return 'balanced'
  }

  if (absoluteDifference <= tolerance) {
    return 'attention'
  }

  return 'critical'
}

export function reconcileClosing(
  physicalMovement: number,
  salesEquivalent: number,
  tolerance = DEFAULT_TOLERANCE,
): ClosingReconciliation {
  validateCount('Movimentação física', physicalMovement)
  validateCount('Equivalente de vendas', salesEquivalent)
  validateCount('Tolerância', tolerance)

  const difference = salesEquivalent - physicalMovement
  const absoluteDifference = Math.abs(difference)

  return {
    physicalMovement,
    salesEquivalent,
    difference,
    absoluteDifference,
    tolerance,
    status: reconciliationStatus(absoluteDifference, tolerance),
  }
}
