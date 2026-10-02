import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { qk } from '@/api/queryKeys';
import type { Order } from '@/api/types';
import { CopyField, QrCodeView } from '@/components/Media';
import { PaymentPanel } from '@/components/PaymentPanel';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { RatingInput } from '@/components/RatingInput';
import { Screen } from '@/components/ui/Screen';
import { QueryView } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { AppText, Badge, Card, Divider, KeyValue, Row, SectionTitle } from '@/components/ui/primitives';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { alertError } from '@/lib/recovery';
import { colors, spacing } from '@/theme/tokens';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: qk.order(id), queryFn: () => api.orders.get(id), enabled: !!id });
  return <QueryView query={q}>{(order) => <OrderView order={order} />}</QueryView>;
}

function OrderView({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const pending = order.status === 'pending';

  // Pagamento pendente: o pedido vira "paid" por webhook do gateway, então basta reconsultar.
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: qk.order(order.id) });
    }, 5000);
    return () => clearInterval(t);
  }, [pending, order.id, queryClient]);

  const usable = order.status === 'paid';

  return (
    <Screen onRefresh={() => queryClient.invalidateQueries({ queryKey: qk.order(order.id) })}>
      <Row style={{ justifyContent: 'space-between' }}>
        <AppText variant="small">{formatDateTime(order.createdAt)}</AppText>
        <Badge
          label={
            usable ? 'Pronto para usar' : pending ? 'Aguardando pagamento' : order.status === 'redeemed' ? 'Já resgatado' : 'Cancelado'
          }
          tone={usable ? 'success' : pending ? 'warning' : order.status === 'cancelled' ? 'danger' : 'neutral'}
        />
      </Row>

      {usable ? (
        <Card style={{ gap: spacing.md, alignItems: 'stretch' }}>
          <AppText variant="bodyStrong" center>
            Mostre este código no parceiro
          </AppText>
          <QrCodeView value={order.code} size={220} label={`Código do pedido ${order.code}`} />
          <AppText variant="title" center>
            {order.code}
          </AppText>
          <AppText variant="small" center>
            Se a leitura do QR falhar, o atendente pode digitar o código acima.
          </AppText>
        </Card>
      ) : null}

      {pending ? <PaymentPanel orderId={order.id} /> : null}

      <SectionTitle title="Itens" />
      {order.items.map((it) => (
        <Card key={it.id} style={{ gap: 4 }}>
          <AppText variant="small">{it.partnerName}</AppText>
          <AppText variant="bodyStrong">{it.productTitle}</AppText>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="small">
              {it.quantity} × {formatCurrency(it.unitPrice)}
            </AppText>
            <AppText variant="bodyStrong">{formatCurrency(it.lineTotal)}</AppText>
          </Row>
          {it.redeemed ? <Badge label="Resgatado" tone="neutral" /> : null}
        </Card>
      ))}

      <Card style={{ gap: spacing.sm }}>
        <KeyValue label="Total pago" value={formatCurrency(order.paidPrice)} strong />
        {order.cashbackUsed > 0 ? <KeyValue label="Cashback usado" value={`- ${formatCurrency(order.cashbackUsed)}`} /> : null}
        {order.cashbackEarned > 0 ? (
          <KeyValue label="Cashback recebido" value={formatCurrency(order.cashbackEarned)} valueColor={colors.success} />
        ) : null}
        {order.redeemedAt ? (
          <>
            <Divider />
            <KeyValue label="Resgatado em" value={formatDateTime(order.redeemedAt)} />
          </>
        ) : null}
      </Card>

      <CopyField label="Código do pedido" value={order.code} mono />

      {usable || order.status === 'redeemed' ? <ReviewBlock order={order} /> : null}
    </Screen>
  );
}

/** Avaliação só aparece se a API disser que esta pessoa pode avaliar este produto. */
function ReviewBlock({ order }: { order: Order }) {
  const productId = order.items[0]?.productId ?? order.productId;
  const queryClient = useQueryClient();
  const toast = useToast();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibility = useQuery({
    queryKey: qk.reviewEligibility(productId),
    queryFn: () => api.reviews.eligibility(productId),
    enabled: !!productId,
  });

  if (!eligibility.data?.canReview || eligibility.data.alreadyReviewed) return null;

  const send = async () => {
    setBusy(true);
    try {
      await api.reviews.create({ productId, rating: stars, comment: comment.trim() || undefined });
      await queryClient.invalidateQueries({ queryKey: qk.reviewEligibility(productId) });
      await queryClient.invalidateQueries({ queryKey: qk.productReviews(productId) });
      toast.success('Avaliação enviada. Obrigado!');
    } catch (err) {
      alertError(err, 'Não foi possível avaliar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SectionTitle title="Como foi?" />
      <Card style={{ gap: spacing.md }}>
        <RatingInput value={stars} onChange={setStars} />
        {stars > 0 && stars <= 3 ? (
          <TextField label="Quer contar o que houve? (opcional)" value={comment} onChangeText={setComment} multiline maxLength={500} />
        ) : null}
        <Button title="Enviar avaliação" disabled={!stars} loading={busy} onPress={send} />
      </Card>
    </>
  );
}
