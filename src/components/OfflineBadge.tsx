import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Badge } from './ui/primitives';

/**
 * Aviso discreto de "sem conexão". Diferente do app de corridas, aqui não há tempo real por
 * socket: o sinal vem do próprio sistema, e só aparece depois de alguns segundos para não piscar
 * em oscilação curta de rede. As telas seguem funcionando com o que já está em cache.
 */
export function OfflineBadge() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (state.isConnected === false) timer = setTimeout(() => setShow(true), 4000);
      else setShow(false);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return show ? <Badge label="Sem conexão" tone="warning" icon="cloud-offline-outline" /> : null;
}
