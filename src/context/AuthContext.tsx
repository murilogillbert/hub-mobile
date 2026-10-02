import { useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, http, subscribeSession, tokenStorage } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { AuthResponse, User } from '@/api/types';

type Status = 'loading' | 'signedOut' | 'signedIn';

/** Papéis que o app atende. Parceiro, admin e financeiro continuam só na web. */
const APP_ROLES = ['client', 'passenger', 'driver'] as const;

interface AuthValue {
  status: Status;
  me: User | null;
  /** O papel desta conta tem área própria no app. */
  isAppRole: boolean;
  /** Conta de parceiro/admin/financeiro: compra igual, mas a gestão fica na web. */
  isWebOnlyRole: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: Parameters<typeof api.auth.register>[0]): Promise<void>;
  signOut(): Promise<void>;
  /** Recarrega /auth/me (depois de comprar, mudar perfil, usar cashback…). */
  refreshMe(): Promise<User | null>;
  /** Hooks de saída (ex.: limpar carrinho) antes de apagar a sessão. */
  addSignOutHook(fn: () => Promise<void> | void): () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<User | null>(null);
  const hooks = useRef(new Set<() => Promise<void> | void>());

  const refreshMe = useCallback(async () => {
    try {
      const next = await api.me.get();
      setMe(next);
      return next;
    } catch (err) {
      if (err instanceof ApiError && err.isUnauthorized) return null; // onExpired cuida
      throw err;
    }
  }, []);

  // Restaura a sessão guardada no Keychain/Keystore.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await tokenStorage.init();
      if (!(await http.hasSession())) {
        if (!cancelled) setStatus('signedOut');
        return;
      }
      try {
        const current = await api.me.get();
        if (cancelled) return;
        setMe(current);
        setStatus('signedIn');
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.isUnauthorized) {
          setStatus('signedOut');
          return;
        }
        // Sem internet na abertura: mantém a sessão e tenta de novo em alguns segundos. As telas
        // mostram o erro com "Tentar de novo" em vez de jogar a pessoa pro login.
        setStatus('signedIn');
        setTimeout(() => {
          if (!cancelled) refreshMe().catch(() => undefined);
        }, 3000);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  // Volta do segundo plano: o saldo de cashback pode ter mudado numa corrida do OpenDriver, que usa
  // a mesma carteira. No máximo a cada 30 s.
  const lastSync = useRef(0);
  useEffect(() => {
    if (status !== 'signedIn') return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' || Date.now() - lastSync.current < 30_000) return;
      lastSync.current = Date.now();
      refreshMe().catch(() => undefined);
    });
    return () => sub.remove();
  }, [status, refreshMe]);

  useEffect(
    () =>
      subscribeSession({
        onExpired: () => {
          queryClient.clear();
          setMe(null);
          setStatus('signedOut');
        },
        onRefreshed: (user) => setMe(user),
      }),
    [queryClient],
  );

  const startSession = useCallback(
    async (res: AuthResponse) => {
      await http.startSession({ token: res.token, refreshToken: res.refreshToken });
      queryClient.clear();
      setMe(res.user);
      setStatus('signedIn');
    },
    [queryClient],
  );

  const signIn = useCallback(async (email: string, password: string) => startSession(await api.auth.login(email, password)), [startSession]);

  const signUp = useCallback(
    async (input: Parameters<typeof api.auth.register>[0]) => startSession(await api.auth.register(input)),
    [startSession],
  );

  const signOut = useCallback(async () => {
    for (const fn of hooks.current) {
      try {
        await fn();
      } catch (err) {
        console.warn('Falha num passo de saída', err);
      }
    }
    await http.endSession();
    queryClient.clear();
    setMe(null);
    setStatus('signedOut');
  }, [queryClient]);

  const addSignOutHook = useCallback((fn: () => Promise<void> | void) => {
    hooks.current.add(fn);
    return () => {
      hooks.current.delete(fn);
    };
  }, []);

  const value = useMemo<AuthValue>(() => {
    const role = me?.role;
    return {
      status,
      me,
      isAppRole: !!role && (APP_ROLES as readonly string[]).includes(role),
      isWebOnlyRole: role === 'partner' || role === 'admin' || role === 'financeiro',
      signIn,
      signUp,
      signOut,
      refreshMe,
      addSignOutHook,
    };
  }, [status, me, signIn, signUp, signOut, refreshMe, addSignOutHook]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
