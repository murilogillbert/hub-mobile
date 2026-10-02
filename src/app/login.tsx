import { router } from 'expo-router';
import { useState } from 'react';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { AppText } from '@/components/ui/primitives';
import { useAuth } from '@/context/AuthContext';
import { alertError } from '@/lib/recovery';
import { isEmail } from '@/lib/validation';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const valid = isEmail(email) && password.length > 0;

  const submit = async () => {
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      // A sessão nova remonta a navegação; volta pra onde a pessoa estava.
      router.back();
    } catch (err) {
      alertError(err, 'Não foi possível entrar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Entrar" size="lg" disabled={!valid} loading={busy} onPress={submit} />}>
      <AppText variant="small">Use a mesma conta do site do OpenDriverHub e do app de corridas.</AppText>
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
      />
      <TextField label="Senha" value={password} onChangeText={setPassword} password autoComplete="current-password" />
      <Button title="Esqueci minha senha" variant="ghost" onPress={() => router.push('/esqueci-senha')} />
      <Button title="Criar conta" variant="outline" onPress={() => router.replace('/cadastro')} />
    </Screen>
  );
}
