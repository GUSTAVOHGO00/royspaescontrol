import { expect, test } from "vitest";
import { parseReport } from "./reportParser";

test("preserva preço brasileiro com separador de milhar como um único valor", () => {
  const result = parseReport(`
    SUPER
    88001 STEAK 2 R$ 1.234,56 R$ 2.469,12
  `);

  expect(result.items[0]).toMatchObject({
    quantity: 2,
    unitPrice: 1234.56,
    totalPrice: 2469.12,
  });
});
