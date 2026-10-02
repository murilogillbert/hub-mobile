import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CartLine, Product } from '@/api/types';

const CART_KEY = 'odh.cart';
const MAX_PER_LINE = 20;

/**
 * Carrinho do aparelho. Diferente do web (que vive em memória/localStorage da aba), aqui ele tem
 * de sobreviver ao app ser fechado — então é persistido em `AsyncStorage`.
 *
 * O preço guardado é só para montar a tela: o valor cobrado é sempre o que a API calcula em
 * `POST /orders`, a partir do `productId` e da quantidade.
 */
interface CartValue {
  lines: CartLine[];
  count: number;
  /** Subtotal estimado — confirmação vem do pedido criado na API. */
  subtotal: number;
  add(product: Product, quantity?: number): void;
  setQuantity(productId: string, quantity: number): void;
  remove(productId: string): void;
  clear(): void;
  quantityOf(productId: string): number;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as CartLine[];
          if (Array.isArray(parsed)) setLines(parsed);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  // Só grava depois de carregar, senão o estado vazio inicial apagaria o carrinho salvo.
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify(lines)).catch(() => undefined);
  }, [lines]);

  const add = useCallback((product: Product, quantity = 1) => {
    setLines((cur) => {
      const limit = Math.min(MAX_PER_LINE, Math.max(1, product.stock));
      const existing = cur.find((l) => l.productId === product.id);
      if (existing)
        return cur.map((l) => (l.productId === product.id ? { ...l, quantity: Math.min(limit, l.quantity + quantity), stock: product.stock } : l));
      return [
        ...cur,
        {
          productId: product.id,
          title: product.title,
          imageUrl: product.imageUrl,
          unitPrice: product.price,
          cashbackPercent: product.cashbackPercent,
          partnerId: product.partnerId,
          partnerName: product.partnerName,
          kind: product.kind,
          quantity: Math.min(limit, Math.max(1, quantity)),
          stock: product.stock,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((cur) =>
      quantity <= 0
        ? cur.filter((l) => l.productId !== productId)
        : cur.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(Math.min(MAX_PER_LINE, Math.max(1, l.stock)), quantity) } : l)),
    );
  }, []);

  const remove = useCallback((productId: string) => setLines((cur) => cur.filter((l) => l.productId !== productId)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      quantityOf: (productId: string) => lines.find((l) => l.productId === productId)?.quantity ?? 0,
    }),
    [lines, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart fora do CartProvider');
  return ctx;
}
