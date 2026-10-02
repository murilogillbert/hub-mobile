import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RemoteImage } from '@/components/Media';
import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { AppText, Card, Divider, KeyValue, Row } from '@/components/ui/primitives';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/format';
import { confirm } from '@/lib/recovery';
import { colors, spacing } from '@/theme/tokens';

export default function Carrinho() {
  const { lines, subtotal, setQuantity, remove, clear, count } = useCart();
  const { status } = useAuth();

  const estimatedCashback = lines.reduce((n, l) => n + (l.unitPrice * l.quantity * l.cashbackPercent) / 100, 0);

  const go = () => {
    // Sem conta a compra não existe; manda entrar e volta pro carrinho.
    if (status !== 'signedIn') {
      router.push('/login');
      return;
    }
    router.push('/checkout');
  };

  if (!lines.length) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <Screen edges={[]}>
          <EmptyState
            icon="cart-outline"
            title="Carrinho vazio"
            message="Escolha um produto no catálogo para começar."
            action={<Button title="Ver catálogo" variant="outline" onPress={() => router.push('/(tabs)/catalogo')} />}
          />
        </Screen>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen
        edges={[]}
        footer={
          <>
            <Button title={`Finalizar · ${formatCurrency(subtotal)}`} size="lg" onPress={go} />
            <Button
              title="Limpar carrinho"
              variant="ghost"
              onPress={async () => {
                if (await confirm('Limpar o carrinho?', 'Todos os itens serão removidos.', 'Limpar')) clear();
              }}
            />
          </>
        }
      >
        <AppText variant="title">Carrinho</AppText>
        <AppText variant="small">
          {count} {count === 1 ? 'item' : 'itens'}. O valor final é confirmado na próxima tela, junto com o cashback.
        </AppText>

        {lines.map((l) => (
          <Card key={l.productId} style={{ gap: spacing.sm }}>
            <Row gap={spacing.md} style={{ alignItems: 'flex-start' }}>
              <RemoteImage uri={l.imageUrl} style={styles.thumb} accessibilityLabel={l.title} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="small" numberOfLines={1}>
                  {l.partnerName}
                </AppText>
                <AppText variant="bodyStrong" numberOfLines={2}>
                  {l.title}
                </AppText>
                <AppText variant="body">{formatCurrency(l.unitPrice)}</AppText>
              </View>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Stepper value={l.quantity} min={1} max={Math.max(1, l.stock)} label={`Quantidade de ${l.title}`} onChange={(q) => setQuantity(l.productId, q)} />
              <Button title="Remover" variant="ghost" size="sm" onPress={() => remove(l.productId)} />
            </Row>
          </Card>
        ))}

        <Card style={{ gap: spacing.sm }}>
          <KeyValue label="Subtotal" value={formatCurrency(subtotal)} />
          {estimatedCashback > 0 ? <KeyValue label="Cashback previsto" value={formatCurrency(estimatedCashback)} /> : null}
          <Divider />
          <KeyValue label="Total" value={formatCurrency(subtotal)} strong />
        </Card>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 64, height: 64 },
});
