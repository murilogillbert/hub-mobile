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
const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://opendriverhub.com.br').replace(/\/+$/, '');

// Build de loja com API em http seria vazamento de token em rede aberta — falha aqui, não em revisão.
if (VARIANT !== 'development') {
  const problems: string[] = [];
  if (!/^https:\/\//.test(API_URL)) problems.push(`EXPO_PUBLIC_API_URL deve ser https (recebido: "${API_URL}")`);
  if (!/^https:\/\//.test(WEB_URL)) problems.push('EXPO_PUBLIC_WEB_URL deve ser https');
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
