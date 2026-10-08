import type { CatalogQuery } from './types';

/** Chaves do TanStack Query num lugar só. */
export const qk = {
  me: ['me'] as const,
  catalog: (params: CatalogQuery) => ['catalog', params] as const,
  catalogFilters: ['catalog', 'filters'] as const,
  categories: ['categories'] as const,
  product: (id: string) => ['product', id] as const,
  productReviews: (id: string) => ['product', id, 'reviews'] as const,
  reviewEligibility: (id: string) => ['product', id, 'review-eligibility'] as const,
  storesNearby: (lat: number, lng: number) => ['stores', 'nearby', lat, lng] as const,
  orders: (status?: string) => ['orders', status ?? 'all'] as const,
  order: (id: string) => ['order', id] as const,
  paymentStatus: (orderId: string) => ['order', orderId, 'payment'] as const,
  cashback: ['cashback'] as const,
  notifications: ['notifications'] as const,

  /** Área do parceiro. Prefixo próprio para invalidar o ramo inteiro depois de salvar. */
  partnerProducts: ['partner', 'products'] as const,
  partnerStores: ['partner', 'stores'] as const,
  partnerProductStores: (productId: string) =>
    ['partner', 'products', productId, 'stores'] as const,
};
