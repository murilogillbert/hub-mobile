import { router } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { alertError } from '@/lib/recovery';
import { passwordProblem } from '@/lib/validation';

export default function AlterarSenha() {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);

  const problem = next.length > 0 ? passwordProblem(next) : null;
  const same = next.length > 0 && next === current;
  const valid = current.length > 0 && !problem && !same;

  const save = async () => {
    setBusy(true);
    try {
      await api.me.changePassword(current, next);
      toast.success('Senha alterada.');
      router.back();
    } catch (err) {
      alertError(err, 'Não foi possível alterar a senha');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Salvar" size="lg" disabled={!valid} loading={busy} onPress={save} />}>
      <TextField label="Senha atual" value={current} onChangeText={setCurrent} password autoComplete="current-password" />
      <TextField
        label="Nova senha"
        value={next}
        onChangeText={setNext}
        password
        autoComplete="new-password"
        error={problem ?? (same ? 'A nova senha precisa ser diferente da atual.' : undefined)}
      />
    </Screen>
  );
}
