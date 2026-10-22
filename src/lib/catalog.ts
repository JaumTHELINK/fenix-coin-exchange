export function productAvailable(product: { active: boolean; store_id: string | null }, availableStores: readonly string[]) {
  return product.active && (product.store_id === null || availableStores.includes(product.store_id));
}