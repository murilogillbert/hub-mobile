import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api/client';
import { qk } from '@/api/queryKeys';
import { Button } from '@/components/ui/Button';
import { Checkbox, SwitchRow } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { AppText, Card, Divider, KeyValue, Row } from '@/components/ui/primitives';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/format';
import { alertError } from '@/lib/recovery';
import { colors, spacing } from '@/theme/tokens';

/**
 * Cria o pedido na API e manda para a tela dele, onde o pagamento acontece. O valor cobrado é
 * sempre o que a API calcula — os preços do carrinho são só para montar a tela (UX: o que a pessoa
 * vê aqui é confirmado no pedido criado).
 */
export default function Checkout() {
  const { me, refreshMe } = useAuth();
  const { lines, subtotal, clear } = useCart();
  const queryClient = useQueryClient();
  const [useCashback, setUseCashback] = useState(true);
  const [hasCode, setHasCode] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [busy, setBusy] = useState(false);

  const balance = me?.cashbackBalance ?? 0;
  const cashbackApplied = useCashback ? Math.min(balance, subtotal) : 0;
  const toPay = Math.max(0, subtotal - cashbackApplied);
  const needsCpf = !me?.cpf;
  const needsEmail = !me?.emailVerifiedAt;

  const submit = async () => {
    setBusy(true);
    try {
      const order = await api.orders.create(
        lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        useCashback,
        hasCode ? affiliateCode.trim() : undefined,
      );
      clear();
      await refreshMe();
      await queryClient.invalidateQueries({ queryKey: qk.orders() });
      router.replace({ pathname: '/pedido/[id]', params: { id: order.id } });
    } catch (err) {
      alertError(err, 'Não foi possível criar o pedido');
    } finally {
      setBusy(false);
    }
  };

  if (!lines.length) {
    return (
      <Screen footer={<Button title="Ver catálogo" size="lg" onPress={() => router.replace('/(tabs)/catalogo')} />}>
        <AppText variant="bodyStrong">Seu carrinho está vazio</AppText>
        <AppText variant="small">Escolha um produto antes de finalizar.</AppText>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          title={`Criar pedido · ${formatCurrency(toPay)}`}
          size="lg"
          disabled={needsCpf || needsEmail}
          loading={busy}
          onPress={submit}
        />
      }
    >
      <AppText variant="small">Confira o resumo. O pagamento acontece na próxima tela, por Pix ou cartão.</AppText>

      <Card style={{ gap: spacing.sm }}>
        {lines.map((l) => (
          <Row key={l.productId} style={{ justifyContent: 'space-between' }}>
            <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>
              {l.quantity} × {l.title}
            </AppText>
            <AppText variant="bodyStrong">{formatCurrency(l.unitPrice * l.quantity)}</AppText>
          </Row>
        ))}
        <Divider />
        <KeyValue label="Subtotal" value={formatCurrency(subtotal)} />
        {cashbackApplied > 0 ? <KeyValue label="Cashback" value={`- ${formatCurrency(cashbackApplied)}`} /> : null}
        <KeyValue label="Você paga" value={formatCurrency(toPay)} strong />
      </Card>

      {balance > 0 ? (
        <SwitchRow
          title="Usar meu cashback"
          subtitle={
            useCashback
              ? `${formatCurrency(cashbackApplied)} do seu saldo de ${formatCurrency(balance)}`
              : `Saldo disponível: ${formatCurrency(balance)}`
          }
          value={useCashback}
          onValueChange={setUseCashback}
        />
      ) : null}

      <Card style={{ gap: spacing.sm }}>
        <Checkbox label="Tenho um código de indicação" checked={hasCode} onChange={setHasCode} />
        {hasCode ? (
          <TextField
            label="Código do motorista"
            value={affiliateCode}
            onChangeText={setAffiliateCode}
            autoCapitalize="characters"
            autoCorrect={false}
            hint="O código vale só para as lojas participantes do programa."
          />
        ) : null}
      </Card>

      {needsEmail ? (
        <Card style={{ backgroundColor: colors.warningSoft, borderColor: colors.warningSoft }}>
          <AppText variant="bodyStrong">Confirme seu e-mail</AppText>
          <AppText variant="small">A confirmação do e-mail é necessária para comprar. O link está na sua caixa de entrada.</AppText>
          <Button title="Ir para a conta" variant="outline" size="sm" onPress={() => router.push('/(tabs)/conta')} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : null}

      {needsCpf ? (
        <Card style={{ backgroundColor: colors.warningSoft, borderColor: colors.warningSoft }}>
          <AppText variant="bodyStrong">Falta seu CPF</AppText>
          <AppText variant="small">O CPF é exigido pelo provedor de pagamento. Informe uma vez e pronto.</AppText>
          <Button title="Informar CPF" variant="secondary" size="sm" onPress={() => router.push('/conta/perfil')} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : null}
    </Screen>
  );
}
