import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { qk } from '@/api/queryKeys';
import type { Order, OrderStatus } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, QueryView } from '@/components/ui/States';
import { AppText, Badge, Card } from '@/components/ui/primitives';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { colors, spacing } from '@/theme/tokens';

const statusLabel: Record<OrderStatus, string> = {
  paid: 'Pronto para usar',
  pending: 'Aguardando pagamento',
  redeemed: 'Já resgatado',
  cancelled: 'Cancelado',
};

const statusTone = (s: OrderStatus) => (s === 'paid' ? 'success' : s === 'pending' ? 'warning' : s === 'cancelled' ? 'danger' : 'neutral');

/** Meus itens: o que já foi comprado e ainda pode ser resgatado vem primeiro. */
export default function Itens() {
  const { status } = useAuth();
  const orders = useQuery({ queryKey: qk.orders(), queryFn: () => api.orders.mine(), enabled: status === 'signedIn' });

  if (status !== 'signedIn') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <Screen edges={[]}>
          <EmptyState
            icon="ticket-outline"
            title="Entre para ver seus itens"
            message="Seus vouchers e benefícios ficam aqui, com o código de resgate."
            action={<Button title="Entrar" onPress={() => router.push('/login')} />}
          />
        </Screen>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <QueryView
        query={orders}
        isEmpty={(list) => list.length === 0}
        empty={
          <Screen edges={[]}>
            <EmptyState
              icon="ticket-outline"
              title="Nada comprado ainda"
              message="Quando você comprar, o voucher aparece aqui com o QR para apresentar no balcão."
              action={<Button title="Ver catálogo" variant="outline" onPress={() => router.push('/(tabs)/catalogo')} />}
            />
          </Screen>
        }
      >
        {(list) => {
          const usable = list.filter((o) => o.status === 'paid');
          const rest = list.filter((o) => o.status !== 'paid');
          return (
            <Screen edges={[]} onRefresh={() => orders.refetch()} refreshing={orders.isFetching}>
              <AppText variant="title">Meus itens</AppText>
              {usable.length ? (
                <>
                  <AppText variant="small">Prontos para apresentar no parceiro.</AppText>
                  <Card style={{ padding: spacing.xs }}>
                    {usable.map((o) => (
                      <OrderRow key={o.id} order={o} />
                    ))}
                  </Card>
                </>
              ) : null}
              {rest.length ? (
                <>
                  <AppText variant="small">Histórico recente</AppText>
                  <Card style={{ padding: spacing.xs }}>
                    {rest.map((o) => (
                      <OrderRow key={o.id} order={o} />
                    ))}
                  </Card>
                </>
              ) : null}
              <Button title="Ver histórico completo" variant="ghost" onPress={() => router.push('/historico')} />
            </Screen>
          );
        }}
      </QueryView>
    </SafeAreaView>
  );
}

function OrderRow({ order }: { order: Order }) {
  const title = order.items[0]?.productTitle ?? order.productTitle;
  const extra = order.items.length > 1 ? ` +${order.items.length - 1}` : '';
  return (
    <ListRow
      icon={order.status === 'paid' ? 'qr-code-outline' : 'receipt-outline'}
      title={`${title}${extra}`}
      subtitle={`${formatDate(order.createdAt)} · ${formatCurrency(order.paidPrice)}`}
      right={<Badge label={statusLabel[order.status]} tone={statusTone(order.status)} />}
      onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: order.id } })}
    />
  );
}
