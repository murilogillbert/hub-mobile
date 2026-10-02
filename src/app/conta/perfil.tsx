import { router } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { AppText } from '@/components/ui/primitives';
import { useAuth } from '@/context/AuthContext';
import { maskCpf, maskPhone, onlyDigits } from '@/lib/masks';
import { alertError } from '@/lib/recovery';
import { isCpf, isPhone } from '@/lib/validation';

/** Dados pessoais — a mesma conta do site e do app de corridas. */
export default function Perfil() {
  const { me, refreshMe } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(me?.name ?? '');
  const [phone, setPhone] = useState(maskPhone(me?.phone ?? ''));
  const [cpf, setCpf] = useState(maskCpf(me?.cpf ?? ''));
  const [busy, setBusy] = useState(false);
  const cpfLocked = !!me?.cpf;

  const errors = {
    name: name.trim().length < 3 ? 'Informe seu nome completo.' : undefined,
    phone: phone.length > 0 && !isPhone(phone) ? 'Use DDD + número.' : undefined,
    cpf: !cpfLocked && cpf.length > 0 && !isCpf(cpf) ? 'CPF inválido.' : undefined,
  };
  const valid = !errors.name && !errors.phone && !errors.cpf;

  const save = async () => {
    setBusy(true);
    try {
      await api.me.updateProfile({
        name: name.trim(),
        // O schema do backend exige `email` mesmo sem alteração; reenviamos o atual.
        email: me?.email ?? '',
        phone: phone ? onlyDigits(phone) : undefined,
        cpf: !cpfLocked && cpf ? onlyDigits(cpf) : undefined,
      });
      await refreshMe();
      toast.success('Dados atualizados.');
      router.back();
    } catch (err) {
      alertError(err, 'Não foi possível salvar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Salvar" size="lg" disabled={!valid} loading={busy} onPress={save} />}>
      <AppText variant="small">Estes dados são os mesmos da sua conta no site e no app de corridas.</AppText>
      <TextField label="Nome completo" value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
      <TextField label="E-mail" value={me?.email ?? ''} editable={false} hint="Para trocar o e-mail, fale com o suporte." />
      <TextField label="Celular" value={phone} onChangeText={(v) => setPhone(maskPhone(v))} keyboardType="phone-pad" error={errors.phone} />
      <TextField
        label="CPF"
        value={cpf}
        onChangeText={(v) => setCpf(maskCpf(v))}
        keyboardType="number-pad"
        editable={!cpfLocked}
        hint={cpfLocked ? 'Para corrigir o CPF, fale com o suporte.' : 'Necessário para pagar.'}
        error={errors.cpf}
      />
    </Screen>
  );
}
