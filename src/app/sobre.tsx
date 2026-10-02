import Constants from 'expo-constants';
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { ListRow } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { AppText, Card, KeyValue } from '@/components/ui/primitives';
import { env, links } from '@/config/env';
import { spacing } from '@/theme/tokens';

export default function Sobre() {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <AppText variant="title">OpenDriverHub</AppText>
      <AppText variant="small">
        Marketplace e cashback para motoristas de aplicativo. Compre nos parceiros, receba cashback e use o saldo nas próximas compras e nas
        corridas do app OpenDriver.
      </AppText>

      <Card style={{ padding: spacing.xs }}>
        <ListRow icon="mail-outline" title="Falar com o suporte" subtitle={links.supportEmail} onPress={() => void Linking.openURL(`mailto:${links.supportEmail}`)} />
        <ListRow icon="globe-outline" title="Abrir o site" onPress={() => void WebBrowser.openBrowserAsync(env.webUrl)} />
        <ListRow icon="document-text-outline" title="Termos de uso" onPress={() => void WebBrowser.openBrowserAsync(links.terms)} />
        <ListRow icon="eye-outline" title="Política de privacidade" onPress={() => void WebBrowser.openBrowserAsync(links.privacyPolicy)} />
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <KeyValue label="Versão" value={version} />
        {env.variant !== 'production' ? <KeyValue label="Build" value={env.variant} /> : null}
      </Card>
    </Screen>
  );
}
