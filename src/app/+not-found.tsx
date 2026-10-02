import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';

export default function NotFound() {
  return (
    <Screen>
      <EmptyState
        icon="help-circle-outline"
        title="Página não encontrada"
        message="O link que você abriu não existe mais."
        action={<Button title="Ir para o início" onPress={() => router.replace('/(tabs)')} />}
      />
    </Screen>
  );
}
