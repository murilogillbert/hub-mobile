/**
 * Contrato da API do OpenDriverHub (`hub/backend`). Datas chegam como string ISO.
 *
 * Mantenha em sincronia com `hub/src/shared/types/index.ts` e com os formatos de request/response
 * de `hub/src/shared/api/endpoints.ts` — não existe pacote de tipos compartilhado entre os
 * projetos (ver `hub/CLAUDE.md`), então mudança de contrato mexe nos três lugares.
 */

export type UserRole = 'client' | 'passenger' | 'driver' | 'partner' | 'admin' | 'financeiro' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Saldo de cashback — a mesma carteira usada nas corridas do OpenDriver. */
  cashbackBalance: number;
  avatarUrl?: string;
  phone?: string;
  cpf?: string | null;
  emailVerifiedAt?: string | null;
  notifyWhatsApp?: boolean;
  notifyEmail?: boolean;
  notifyPromo?: boolean;
  partnerId?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface Message {
  message: string;
}

// ---------- Catálogo ----------

/**
 * `voucher` e `digital` se resolvem do mesmo jeito para quem compra: o pedido gera um código que a
 * pessoa apresenta (QR ou texto) para resgatar o benefício fora do app. `physical` é entregue pelo
 * parceiro. Nada é consumido dentro do app — é o que mantém tudo fora da regra de In-App Purchase.
 */
export type ProductKind = 'physical' | 'digital' | 'voucher';

export interface Product {
  id: string;
  partnerId: string;
  partnerName: string;
  title: string;
  description: string;
  price: number;
  cashbackPercent: number;
  kind: ProductKind;
  imageUrl: string;
  category: string;
  rating: number;
  stock: number;
  digital: boolean;
  cities: string[];
  states: string[];
}

export interface CatalogQuery {
  category?: string;
  q?: string;
  city?: string;
  state?: string;
  partnerId?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating';
  page?: number;
  pageSize?: number;
}

export interface CatalogResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CatalogFilters {
  categories: string[];
  cities: string[];
  states: string[];
  minPrice: number;
  maxPrice: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'product' | 'store';
  active: boolean;
}

export interface Partner {
  id: string;
  name: string;
  segment: string;
  logoUrl: string;
  active: boolean;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export interface PartnerStore {
  id: string;
  partnerId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  category: string;
  imageUrl?: string;
}

export interface NearbyStore extends PartnerStore {
  distanceKm: number;
}

// ---------- Avaliações ----------
export interface ReviewItem {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProductReviews {
  average: number;
  count: number;
  items: ReviewItem[];
}

export interface ReviewEligibility {
  canReview: boolean;
  alreadyReviewed: boolean;
}

// ---------- Pedidos ----------
export type OrderStatus = 'paid' | 'pending' | 'redeemed' | 'cancelled';

export interface OrderItemLine {
  id: string;
  productId: string;
  productTitle: string;
  imageUrl: string;
  category: string;
  partnerId: string;
  partnerName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  cashbackEarned: number;
  redeemed: boolean;
  redeemedAt?: string;
}

export interface Order {
  id: string;
  /** Código do pedido — é ele que vira QR e que o parceiro digita no balcão para resgatar. */
  code: string;
  productId: string;
  productTitle: string;
  partnerId: string;
  partnerName: string;
  customerId: string;
  customerName: string;
  paidPrice: number;
  cashbackEarned: number;
  cashbackUsed: number;
  status: OrderStatus;
  createdAt: string;
  redeemedAt?: string;
  items: OrderItemLine[];
}

export type CashbackEntryType = 'earned' | 'used';

export interface CashbackEntry {
  id: string;
  type: CashbackEntryType;
  amount: number;
  orderId?: string;
  orderCode?: string;
  description: string;
  createdAt: string;
}

// ---------- Pagamento ----------
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card';

export interface CardInput {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
  postalCode?: string;
  addressNumber?: string;
}

export interface PixPayload {
  qrCode: string;
  copiaECola: string;
  ticketUrl: string;
  expiresAt: string;
}

export interface PaymentSnapshot {
  orderId: string;
  paymentId: string | null;
  paymentReference: string | null;
  paymentStatus: string;
  statusDetail: string | null;
  /** Código do voucher quando o pagamento já foi aprovado. */
  voucherCode: string | null;
  orderStatus: string;
  pix: PixPayload | null;
}

/** Resultado do resgate no balcão — já com a conta do repasse feita pelo backend. */
export interface RedeemResult {
  orderId: string;
  productTitle: string;
  customerName: string;
  paidPrice: number;
  feePercent: number;
  platformFee: number;
  customerCashback: number;
  partnerNet: number;
  redeemed: boolean;
}

// ---------- Conta ----------
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  channel: string;
  read: boolean;
  createdAt: string;
}

/**
 * Preferências de aviso. Os nomes aqui são os do corpo que o backend aceita (`whatsApp`, `email`,
 * `promo`) — no `User` os mesmos dados voltam como `notifyWhatsApp`/`notifyEmail`/`notifyPromo`.
 */
export interface NotificationPrefs {
  whatsApp: boolean;
  email: boolean;
  promo: boolean;
}

// ---------- Carrinho (só no aparelho) ----------

/** Linha do carrinho. Guarda o essencial do produto para a tela funcionar offline. */
export interface CartLine {
  productId: string;
  title: string;
  imageUrl: string;
  unitPrice: number;
  cashbackPercent: number;
  partnerId: string;
  partnerName: string;
  kind: ProductKind;
  quantity: number;
  /** Estoque visto quando o item entrou — reconferido no checkout pela API. */
  stock: number;
}
