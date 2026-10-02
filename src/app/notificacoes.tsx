import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/api/client';
import { qk } from '@/api/queryKeys';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, QueryView } from '@/components/ui/States';
import { AppText, Badge, Card, Row } from '@/components/ui/primitives';
import { formatDateTime } from '@/lib/format';
import { colors, spacing } from '@/theme/tokens';

/**
 * Avisos da conta. São notificações guardadas no servidor (modelo `Notification` do hub), não push
 * — o backend ainda não tem envio para o aparelho, então só aparecem quando o app está aberto.
 */
export default function Notificacoes() {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: qk.notifications, queryFn: () => api.me.notifications() });
  const hasUnread = (q.data ?? []).some((n) => !n.read);

  // Abrir a tela é o que marca como lido — não precisa de ação da pessoa.
  useEffect(() => {
    if (!hasUnread) return;
    api.me
      .markNotificationsRead()
      .then(() => queryClient.invalidateQueries({ queryKey: qk.notifications }))
      .catch(() => undefined);
  }, [hasUnread, queryClient]);

  return (
    <QueryView
      query={q}
      isEmpty={(list) => list.length === 0}
      empty={<EmptyState icon="notifications-off-outline" title="Nenhum aviso" message="Avisos sobre pedidos e cashback aparecem aqui." />}
    >
      {(list) => (
        <Screen onRefresh={() => q.refetch()} refreshing={q.isFetching}>
          {list.map((n) => (
            <Card key={n.id} style={{ gap: 4, backgroundColor: n.read ? colors.surface : colors.blueSoft, borderColor: n.read ? colors.border : colors.blueSoft }}>
              <Row style={{ justifyContent: 'space-between' }} gap={spacing.sm}>
                <AppText variant="bodyStrong" style={{ flex: 1 }}>
                  {n.title}
                </AppText>
                {n.read ? null : <Badge label="Novo" tone="info" />}
              </Row>
              <AppText variant="body">{n.message}</AppText>
              <AppText variant="small">{formatDateTime(n.createdAt)}</AppText>
            </Card>
          ))}
        </Screen>
      )}
    </QueryView>
  );
}
