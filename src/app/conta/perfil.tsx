import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api } from '@/api/client';
import { uploadImage } from '@/api/uploadImage';
import { Avatar } from '@/components/Avatar';
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
  const [fotoBusy, setFotoBusy] = useState(false);
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

  /**
   * Troca da foto.
   *
   * Salva **na hora**, separada do botão "Salvar" dos campos de texto. Duas razões: a pessoa
   * acabou de escolher a imagem e espera ver o resultado, e juntar as duas coisas faria um erro
   * de rede no envio da foto derrubar a edição do nome que ela já havia digitado.
   */
  const trocarFoto = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      toast.error('Precisamos da galeria para escolher a foto.');
      return;
    }

    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      // Quadrado: o avatar é exibido em círculo em toda tela, e recortar aqui evita a surpresa
      // de a foto aparecer cortada depois.
      aspect: [1, 1],
      /**
       * `quality: 0.7` e sem `base64`. O limite do servidor é 10 MB, e foto de celular moderno
       * passa disso em PNG — comprimir aqui evita a viagem inteira para levar um 413. `base64`
       * dobraria o uso de memória sem necessidade: o envio é por `uri`.
       */
      quality: 0.7,
    });
    if (r.canceled || !r.assets[0]) return;

    const asset = r.assets[0];
    setFotoBusy(true);
    try {
      const url = await uploadImage({
        uri: asset.uri,
        name: asset.fileName ?? 'foto.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      });
      /**
       * O `PUT /me/profile` exige nome e e-mail mesmo quando só a foto muda, então reenviamos
       * os valores atuais do formulário — e não os de `me`, para não desfazer o que a pessoa
       * digitou e ainda não salvou.
       */
      await api.me.updateProfile({
        name: name.trim() || (me?.name ?? ''),
        email: me?.email ?? '',
        phone: phone ? onlyDigits(phone) : undefined,
        cpf: !cpfLocked && cpf ? onlyDigits(cpf) : undefined,
        avatarUrl: url,
      });
      await refreshMe();
      toast.success('Foto atualizada.');
    } catch (err) {
      alertError(err, 'Não foi possível trocar a foto');
    } finally {
      setFotoBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Salvar" size="lg" disabled={!valid} loading={busy} onPress={save} />}>
      <View style={styles.foto}>
        <Avatar nome={me?.name ?? ''} uri={me?.avatarUrl} size={96} accessibilityLabel="Sua foto" />
        <Button
          title={me?.avatarUrl ? 'Trocar foto' : 'Adicionar foto'}
          variant="outline"
          icon="camera-outline"
          loading={fotoBusy}
          onPress={() => void trocarFoto()}
        />
      </View>

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

const styles = StyleSheet.create({
  foto: { alignItems: 'center', gap: 12 },
});
