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
/**
 * Dominio do site do hub. **`opendriverhub.com.br` nao existe** — verificado por DNS em
 * 2026-10-02, nao resolve, e `opendriverhub.com` nao tem registro algum. O dominio que serve o
 * hub e `hub.opendriver.com.br`.
 *
 * Isto nao e detalhe de configuracao: daqui saem as URLs de politica de privacidade e de
 * termos, e a revisao da Apple **abre** a de privacidade. Link morto e recusa. E como
 * `EXPO_PUBLIC_*` e embutido no bundle em tempo de build, errar aqui so e descoberto depois de
 * submeter.
 */
const webUrl = strip(
  process.env.EXPO_PUBLIC_WEB_URL || extra.webUrl || 'https://hub.opendriver.com.br'
);

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

/**
 * As lojas exigem URL publica de politica de privacidade e um canal de suporte **que
 * funcione** — o avaliador testa os dois.
 *
 * O e-mail de suporte usa `opendriver.com.br`, que e o dominio do ecossistema. O valor
 * anterior era `suporte@opendriverhub.com`, num dominio sem registro DNS nenhum, entao a caixa
 * nao existia. O envio sai pelo provedor configurado no hub (Gmail), nao por MX deste dominio.
 */
export const links = {
  /**
   * As páginas legais apontam para a **API**, não para o site.
   *
   * `${webUrl}/privacidade` e `${webUrl}/termos` **não existiam**: o roteador do SPA não
   * registra esses caminhos, o nginx devolve `index.html` com status 200 para qualquer
   * caminho (`try_files $uri /index.html`) e o catch-all do roteador redireciona para a home.
   * O revisor da Apple abriria o link da política de privacidade e veria a página inicial da
   * loja — e por `curl` isso é indistinguível de uma página real.
   *
   * Agora o backend serve as duas em `/legal/*`, com texto LGPD completo e identificação do
   * controlador. Mesmo padrão e mesmo caminho do opendriver, para o ecossistema ter uma
   * convenção só.
   */
  privacyPolicy: process.env.EXPO_PUBLIC_PRIVACY_URL || `${apiUrl}/legal/privacidade`,
  terms: process.env.EXPO_PUBLIC_TERMS_URL || `${apiUrl}/legal/termos`,

  /**
   * Caixa que **recebe de verdade**, conferido por DNS.
   *
   * `suporte@opendriver.com.br` não recebia nada: o domínio publica `MX .` (null MX, que
   * declara "este domínio não recebe e-mail"), `SPF -all` e `DMARC p=reject`. As duas lojas
   * exigem canal de suporte funcional, e caixa morta é reprovação.
   */
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'murilogillbert@gmail.com',

  /** Telas que o app não cobre (parceiro/admin/financeiro) abrem aqui no navegador. */
  partnerArea: `${webUrl}/parceiro`,
} as const;
