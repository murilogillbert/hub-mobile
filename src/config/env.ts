import Constants from 'expo-constants';

type Variant = 'development' | 'preview' | 'production';

interface Extra {
  variant?: Variant;
  apiUrl?: string;
  webUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
const strip = (url: string) => url.replace(/\/+$/, '');

/**
 * EXPO_PUBLIC_* é embutido no bundle em tempo de build; `extra` (app.config.ts) é o fallback do
 * mesmo build. Em builds de loja o app.config.ts já recusou URL que não seja https.
 */
const apiUrl = strip(process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || 'http://localhost:5000');
const webUrl = strip(process.env.EXPO_PUBLIC_WEB_URL || extra.webUrl || 'https://opendriverhub.com.br');

export const env = {
  variant: (extra.variant ?? 'development') as Variant,
  /** Origem da API do hub (sem /api/v1). */
  apiUrl,
  apiBaseUrl: `${apiUrl}/api/v1`,
  /**
   * Site do hub. O app cobre a área do cliente; as áreas de parceiro, admin e financeiro seguem só
   * na web, e é pra lá que mandamos quem entra com um desses papéis.
   */
  webUrl,
} as const;

/** As lojas exigem URL pública de política de privacidade e um canal de suporte. */
export const links = {
  privacyPolicy: process.env.EXPO_PUBLIC_PRIVACY_URL || `${webUrl}/privacidade`,
  terms: process.env.EXPO_PUBLIC_TERMS_URL || `${webUrl}/termos`,
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'suporte@opendriverhub.com',
  /** Telas que o app não cobre (parceiro/admin/financeiro) abrem aqui no navegador. */
  partnerArea: `${webUrl}/parceiro`,
} as const;
