import { router } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { AppText, Card } from '@/components/ui/primitives';
import { alertError } from '@/lib/recovery';
import { isEmail } from '@/lib/validation';
import { spacing } from '@/theme/tokens';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.auth.forgotPassword(email.trim().toLowerCase());
      // A API responde igual exista ou não a conta (não revela e-mail cadastrado).
      setSent(true);
    } catch (err) {
      alertError(err);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Screen footer={<Button title="Voltar para entrar" size="lg" onPress={() => router.replace('/login')} />}>
        <Card style={{ gap: spacing.sm }}>
          <AppText variant="bodyStrong">Verifique seu e-mail</AppText>
          <AppText variant="small">
            Se existir uma conta com {email.trim()}, enviamos um link para criar uma senha nova. O link é aberto no navegador e expira em 1
            hora.
          </AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button title="Enviar link" size="lg" disabled={!isEmail(email)} loading={busy} onPress={submit} />}>
      <AppText variant="small">Informe o e-mail da sua conta e enviamos um link para redefinir a senha.</AppText>
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
      />
    </Screen>
  );
}
