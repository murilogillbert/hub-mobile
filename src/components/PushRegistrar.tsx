import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { qk } from '@/api/queryKeys';
import { useAuth } from '@/context/AuthContext';
import { registerForPush, unregisterPush } from '@/services/push';

/**
 * Liga o push à sessão: registra o aparelho quando há conta, desregistra ao sair e abre o pedido
 * quando a pessoa toca no aviso. Sem UI própria — só efeitos.
 */
export function PushRegistrar() {
  const { status, addSignOutHook } = useAuth();
  const queryClient = useQueryClient();
  const token = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'signedIn') return;
    let cancelled = false;
    void registerForPush().then((resultado) => {
      if (!cancelled && resultado.ok) {
        token.current = resultado.token;
      }
    });
    // Desregistra antes de a sessão ser apagada — depois o endpoint já recusaria.
    const remove = addSignOutHook(async () => {
      if (token.current) await unregisterPush(token.current);
      token.current = null;
    });
    return () => {
      cancelled = true;
      remove();
    };
  }, [status, addSignOutHook]);

  // Aviso recebido com o app aberto: a lista de avisos e o pedido podem ter mudado.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: qk.notifications });
      void queryClient.invalidateQueries({ queryKey: qk.orders() });
    });
    return () => sub.remove();
  }, [queryClient]);

  // Toque no aviso: leva direto ao pedido quando o payload traz o id.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((event) => {
      const data = event.notification.request.content.data as { type?: string; orderId?: string } | undefined;
      if (data?.orderId) router.push({ pathname: '/pedido/[id]', params: { id: data.orderId } });
      else router.push('/notificacoes');
    });
    return () => sub.remove();
  }, []);

  return null;
}
