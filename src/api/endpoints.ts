import type { HttpClient } from './http';
import type {
  AppNotification,
  AuthResponse,
  CardInput,
  CashbackEntry,
  CatalogFilters,
  CatalogQuery,
  CatalogResult,
  Category,
  Message,
  NearbyStore,
  NotificationPrefs,
  Order,
  Partner,
  PartnerStore,
  PaymentMethod,
  PaymentSnapshot,
  Product,
  ProductReviews,
  ProductStoreStockPage,
  ProductUpsert,
  RedeemResult,
  ReviewEligibility,
  ReviewItem,
  User,
} from './types';

const enc = encodeURIComponent;

/** Monta a query string ignorando o que está vazio (a API trata ausência como "sem filtro"). */
function qs(params: Record<string, string | number | undefined | null>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${enc(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/** Endpoints da API do hub (/api/v1). Cada função mapeia 1:1 uma rota do backend. */
export function createApi(http: HttpClient) {
  return {
    auth: {
      login: (email: string, password: string) => http.postPublic<AuthResponse>('/auth/login', { email, password }),
      /** O cadastro de parceiro fica só na web — o app é a área do cliente (passageiro/motorista). */
      register: (input: { name: string; email: string; password: string; phone?: string; cpf?: string; role: 'Passenger' | 'Driver' }) =>
        http.postPublic<AuthResponse>('/auth/register', input),
      forgotPassword: (email: string) => http.postPublic<Message>('/auth/forgot-password', { email }),
      resetPassword: (token: string, newPassword: string) => http.postPublic<Message>('/auth/reset-password', { token, newPassword }),
      resendVerification: (email: string) => http.postPublic<Message>('/auth/verify-email/resend', { email }),
      confirmEmail: (token: string) => http.postPublic<Message>('/auth/verify-email/confirm', { token }),
    },
    me: {
      get: () => http.get<User>('/auth/me'),
      /** `email` é obrigatório no schema do backend, mesmo quando não muda. */
      updateProfile: (input: { name: string; email: string; phone?: string; cpf?: string; avatarUrl?: string }) =>
        http.put<User>('/me/profile', input),
      changePassword: (currentPassword: string, newPassword: string) => http.put<void>('/me/password', { currentPassword, newPassword }),
      /** O backend espera `whatsApp`/`email`/`promo` (sem o prefixo `notify` que ele usa no banco). */
      notificationPrefs: (input: NotificationPrefs) => http.put<void>('/me/notifications', input),
      /** Exclusão de conta exigida pelas lojas — anonimiza, preservando pedidos e lançamentos. */
      deleteAccount: (password: string) => http.post<void>('/me/delete', { password }),
      registerPushToken: (token: string, platform: 'ios' | 'android') => http.post<void>('/me/push-tokens', { token, platform }),
      unregisterPushToken: (token: string) => http.request<void>('/me/push-tokens', { method: 'DELETE', body: { token } }),
      notifications: () => http.get<AppNotification[]>('/me/notifications'),
      markNotificationsRead: () => http.post<void>('/me/notifications/read', {}),
      cashbackEntries: () => http.get<CashbackEntry[]>('/me/cashback/entries'),
    },
    catalog: {
      /** Busca paginada com filtros — a tela de catálogo usa esta, não `products`. */
      search: (params: CatalogQuery, signal?: AbortSignal) => http.getPublic<CatalogResult>(`/catalog${qs({ ...params })}`, signal),
      filters: () => http.getPublic<CatalogFilters>('/catalog/filters'),
      product: (id: string) => http.getPublic<Product>(`/products/${enc(id)}`),
      reviews: (productId: string) => http.getPublic<ProductReviews>(`/products/${enc(productId)}/reviews`),
      categories: (type: 'product' | 'store' = 'product') => http.getPublic<Category[]>(`/categories${qs({ type })}`),
      partners: () => http.getPublic<Partner[]>('/partners'),
      partner: (id: string) => http.getPublic<Partner>(`/partners/${enc(id)}`),
      stores: (partnerId?: string) => http.getPublic<PartnerStore[]>(`/stores${qs({ partnerId })}`),
      storesNearby: (lat: number, lng: number, radiusKm = 10, limit = 20) =>
        http.getPublic<NearbyStore[]>(`/stores/nearby${qs({ lat, lng, radiusKm, limit })}`),
    },
    orders: {
      create: (items: { productId: string; quantity: number }[], useCashback = false, affiliateCode?: string) =>
        http.post<Order>('/orders', { items, useCashback, affiliateCode: affiliateCode || undefined }),
      mine: (status?: string) => http.get<Order[]>(`/me/orders${qs({ status })}`),
      get: (id: string) => http.get<Order>(`/me/orders/${enc(id)}`),
    },
    payments: {
      /** Cartão vai em claro para a API, que tokeniza no gateway — nunca fica no aparelho. */
      process: (orderId: string, method: PaymentMethod, card?: CardInput | null) =>
        http.post<PaymentSnapshot>('/payments/process', { orderId, method, card: card ?? null }),
      status: (orderId: string) => http.get<PaymentSnapshot>(`/orders/${enc(orderId)}/payment-status`),
    },
    reviews: {
      eligibility: (productId: string) => http.get<ReviewEligibility>(`/me/reviews/eligibility${qs({ productId })}`),
      create: (input: { productId: string; rating: number; comment?: string }) => http.post<ReviewItem>('/reviews', input),
    },
    partner: {
      /**
       * Resgate no balcão: `confirm=false` só consulta o código, `true` efetiva o resgate.
       *
       * `storeId` é opcional e só vai quando o balcão escolheu a unidade. Quando vai, o servidor
       * grava quem atendeu e baixa a contagem daquela unidade; quando não vai, o comportamento é
       * o de antes.
       */
      redeem: (code: string, confirm: boolean, storeId?: string) =>
        http.post<RedeemResult>(
          `/partner/redeem${qs({ confirm: String(confirm) })}`,
          storeId ? { code, storeId } : { code },
        ),

      /**
       * Gestão de produto **no app**, não só na web.
       *
       * Decisão do plano v2 (Frente D): mexer em preço e estoque é tarefa de todo dia, com o
       * celular na mão atrás do balcão. Cadastrar unidade e ler métrica é tarefa de vez em
       * quando, e para essas a web serve — por isso só produto vem para cá.
       */
      products: () => http.get<Product[]>('/partner/products'),
      updateProduct: (id: string, body: ProductUpsert) =>
        http.put<Product>(`/partner/products/${enc(id)}`, body),
      createProduct: (body: ProductUpsert) => http.post<Product>('/partner/products', body),

      /** Unidades da própria loja, para escolher o balcão no resgate. */
      stores: () => http.get<PartnerStore[]>('/partner/stores'),

      /** "Onde dá para retirar". Não é o estoque que autoriza a compra. */
      productStores: (productId: string) =>
        http.get<ProductStoreStockPage>(`/partner/products/${enc(productId)}/stores`),
      setProductStores: (
        productId: string,
        items: { storeId: string; quantity: number; active: boolean }[],
      ) =>
        http.put<ProductStoreStockPage>(`/partner/products/${enc(productId)}/stores`, { items }),
    },
  };
}

export type Api = ReturnType<typeof createApi>;
