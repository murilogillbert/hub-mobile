import { useQuery } from '@tanstack/react-query';
import { Fragment } from 'react';
import { api } from '@/api/client';
import { qk } from '@/api/queryKeys';
import type { CashbackEntry } from '@/api/types';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, QueryView } from '@/components/ui/States';
import { AppText, Card, Divider, Row } from '@/components/ui/primitives';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { colors, spacing } from '@/theme/tokens';

/** Extrato de cashback — a mesma carteira usada nas corridas do OpenDriver. */
export default function Cashback() {
  const { me } = useAuth();
  const q = useQuery({ queryKey: qk.cashback, queryFn: () => api.me.cashbackEntries() });

  return (
    <QueryView query={q}>
      {(entries) => (
        <Screen onRefresh={() => q.refetch()} refreshing={q.isFetching}>
          <Card style={{ gap: spacing.sm, backgroundColor: colors.limeSoft, borderColor: colors.limeSoft }}>
            <AppText variant="caption">Saldo disponível</AppText>
            <AppText variant="title">{formatCurrency(me?.cashbackBalance ?? 0)}</AppText>
            <AppText variant="small">Vale como desconto no checkout e também nas corridas do app OpenDriver.</AppText>
          </Card>

          {entries.length ? (
            <Card style={{ gap: spacing.sm }}>
              {entries.map((entry, i) => (
                <Fragment key={entry.id}>
                  <EntryRow entry={entry} />
                  {i === entries.length - 1 ? null : <Divider />}
                </Fragment>
              ))}
            </Card>
          ) : (
            <EmptyState icon="cash-outline" title="Sem movimentação" message="Seu cashback aparece aqui depois da primeira compra." />
          )}
        </Screen>
      )}
    </QueryView>
  );
}

function EntryRow({ entry }: { entry: CashbackEntry }) {
  const earned = entry.type === 'earned';
  return (
    <Row gap={spacing.md} style={{ alignItems: 'flex-start' }}>
      <AppText variant="body" style={{ flex: 1 }}>
        {entry.description}
        {'\n'}
        <AppText variant="small">
          {formatDate(entry.createdAt)}
          {entry.orderCode ? ` · pedido ${entry.orderCode}` : ''}
        </AppText>
      </AppText>
      <AppText variant="bodyStrong" color={earned ? colors.success : colors.text}>
        {earned ? '+' : '−'} {formatCurrency(Math.abs(entry.amount))}
      </AppText>
    </Row>
  );
}
