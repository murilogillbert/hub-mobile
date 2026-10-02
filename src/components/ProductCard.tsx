import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Product, ProductKind } from '@/api/types';
import { RemoteImage } from '@/components/Media';
import { AppText, Badge, Icon, Row } from '@/components/ui/primitives';
import { formatCurrency } from '@/lib/format';
import { colors, radius, spacing } from '@/theme/tokens';

/** Rótulo de como o produto chega até a pessoa — é o que ela precisa saber antes de comprar. */
const kindLabel: Record<ProductKind, string> = {
  voucher: 'Voucher para resgatar',
  digital: 'Benefício com código',
  physical: 'Entrega pelo parceiro',
};

export function ProductCard({ product, wide = false }: { product: Product; wide?: boolean }) {
  const cashback = (product.price * product.cashbackPercent) / 100;
  const out = product.stock <= 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.title}, ${formatCurrency(product.price)}${out ? ', esgotado' : ''}`}
      onPress={() => router.push({ pathname: '/produto/[id]', params: { id: product.id } })}
      style={({ pressed }) => [styles.card, wide ? styles.wide : styles.narrow, pressed && { opacity: 0.85 }]}
    >
      <RemoteImage uri={product.imageUrl} style={wide ? styles.imageWide : styles.image} accessibilityLabel={product.title} />
      <View style={styles.body}>
        <AppText variant="small" numberOfLines={1}>
          {product.partnerName}
        </AppText>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {product.title}
        </AppText>
        <AppText variant="subtitle">{formatCurrency(product.price)}</AppText>
        {product.cashbackPercent > 0 ? (
          <Badge label={`${formatCurrency(cashback)} de volta`} tone="brand" icon="cash-outline" />
        ) : null}
        <AppText variant="small" numberOfLines={1}>
          {kindLabel[product.kind]}
        </AppText>
        <Row gap={4}>
          {product.rating > 0 ? (
            <>
              <Icon name="star" size={12} color={colors.warning} />
              <AppText variant="small">{product.rating.toFixed(1).replace('.', ',')}</AppText>
            </>
          ) : null}
          {out ? <Badge label="Esgotado" tone="danger" /> : null}
        </Row>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  narrow: { width: 170 },
  wide: { flex: 1, minWidth: 150 },
  image: { width: '100%', height: 110 },
  imageWide: { width: '100%', height: 120 },
  body: { padding: spacing.md, gap: 3 },
});
