import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/api/client';
import { qk } from '@/api/queryKeys';
import type { CardInput, PaymentMethod } from '@/api/types';
import { CopyField, QrCodeView } from '@/components/Media';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Controls';
import { TextField } from '@/components/ui/TextField';
import { AppText, Card, Row } from '@/components/ui/primitives';
import { maskCardNumber, maskCep, maskExpiry, onlyDigits } from '@/lib/masks';
import { alertError } from '@/lib/recovery';
import { colors, spacing } from '@/theme/tokens';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'credit_card', label: 'Crédito' },
  { value: 'debit_card', label: 'Débito' },
];

/**
 * Pagamento de um pedido pendente. O cartão é enviado à API, que tokeniza no gateway — nada de
 * dado de cartão fica guardado no aparelho. O Pix é confirmado por webhook, então a tela só
 * reconsulta o status até virar pago.
 */
export function PaymentPanel({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState<CardInput>({ number: '', holder: '', expiry: '', cvv: '', postalCode: '', addressNumber: '' });

  const snapshot = useQuery({
    queryKey: qk.paymentStatus(orderId),
    queryFn: () => api.payments.status(orderId),
    // Enquanto o Pix não é confirmado, consulta a cada 5 s.
    refetchInterval: (query) => (query.state.data?.paymentStatus?.toLowerCase() === 'paid' ? false : 5000),
  });

  const pix = snapshot.data?.pix;
  const cardValid =
    onlyDigits(card.number).length >= 13 && card.holder.trim().length >= 3 && /^\d{2}\/\d{2}$/.test(card.expiry) && onlyDigits(card.cvv).length >= 3;

  const pay = async () => {
    setBusy(true);
    try {
      await api.payments.process(orderId, method, method === 'pix' ? null : { ...card, number: onlyDigits(card.number), cvv: onlyDigits(card.cvv) });
      await queryClient.invalidateQueries({ queryKey: qk.paymentStatus(orderId) });
      await queryClient.invalidateQueries({ queryKey: qk.order(orderId) });
    } catch (err) {
      alertError(err, 'O pagamento não foi aprovado');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <AppText variant="bodyStrong">Pagamento</AppText>
      <Segmented accessibilityLabel="Forma de pagamento" value={method} onChange={setMethod} options={METHODS} />

      {method === 'pix' ? (
        pix ? (
          <>
            <QrCodeView value={pix.copiaECola} size={200} label="QR do Pix" />
            <CopyField label="Pix copia e cola" value={pix.copiaECola} mono />
            <AppText variant="small" center>
              Assim que o banco confirmar, o voucher aparece aqui sozinho. Não precisa fechar o app.
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="small">Geramos um QR e um código copia e cola para você pagar no app do seu banco.</AppText>
            <Button title="Gerar Pix" loading={busy} onPress={pay} />
          </>
        )
      ) : (
        <>
          <TextField
            label="Número do cartão"
            value={card.number}
            onChangeText={(v) => setCard((c) => ({ ...c, number: maskCardNumber(v) }))}
            keyboardType="number-pad"
            autoComplete="cc-number"
          />
          <TextField
            label="Nome impresso no cartão"
            value={card.holder}
            onChangeText={(v) => setCard((c) => ({ ...c, holder: v }))}
            autoCapitalize="characters"
          />
          <Row gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
            <TextField
              label="Validade"
              placeholder="MM/AA"
              value={card.expiry}
              onChangeText={(v) => setCard((c) => ({ ...c, expiry: maskExpiry(v) }))}
              keyboardType="number-pad"
              style={{ minWidth: 90 }}
            />
            <TextField
              label="CVV"
              value={card.cvv}
              onChangeText={(v) => setCard((c) => ({ ...c, cvv: onlyDigits(v).slice(0, 4) }))}
              keyboardType="number-pad"
              style={{ minWidth: 70 }}
            />
          </Row>
          <Row gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
            <TextField
              label="CEP"
              value={card.postalCode ?? ''}
              onChangeText={(v) => setCard((c) => ({ ...c, postalCode: maskCep(v) }))}
              keyboardType="number-pad"
              style={{ minWidth: 110 }}
            />
            <TextField
              label="Número"
              value={card.addressNumber ?? ''}
              onChangeText={(v) => setCard((c) => ({ ...c, addressNumber: onlyDigits(v).slice(0, 8) }))}
              keyboardType="number-pad"
              style={{ minWidth: 80 }}
            />
          </Row>
          <Button title="Pagar" disabled={!cardValid} loading={busy} onPress={pay} />
          <AppText variant="small">Os dados do cartão vão direto para o provedor de pagamento. O app não guarda nada.</AppText>
        </>
      )}

      {snapshot.data?.statusDetail ? (
        <AppText variant="small" color={colors.danger}>
          {snapshot.data.statusDetail}
        </AppText>
      ) : null}
    </Card>
  );
}
