import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { api } from '@/api/client';
import { qk } from '@/api/queryKeys';
import type { OrderStatus } from '@/api/types';
import { Chip, ListRow } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, QueryView } from '@/components/ui/States';
import { AppText, Badge, Card } from '@/components/ui/primitives';
import { formatCurrency, formatDate } from '@/lib/format';
import { spacing } from '@/theme/tokens';

const FILTERS: { value: OrderStatus | undefined; label: string }[] = [
  { value: undefined, label: 'Todos' },
  { value: 'paid', label: 'Para usar' },
  { value: 'redeemed', label: 'Resgatados' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'cancelled', label: 'Cancelados' },
];

const label: Record<OrderStatus, string> = {
  paid: 'Pronto para usar',
  pending: 'Aguardando pagamento',
  redeemed: 'Resgatado',
  cancelled: 'Cancelado',
};

const tone = (s: OrderStatus) => (s === 'paid' ? 'success' : s === 'pending' ? 'warning' : s === 'cancelled' ? 'danger' : 'neutral');

export default function Historico() {
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const q = useQuery({ queryKey: qk.orders(status), queryFn: () => api.orders.mine(status) });

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isFetching}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {FILTERS.map((f) => (
          <Chip key={f.label} label={f.label} active={status === f.value} onPress={() => setStatus(f.value)} />
        ))}
      </ScrollView>

      <QueryView
        query={q}
        isEmpty={(list) => list.length === 0}
        empty={<EmptyState icon="receipt-outline" title="Nenhum pedido aqui" message="Troque o filtro ou compre algo no catálogo." />}
      >
        {(list) => (
          <Card style={{ padding: spacing.xs }}>
            {list.map((o) => (
              <ListRow
                key={o.id}
                icon="receipt-outline"
                title={o.items[0]?.productTitle ?? o.productTitle}
                subtitle={`${formatDate(o.createdAt)} · ${formatCurrency(o.paidPrice)}`}
                right={<Badge label={label[o.status]} tone={tone(o.status)} />}
                onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: o.id } })}
              />
            ))}
          </Card>
        )}
      </QueryView>
      <AppText variant="small">Pedidos pagos ficam disponíveis para resgate conforme as regras de cada parceiro.</AppText>
    </Screen>
  );
}
