import { router } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { AppText, Card } from '@/components/ui/primitives';
import { useAuth } from '@/context/AuthContext';
import { alertError, confirm } from '@/lib/recovery';
import { colors, spacing } from '@/theme/tokens';

/**
 * Exclusão de conta pedida dentro do app — exigência das lojas (App Store 5.1.1(v)).
 *
 * O servidor anonimiza a conta em vez de apagar a linha: pedidos, extrato de cashback e comissões
 * das lojas precisam continuar íntegros. A tela diz isso com todas as letras, em vez de prometer
 * um apagamento que não acontece.
 */
export default function ExcluirConta() {
  const { me, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!(await confirm('Excluir sua conta?', 'Esta ação não pode ser desfeita. Você perderá o acesso e o saldo de cashback.', 'Excluir'))) return;
    setBusy(true);
    try {
      await api.me.deleteAccount(password);
      await signOut();
      router.replace('/(tabs)');
    } catch (err) {
      alertError(err, 'Não foi possível excluir a conta');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        <Button title="Excluir minha conta" variant="danger" size="lg" disabled={!password || !understood} loading={busy} onPress={submit} />
      }
    >
      <Card style={{ gap: spacing.sm, backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }}>
        <AppText variant="bodyStrong">Isto é definitivo</AppText>
        <AppText variant="small">
          Você perde o acesso à conta {me?.email} e o saldo de cashback, que não é reembolsável. Seus dados pessoais (nome, e-mail,
          telefone, CPF e foto) são apagados.
        </AppText>
        <AppText variant="small">
          Os pedidos já feitos continuam registrados sem seus dados pessoais, porque as lojas parceiras precisam deles para a contabilidade
          das vendas.
        </AppText>
      </Card>

      <AppText variant="small">
        Se você tiver voucher pago e ainda não resgatado, use ou cancele antes — a exclusão é recusada enquanto houver pedido em aberto.
      </AppText>

      <TextField label="Confirme sua senha" value={password} onChangeText={setPassword} password autoComplete="current-password" />
      <Checkbox label="Entendi que não é possível desfazer e que perco o saldo de cashback" checked={understood} onChange={setUnderstood} />
    </Screen>
  );
}
