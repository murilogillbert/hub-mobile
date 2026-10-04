import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuração nativa (CNG: ios/ e android/ são gerados no build).
 * Variáveis por perfil em eas.json / ambiente EAS:
 *  APP_VARIANT              development | preview | production
 *  EXPO_PUBLIC_API_URL      API do hub, ex.: https://hubapi.opendriver.com.br
 *  EXPO_PUBLIC_WEB_URL      site do hub (áreas de parceiro/admin abrem no navegador)
 *  EAS_PROJECT_ID           necessário para push, quando o backend suportar
 */
const VARIANT = (process.env.APP_VARIANT ?? 'development') as 'development' | 'preview' | 'production';
const IS_PROD = VARIANT === 'production';
const SUFFIX = IS_PROD ? '' : VARIANT === 'preview' ? '.preview' : '.dev';
const BUNDLE_ID = process.env.IOS_BUNDLE_ID ?? 'br.com.opendriverhub.app';
const PACKAGE = process.env.ANDROID_PACKAGE ?? 'br.com.opendriverhub.app';
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://hub.opendriver.com.br').replace(/\/+$/, '');

/**
 * Domínios que sabidamente não existem. Verificado por DNS em 2026-10-02:
 * `opendriverhub.com.br` não resolve e `opendriverhub.com` não tem registro algum. Eram o
 * padrão daqui, e de `WEB_URL` saem as URLs de política de privacidade e de termos — que a
 * revisão da Apple **abre**. Link morto é recusa.
 *
 * A guarda de https abaixo não pegava isso, porque `https://opendriverhub.com.br` é https
 * válido e inexistente ao mesmo tempo. Daí a lista explícita.
 */
const DOMINIOS_MORTOS = ['opendriverhub.com.br', 'opendriverhub.com'];

// Build de loja com API em http seria vazamento de token em rede aberta — falha aqui, não em revisão.
if (VARIANT !== 'development') {
  const problems: string[] = [];
  if (!/^https:\/\//.test(API_URL)) problems.push(`EXPO_PUBLIC_API_URL deve ser https (recebido: "${API_URL}")`);
  if (!/^https:\/\//.test(WEB_URL)) problems.push('EXPO_PUBLIC_WEB_URL deve ser https');
  for (const url of [API_URL, WEB_URL]) {
    const morto = DOMINIOS_MORTOS.find((d) => url.includes(d));
    if (morto) {
      problems.push(`"${morto}" não existe (sem registro DNS). Use hub.opendriver.com.br.`);
    }
  }
  if (problems.length) throw new Error(`Configuração inválida para o build "${VARIANT}":\n- ${problems.join('\n- ')}`);
}

const NAVY = '#0A1726';
const CAMERA = 'A câmera é usada apenas para ler o QR do voucher no momento do resgate.';
const LOCATION = 'Usamos sua localização para mostrar as lojas parceiras mais perto de você.';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_PROD ? 'OpenDriverHub' : `OpenDriverHub (${VARIANT === 'preview' ? 'Preview' : 'Dev'})`,
  slug: 'opendriverhub',
  owner: process.env.EAS_OWNER || undefined,
  scheme: 'opendriverhub',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  backgroundColor: '#F7F9FB',
  runtimeVersion: { policy: 'appVersion' },
  ios: {
    bundleIdentifier: `${BUNDLE_ID}${SUFFIX}`,
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      CFBundleDevelopmentRegion: 'pt-BR',
      UIBackgroundModes: ['remote-notification'],
      LSApplicationQueriesSchemes: ['whatsapp', 'tel', 'mailto'],
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [],
      NSPrivacyAccessedAPITypes: [
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['C617.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime', NSPrivacyAccessedAPITypeReasons: ['35F9.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace', NSPrivacyAccessedAPITypeReasons: ['E174.1'] },
      ],
    },
  },
  android: {
    package: `${PACKAGE}${SUFFIX}`,
    /**
     * O Play recusa upload com `versionCode` já usado, e o template do prebuild grava `1`
     * fixo em `android/app/build.gradle` quando este campo não existe — passar
     * `-PversionCode` ao gradle não resolve, porque o template não lê essa propriedade.
     * Por isso o valor mora aqui, e `infra/server/38-aab.ps1` o injeta por
     * `ANDROID_VERSION_CODE`.
     */
    versionCode: Number(process.env.ANDROID_VERSION_CODE ?? 2),
    adaptiveIcon: {
      backgroundColor: NAVY,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.VIBRATE',
    ],
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.RECORD_AUDIO',
      /**
       * `SYSTEM_ALERT_WINDOW` ("desenhar sobre outros apps") entrava no APK **sem** ser
       * pedida: vem do manifesto do `expo-dev-client`, por fusão de manifestos. Encontrada
       * inspecionando o APK de release com `aapt2 dump badging` — nenhuma leitura desta
       * configuração mostraria, porque a permissão não está declarada aqui.
       *
       * É permissão de alto risco: a Play Store exige justificativa, e é a que golpes de
       * sobreposição de tela usam. Este app não tem uso legítimo para ela.
       */
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
    ['expo-secure-store', { faceIDPermission: false, configureAndroidBackup: true }],
    'expo-asset',
    'expo-image',
    'expo-web-browser',
    'expo-font',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 180, resizeMode: 'contain', backgroundColor: NAVY }],
    ['expo-camera', { cameraPermission: CAMERA, recordAudioAndroid: false }],
    ['expo-notifications', { icon: './assets/android-icon-monochrome.png', color: NAVY }],
    ['expo-location', { locationWhenInUsePermission: LOCATION, isIosBackgroundLocationEnabled: false, isAndroidBackgroundLocationEnabled: false }],
  ],
  experiments: { typedRoutes: true },
  extra: {
    variant: VARIANT,
    apiUrl: API_URL,
    webUrl: WEB_URL,
    router: {},
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
});
