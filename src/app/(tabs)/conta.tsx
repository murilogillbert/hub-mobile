import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { qk } from '@/api/queryKeys';
import { RemoteImage } from '@/components/Media';
import { Avatar } from '@/components/Avatar';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { AppText, Badge, Card, SectionTitle } from '@/components/ui/primitives';
import { env, links } from '@/config/env';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/format';
import { alertError, confirm } from '@/lib/recovery';
import { colors, spacing } from '@/theme/tokens';

export default function Conta() {
  const { me, status, signOut, isWebOnlyRole, isPartnerRole } = useAuth();
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const notifications = useQuery({
    queryKey: qk.notifications,
    queryFn: () => api.me.notifications(),
    enabled: status === 'signedIn',
    staleTime: 60_000,
  });
  const unread = (notifications.data ?? []).filter((n) => !n.read).length;

  const resend = async () => {
    if (!me) return;
    setSending(true);
    try {
      await api.auth.resendVerification(me.email);
      toast.success('Enviamos o link para o seu e-mail.');
    } catch (err) {
      alertError(err);
    } finally {
      setSending(false);
    }
  };

  const logout = async () => {
    if (!(await confirm('Sair da conta?', 'Você precisará entrar de novo neste aparelho.', 'Sair'))) return;
    setLeaving(true);
    await signOut();
  };

  if (status !== 'signedIn' || !me) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <Screen edges={[]}>
          <AppText variant="title">Sua conta</AppText>
          <AppText variant="small">Entre para comprar, acompanhar seus vouchers e acumular cashback.</AppText>
          <Button title="Entrar" size="lg" onPress={() => router.push('/login')} />
          <Button title="Criar conta" variant="outline" onPress={() => router.push('/cadastro')} />
          <SectionTitle title="Sobre" />
          <Card style={{ padding: spacing.xs }}>
            <ListRow icon="document-text-outline" title="Termos de uso" onPress={() => void WebBrowser.openBrowserAsync(links.terms)} />
            <ListRow icon="eye-outline" title="Privacidade" onPress={() => void WebBrowser.openBrowserAsync(links.privacyPolicy)} />
            <ListRow icon="information-circle-outline" title="Sobre e suporte" onPress={() => router.push('/sobre')} />
          </Card>
        </Screen>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen edges={[]}>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <Avatar nome={me.name} uri={me.avatarUrl} size={64} accessibilityLabel="Sua foto" />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="subtitle">{me.name}</AppText>
            <AppText variant="small">{me.email}</AppText>
          </View>
        </View>

        {!me.emailVerifiedAt ? (
          <Card style={{ backgroundColor: colors.warningSoft, borderColor: colors.warningSoft }}>
            <AppText variant="bodyStrong">Confirme seu e-mail</AppText>
            <AppText variant="small">Enviamos um link para {me.email}. A confirmação libera a compra.</AppText>
            <Button title="Reenviar e-mail" variant="outline" size="sm" loading={sending} onPress={resend} style={{ alignSelf: 'flex-start' }} />
          </Card>
        ) : null}

        <Card style={{ gap: spacing.sm, backgroundColor: colors.limeSoft, borderColor: colors.limeSoft }}>
          <AppText variant="caption">Cashback disponível</AppText>
          <AppText variant="title">{formatCurrency(me.cashbackBalance)}</AppText>
          <Button title="Ver extrato" variant="outline" size="sm" onPress={() => router.push('/cashback')} style={{ alignSelf: 'flex-start' }} />
        </Card>

        <SectionTitle title="Compras" />
        <Card style={{ padding: spacing.xs }}>
          <ListRow icon="ticket-outline" title="Meus itens" onPress={() => router.push('/(tabs)/itens')} />
          <ListRow icon="receipt-outline" title="Histórico de pedidos" onPress={() => router.push('/historico')} />
          <ListRow
            icon="notifications-outline"
            title="Avisos"
            right={unread ? <Badge label={String(unread)} tone="info" /> : undefined}
            onPress={() => router.push('/notificacoes')}
          />
        </Card>

        {/*
          Duas condições diferentes de propósito.

          `isPartnerRole` (partner/admin) libera o **balcão**: a rota `parceiro/venda` é
          protegida pelo mesmo valor no `_layout`, e o backend exige `ROLES.partner`. Antes esta
          seção inteira usava `isWebOnlyRole`, que inclui `financeiro` — e para um usuário
          financeiro o toque em "Validar voucher" caía em "não encontrado", porque a rota nem
          chega a ser registrada.

          `isWebOnlyRole` libera o **atalho da web**, que faz sentido para os três papéis; o que
          muda é para qual área ele aponta.
        */}
        {isPartnerRole ? (
          <>
            <SectionTitle title="Loja parceira" />
            <Card style={{ padding: spacing.xs }}>
              <ListRow icon="qr-code-outline" title="Validar voucher" subtitle="Ler o QR do cliente no balcão" onPress={() => router.push('/parceiro/venda')} />
              <ListRow
                icon="pricetags-outline"
                title="Meus produtos"
                subtitle="Ajustar preço, estoque e disponibilidade por unidade"
                onPress={() => router.push('/parceiro/produtos')}
              />
              <ListRow
                icon="open-outline"
                title="Painel do parceiro"
                subtitle="Cadastro, unidades, horários e métricas na web"
                onPress={() => void WebBrowser.openBrowserAsync(links.partnerArea)}
              />
            </Card>
          </>
        ) : isWebOnlyRole ? (
          <>
            <SectionTitle title="Financeiro" />
            <Card style={{ padding: spacing.xs }}>
              <ListRow
                icon="open-outline"
                title="Painel financeiro"
                subtitle="Saques e afiliados na web"
                onPress={() => void WebBrowser.openBrowserAsync(links.financeiroArea)}
              />
            </Card>
          </>
        ) : null}

        <SectionTitle title="Conta" />
        <Card style={{ padding: spacing.xs }}>
          <ListRow icon="person-outline" title="Dados pessoais" onPress={() => router.push('/conta/perfil')} />
          <ListRow icon="lock-closed-outline" title="Alterar senha" onPress={() => router.push('/conta/senha')} />
          <ListRow icon="options-outline" title="Preferências de aviso" onPress={() => router.push('/conta/preferencias')} />
          <ListRow icon="document-text-outline" title="Termos de uso" onPress={() => void WebBrowser.openBrowserAsync(links.terms)} />
          <ListRow icon="eye-outline" title="Privacidade" onPress={() => void WebBrowser.openBrowserAsync(links.privacyPolicy)} />
          <ListRow icon="information-circle-outline" title="Sobre e suporte" onPress={() => router.push('/sobre')} />
        </Card>

        <Button title="Sair" variant="outline" icon="log-out-outline" loading={leaving} onPress={logout} />
        <Button title="Excluir minha conta" variant="ghost" onPress={() => router.push('/conta/excluir')} />
        {env.variant !== 'production' ? <AppText variant="small">Build {env.variant} · API {env.apiUrl}</AppText> : null}
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64 },
});
