import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

/** O app sempre abre no catálogo — com ou sem conta. Login só é exigido para comprar. */
export default function Index() {
  const { status } = useAuth();
  if (status === 'loading') return null;
  return <Redirect href="/(tabs)" />;
}
