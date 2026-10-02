import { router } from 'expo-router';
import { useState } from 'react';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Controls';
import { TermsConsent } from '@/components/TermsConsent';
import { TextField } from '@/components/ui/TextField';
import { AppText } from '@/components/ui/primitives';
import { useAuth } from '@/context/AuthContext';
import { maskCpf, maskPhone, onlyDigits } from '@/lib/masks';
import { alertError } from '@/lib/recovery';
import { isCpf, isEmail, isPhone, passwordProblem } from '@/lib/validation';

type Role = 'Passenger' | 'Driver';

/** Cadastro de cliente. Parceiro continua pela web — o app não tem a área de gestão. */
export default function Cadastro() {
  const { signUp } = useAuth();
  const [role, setRole] = useState<Role>('Passenger');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const errors = {
    name: name.length > 0 && name.trim().length < 3 ? 'Informe seu nome completo.' : undefined,
    email: email.length > 0 && !isEmail(email) ? 'E-mail inválido.' : undefined,
    phone: phone.length > 0 && !isPhone(phone) ? 'Use DDD + número.' : undefined,
    cpf: cpf.length > 0 && !isCpf(cpf) ? 'CPF inválido.' : undefined,
    password: password.length > 0 ? (passwordProblem(password) ?? undefined) : undefined,
  };
  const valid =
    name.trim().length >= 3 && isEmail(email) && isPhone(phone) && !errors.cpf && !passwordProblem(password) && accepted;

  const submit = async () => {
    setBusy(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: onlyDigits(phone),
        cpf: cpf ? onlyDigits(cpf) : undefined,
        role,
      });
      router.replace('/(tabs)');
    } catch (err) {
      alertError(err, 'Não foi possível criar a conta');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Criar conta" size="lg" disabled={!valid} loading={busy} onPress={submit} />}>
      <AppText variant="label">Você é</AppText>
      <Segmented
        accessibilityLabel="Tipo de conta"
        value={role}
        onChange={setRole}
        options={[
          { value: 'Passenger', label: 'Passageiro' },
          { value: 'Driver', label: 'Motorista' },
        ]}
      />
      <AppText variant="small">
        Motorista tem acesso aos benefícios do programa de afiliação das lojas. Você pode comprar no catálogo de qualquer forma.
      </AppText>

      <TextField label="Nome completo" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" error={errors.name} />
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={errors.email}
      />
      <TextField label="Celular" value={phone} onChangeText={(v) => setPhone(maskPhone(v))} keyboardType="phone-pad" error={errors.phone} />
      <TextField
        label="CPF (opcional)"
        value={cpf}
        onChangeText={(v) => setCpf(maskCpf(v))}
        keyboardType="number-pad"
        hint="Necessário para pagar; pode informar depois."
        error={errors.cpf}
      />
      <TextField label="Senha" value={password} onChangeText={setPassword} password autoComplete="new-password" error={errors.password} />
      <TermsConsent checked={accepted} onChange={setAccepted} />
      <Button title="Já tenho conta" variant="ghost" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
