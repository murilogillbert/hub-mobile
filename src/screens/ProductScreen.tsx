import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { api } from '@/api/client';
import { qk } from '@/api/queryKeys';
import type { Product, ProductKind } from '@/api/types';
import { RemoteImage } from '@/components/Media';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { QueryView } from '@/components/ui/States';
import { AppText, Badge, Card, Divider, Icon, KeyValue, Row, SectionTitle } from '@/components/ui/primitives';
import { useCart } from '@/context/CartContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { colors, spacing } from '@/theme/tokens';

/**
 * Como o benefício chega até a pessoa — é a informação que decide a compra, então fica em
 * destaque. Nenhum dos três é consumido dentro do app: `digital` também é um código de resgate
 * usado no parceiro, e é por isso que nada aqui cai na regra de In-App Purchase da Apple.
 */
const fulfilment: Record<ProductKind, { icon: 'qr-code-outline' | 'key-outline' | 'cube-outline'; title: string; detail: string }> = {
  voucher: {
    icon: 'qr-code-outline',
    title: 'Voucher para apresentar',
    detail: 'Depois de pagar, você recebe um QR e um código. Mostre no parceiro para resgatar.',
  },
  digital: {
    icon: 'key-outline',
    title: 'Benefício com código de resgate',
    detail: 'Depois de pagar, você recebe um código de resgate para usar no parceiro.',
  },
  physical: {
    icon: 'cube-outline',
    title: 'Retirada ou entrega pelo parceiro',
    detail: 'Combine a retirada ou a entrega direto com o parceiro, apresentando o código do pedido.',
  },
};

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: qk.product(id), queryFn: () => api.catalog.product(id), enabled: !!id });
  return <QueryView query={q}>{(product) => <ProductView product={product} />}</QueryView>;
}

function ProductView({ product }: { product: Product }) {
  const { add, quantityOf } = useCart();
  const toast = useToast();
  const reviews = useQuery({ queryKey: qk.productReviews(product.id), queryFn: () => api.catalog.reviews(product.id), staleTime: 5 * 60_000 });

  const inCart = quantityOf(product.id);
  const out = product.stock <= 0;
  const cashback = (product.price * product.cashbackPercent) / 100;
  const how = fulfilment[product.kind];

  const addToCart = () => {
    add(product);
    toast.success('Adicionado ao carrinho.');
  };

  return (
    <Screen
      footer={
        <>
          <Button title={out ? 'Esgotado' : `Adicionar · ${formatCurrency(product.price)}`} size="lg" disabled={out} onPress={addToCart} />
          {inCart > 0 ? <Button title={`Ver carrinho (${inCart})`} variant="outline" onPress={() => router.push('/(tabs)/carrinho')} /> : null}
        </>
      }
    >
      <RemoteImage uri={product.imageUrl} style={styles.hero} accessibilityLabel={product.title} />

      <AppText variant="small">{product.partnerName}</AppText>
      <AppText variant="title">{product.title}</AppText>
      <Row gap={spacing.sm}>
        <AppText variant="subtitle">{formatCurrency(product.price)}</AppText>
        {product.cashbackPercent > 0 ? <Badge label={`${formatCurrency(cashback)} de cashback`} tone="brand" icon="cash-outline" /> : null}
      </Row>
      {out ? (
        <Badge label="Esgotado" tone="danger" />
      ) : product.stock <= 5 ? (
        <Badge label={`Últimas ${product.stock} unidades`} tone="warning" />
      ) : null}

      <Card style={{ gap: spacing.xs }}>
        <Row gap={spacing.sm}>
          <Icon name={how.icon} size={18} color={colors.navy} />
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {how.title}
          </AppText>
        </Row>
        <AppText variant="small">{how.detail}</AppText>
      </Card>

      <SectionTitle title="Sobre" />
      <AppText variant="body">{product.description}</AppText>

      <Card style={{ gap: spacing.sm }}>
        <KeyValue label="Categoria" value={product.category} />
        <KeyValue label="Cashback" value={`${product.cashbackPercent}%`} />
        {product.cities.length ? <KeyValue label="Disponível em" value={product.cities.slice(0, 3).join(', ')} /> : null}
      </Card>

      <SectionTitle
        title="Avaliações"
        action={
          reviews.data?.count ? (
            <Row gap={4}>
              <Icon name="star" size={14} color={colors.warning} />
              <AppText variant="small">
                {reviews.data.average.toFixed(1).replace('.', ',')} ({reviews.data.count})
              </AppText>
            </Row>
          ) : null
        }
      />
      {reviews.data?.items.length ? (
        reviews.data.items.slice(0, 5).map((r) => (
          <Card key={r.id} style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <AppText variant="bodyStrong">{r.userName}</AppText>
              <AppText variant="small">{formatDate(r.createdAt)}</AppText>
            </Row>
            <Row gap={4}>
              <Icon name="star" size={12} color={colors.warning} />
              <AppText variant="small">{r.rating}</AppText>
            </Row>
            {r.comment ? <AppText variant="body">{r.comment}</AppText> : null}
          </Card>
        ))
      ) : (
        <AppText variant="small">Ninguém avaliou ainda. Depois de comprar, você pode ser a primeira pessoa.</AppText>
      )}
      <Divider />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 220 },
});
