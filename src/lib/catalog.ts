export const PRODUCTS = {
  oneToOne: { amount: 1000, orderName: "우리사주 1:1 관계 궁합 리포트" },
  oneToMany: { amount: 3000, orderName: "우리사주 1:다 관계 궁합 리포트" },
} as const;

export type ProductKey = keyof typeof PRODUCTS;

export function isProductKey(value: unknown): value is ProductKey {
  return typeof value === "string" && value in PRODUCTS;
}
