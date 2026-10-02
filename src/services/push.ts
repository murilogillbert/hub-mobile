import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '@/api/client';

/**
 * Registro do aparelho para push (POST /me/push-tokens).
 *
 * Só roda em aparelho físico e só depois de a pessoa aceitar a permissão — nunca pedimos na
 * abertura, e sim quando já faz sentido (sessão ativa). Falha aqui jamais quebra o app: os avisos
 * continuam disponíveis na aba Conta, que é a fonte da verdade no servidor.
 */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;
  try {
    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await api.me.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
    return token;
  } catch (err) {
    console.warn('Push indisponível', (err as Error).message);
    return null;
  }
}

/** Sair da conta não deve deixar o aparelho recebendo aviso de quem saiu. */
export async function unregisterPush(token: string): Promise<void> {
  await api.me.unregisterPushToken(token).catch(() => undefined);
}
