import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { Product } from '@/api/types';
import { CartProvider, useCart } from '@/context/CartContext';

function productFixture(over: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    partnerId: 'pa1',
    partnerName: 'Estação do Café',
    title: 'Combo Café + Croissant',
    description: 'Café espresso com croissant.',
    price: 18.9,
    cashbackPercent: 5,
    kind: 'voucher',
    imageUrl: '',
    category: 'Cafeteria',
    rating: 4.8,
    stock: 120,
    digital: false,
    cities: [],
    states: [],
    ...over,
  };
}

/** Expõe a API do carrinho para o teste manipular fora da árvore de componentes. */
let cart: ReturnType<typeof useCart>;

function Probe() {
  cart = useCart();
  return <Text>{cart.count}</Text>;
}

async function mount() {
  await render(
    <CartProvider>
      <Probe />
    </CartProvider>,
  );
}

describe('carrinho', () => {
  it('soma quantidade ao adicionar o mesmo produto duas vezes', async () => {
    await mount();
    await act(async () => {
      cart.add(productFixture());
      cart.add(productFixture());
    });
    expect(cart.count).toBe(2);
    expect(cart.lines).toHaveLength(1);
    expect(cart.subtotal).toBeCloseTo(37.8, 2);
  });

  it('nunca passa do estoque disponível', async () => {
    await mount();
    await act(async () => {
      cart.add(productFixture({ stock: 2 }), 5);
    });
    expect(cart.quantityOf('p1')).toBe(2);
    await act(async () => {
      cart.setQuantity('p1', 99);
    });
    expect(cart.quantityOf('p1')).toBe(2);
  });

  it('quantidade zero remove a linha', async () => {
    await mount();
    await act(async () => {
      cart.add(productFixture());
      cart.setQuantity('p1', 0);
    });
    expect(cart.lines).toHaveLength(0);
    expect(cart.count).toBe(0);
  });

  it('limpar esvazia o carrinho', async () => {
    await mount();
    await act(async () => {
      cart.add(productFixture());
      cart.add(productFixture({ id: 'p2' }));
      cart.clear();
    });
    expect(cart.lines).toHaveLength(0);
  });
});
