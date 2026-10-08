import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PushRegistrar } from '@/components/PushRegistrar';
import { ToastProvider } from '@/components/Toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { QueryProvider } from '@/context/QueryProvider';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <CartProvider>
              <ToastProvider>
                <StatusBar style="dark" />
                <PushRegistrar />
                <RootNavigator />
              </ToastProvider>
            </CartProvider>
          </AuthProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { status, me, isPartnerRole } = useAuth();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  if (status === 'loading') return null; // splash nativo continua visível

  const signedIn = status === 'signedIn';
  // Catálogo é aberto: dá pra navegar e montar carrinho sem conta, e o login só é exigido no
  // checkout. Exigir conta na abertura derruba conversão e não protege nada.
  //
  // `isPartnerRole` vem do contexto, e não é recalculado aqui: a tela de conta usa o mesmo
  // valor para decidir se mostra "Validar voucher", e a cópia local foi justamente o que
  // deixou as duas divergirem (a tela mostrava para `financeiro`, esta rota não existia).

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.navy,
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ title: 'Entrar' }} />
        <Stack.Screen name="cadastro" options={{ title: 'Criar conta' }} />
        <Stack.Screen name="esqueci-senha" options={{ title: 'Esqueci a senha' }} />
      </Stack.Protected>

      <Stack.Screen name="produto/[id]" options={{ title: 'Produto' }} />

      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="checkout" options={{ title: 'Finalizar compra' }} />
        <Stack.Screen name="pedido/[id]" options={{ title: 'Pedido' }} />
        <Stack.Screen name="historico" options={{ title: 'Histórico' }} />
        <Stack.Screen name="cashback" options={{ title: 'Cashback' }} />
        <Stack.Screen name="notificacoes" options={{ title: 'Avisos' }} />
        <Stack.Screen name="conta/perfil" options={{ title: 'Dados pessoais' }} />
        <Stack.Screen name="conta/senha" options={{ title: 'Alterar senha' }} />
        <Stack.Screen name="conta/preferencias" options={{ title: 'Preferências de aviso' }} />
        <Stack.Screen name="conta/excluir" options={{ title: 'Excluir conta' }} />
      </Stack.Protected>

      {/* Balcão da loja: ler o QR do cliente, efetivar o resgate e ajustar preço/estoque. */}
      <Stack.Protected guard={signedIn && isPartnerRole}>
        <Stack.Screen name="parceiro/venda" options={{ title: 'Validar voucher' }} />
        <Stack.Screen name="parceiro/produtos" options={{ title: 'Meus produtos' }} />
        <Stack.Screen name="parceiro/produto/[id]" options={{ title: 'Ajustar produto' }} />
      </Stack.Protected>

      <Stack.Screen name="sobre" options={{ title: 'Sobre' }} />
      <Stack.Screen name="+not-found" options={{ title: 'Não encontrado' }} />
    </Stack>
  );
}
