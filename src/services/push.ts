import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '@/api/client';

/**
 * Motivo pelo qual o registro de push não aconteceu.
 *
 * Existe porque "push não funciona" tinha três causas muito diferentes e todas terminavam no
 * mesmo `console.warn`: uma é esperada (a pessoa recusou), uma é erro de configuração do build
 * e uma é problema de servidor. Sem distinguir, não há como saber qual investigar.
 */
export type MotivoSemPush =
  | 'emulador'
  | 'permissao-negada'
  | 'projeto-eas-ausente'
  | 'servidor-recusou'
  | 'erro-inesperado';

export type ResultadoDoPush =
  | { ok: true; token: string }
  | { ok: false; motivo: MotivoSemPush; detalhe?: string };

/**
 * `projectId` do EAS, que o `getExpoPushTokenAsync` **exige** fora do Expo Go.
 *
 * Isto era um defeito real: a chamada era feita sem `projectId`, então em build de loja ela
 * lançava "No projectId found" e o `catch` engolia — push nunca funcionaria, e sem sinal
 * nenhum. O `app.config.ts` só preenche `extra.eas` quando a variável `EAS_PROJECT_ID` existe,
 * e não há `.env.example` neste repositório documentando isso.
 */
function projectIdDoEas(): string | null {
  const deExtra = (
    Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  )?.eas?.projectId;
  const deEasConfig = (Constants as { easConfig?: { projectId?: string } }).easConfig
    ?.projectId;
  return deExtra ?? deEasConfig ?? null;
}

/**
 * Registro do aparelho para push (`POST /me/push-tokens`).
 *
 * Só roda em aparelho físico e só depois de a pessoa aceitar a permissão — nunca pedimos na
 * abertura, e sim quando já faz sentido (sessão ativa).
 *
 * **Falha aqui jamais quebra o aplicativo**, e isso é de propósito: os avisos continuam
 * disponíveis na aba Conta, que é a fonte da verdade no servidor. O que mudou é que a falha
 * deixou de ser invisível — cada motivo tem nome e mensagem própria.
 *
 * Nota de produção: a tabela `public.push_tokens` vem da migration `20261002210000_push_tokens`
 * do hub, que **pode não estar aplicada**. Nesse caso o motivo é `servidor-recusou`, e a
 * mensagem diz o que conferir.
 */
export async function registerForPush(): Promise<ResultadoDoPush> {
  if (!Device.isDevice) {
    return { ok: false, motivo: 'emulador' };
  }

  const projectId = projectIdDoEas();
  if (!projectId) {
    console.warn(
      '[push] EAS_PROJECT_ID ausente no build: o token de push nao pode ser emitido. ' +
        'Defina EAS_PROJECT_ID no perfil do eas.json ou no ambiente do EAS.'
    );
    return { ok: false, motivo: 'projeto-eas-ausente' };
  }

  let token: string;
  try {
    const atual = await Notifications.getPermissionsAsync();
    const concedida =
      atual.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!concedida) {
      // Caso esperado, não é erro: a pessoa pode recusar e o aplicativo segue inteiro.
      return { ok: false, motivo: 'permissao-negada' };
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (err) {
    const detalhe = (err as Error).message;
    console.warn('[push] nao foi possivel obter o token do aparelho:', detalhe);
    return { ok: false, motivo: 'erro-inesperado', detalhe };
  }

  try {
    await api.me.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
    return { ok: true, token };
  } catch (err) {
    const detalhe = (err as Error).message;
    console.warn(
      '[push] o servidor recusou o token. Se for erro de banco, confira se a migration ' +
        `20261002210000_push_tokens foi aplicada em producao. Detalhe: ${detalhe}`
    );
    return { ok: false, motivo: 'servidor-recusou', detalhe };
  }
}

/** Sair da conta não deve deixar o aparelho recebendo aviso de quem saiu. */
export async function unregisterPush(token: string): Promise<void> {
  await api.me.unregisterPushToken(token).catch(() => undefined);
}
