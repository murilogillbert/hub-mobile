import { router } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { SwitchRow } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { AppText, Card } from '@/components/ui/primitives';
import { useAuth } from '@/context/AuthContext';
import { alertError } from '@/lib/recovery';
import { spacing } from '@/theme/tokens';

/** Como a pessoa quer ser avisada. Canais do servidor (e-mail/WhatsApp) — push ainda não existe. */
export default function Preferencias() {
  const { me, refreshMe } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState(me?.notifyEmail ?? true);
  const [whatsApp, setWhatsApp] = useState(me?.notifyWhatsApp ?? false);
  const [promo, setPromo] = useState(me?.notifyPromo ?? false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.me.notificationPrefs({ email, whatsApp, promo });
      await refreshMe();
      toast.success('Preferências salvas.');
      router.back();
    } catch (err) {
      alertError(err, 'Não foi possível salvar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Salvar" size="lg" loading={busy} onPress={save} />}>
      <Card style={{ padding: spacing.xs }}>
        <SwitchRow title="E-mail" subtitle="Confirmação de compra e avisos de cashback" value={email} onValueChange={setEmail} />
        <SwitchRow title="WhatsApp" subtitle="Mensagens sobre seus pedidos" value={whatsApp} onValueChange={setWhatsApp} />
        <SwitchRow title="Ofertas e novidades" subtitle="Promoções dos parceiros" value={promo} onValueChange={setPromo} />
      </Card>
      <AppText variant="small">
        Avisos sobre pedidos e resgates também chegam como notificação no celular e ficam guardados na aba Conta, em &quot;Avisos&quot;. A
        permissão de notificação é pedida pelo sistema e pode ser revista nos ajustes do aparelho.
      </AppText>
    </Screen>
  );
}
