import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { qk } from '@/api/queryKeys';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { AppText, Card, Row, SectionTitle } from '@/components/ui/primitives';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/format';
import { colors, spacing } from '@/theme/tokens';

/** Início: saldo de cashback, categorias e destaques. Funciona sem conta. */
export default function Home() {
  const { me } = useAuth();

  const featured = useQuery({
    queryKey: qk.catalog({ sort: 'rating', pageSize: 10 }),
    queryFn: () => api.catalog.search({ sort: 'rating', pageSize: 10 }),
    staleTime: 5 * 60_000,
  });
  const categories = useQuery({ queryKey: qk.categories, queryFn: () => api.catalog.categories('product'), staleTime: 30 * 60_000 });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen edges={[]}>
        <View style={{ gap: 2 }}>
          <AppText variant="title">{me ? `Olá, ${me.name.split(' ')[0]}` : 'OpenDriverHub'}</AppText>
          <AppText variant="small">Compre nos parceiros e receba cashback para usar nas próximas compras e corridas.</AppText>
        </View>

        {me ? (
          <Card style={{ gap: spacing.sm, backgroundColor: colors.limeSoft, borderColor: colors.limeSoft }}>
            <AppText variant="caption">Seu cashback</AppText>
            <AppText variant="title">{formatCurrency(me.cashbackBalance)}</AppText>
            <AppText variant="small">Vale como desconto no checkout e também nas corridas do OpenDriver.</AppText>
            <Button title="Ver extrato" variant="outline" size="sm" onPress={() => router.push('/cashback')} style={{ alignSelf: 'flex-start' }} />
          </Card>
        ) : (
          <Card style={{ gap: spacing.sm }}>
            <AppText variant="bodyStrong">Entre para ganhar cashback</AppText>
            <AppText variant="small">Você pode olhar o catálogo sem conta. Para comprar e acumular cashback, é preciso entrar.</AppText>
            <Row gap={spacing.sm}>
              <Button title="Entrar" size="sm" style={{ flex: 1 }} onPress={() => router.push('/login')} />
              <Button title="Criar conta" variant="outline" size="sm" style={{ flex: 1 }} onPress={() => router.push('/cadastro')} />
            </Row>
          </Card>
        )}

        {categories.data?.length ? (
          <>
            <SectionTitle title="Categorias" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}>
              {categories.data
                .filter((c) => c.active)
                .map((c) => (
                  <Chip key={c.id} label={c.name} onPress={() => router.push({ pathname: '/(tabs)/catalogo', params: { category: c.name } })} />
                ))}
            </ScrollView>
          </>
        ) : null}

        <SectionTitle title="Mais bem avaliados" action={<Button title="Ver tudo" variant="ghost" size="sm" onPress={() => router.push('/(tabs)/catalogo')} />} />
        {featured.isPending ? (
          <LoadingState label="Carregando ofertas…" />
        ) : featured.error ? (
          <ErrorState error={featured.error} onRetry={() => featured.refetch()} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingVertical: 2 }}>
            {(featured.data?.items ?? []).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ScrollView>
        )}
      </Screen>
    </SafeAreaView>
  );
}
