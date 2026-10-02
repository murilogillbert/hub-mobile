import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { qk } from '@/api/queryKeys';
import type { CatalogQuery } from '@/api/types';
import { ProductCard } from '@/components/ProductCard';
import { Chip } from '@/components/ui/Controls';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { AppText, Row } from '@/components/ui/primitives';
import { colors, spacing } from '@/theme/tokens';

const PAGE_SIZE = 20;

const SORTS: { value: NonNullable<CatalogQuery['sort']>; label: string }[] = [
  { value: 'relevance', label: 'Relevância' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'rating', label: 'Melhor nota' },
];

/** Catálogo com busca, categoria e ordenação. A paginação da API é por página, não cursor. */
export default function Catalogo() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<NonNullable<CatalogQuery['sort']>>('relevance');
  /**
   * A categoria vem do atalho da tela de início, até a pessoa escolher outra aqui. Guardar a
   * escolha num objeto (e não numa string) permite distinguir "ainda não escolhi" de "escolhi
   * Todas" sem sincronizar estado com o parâmetro num efeito.
   */
  const [picked, setPicked] = useState<{ value: string | undefined } | null>(null);
  const category = picked ? picked.value : params.category;
  const setCategory = (value: string | undefined) => setPicked({ value });

  // Evita uma requisição por tecla digitada.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 350);
    return () => clearTimeout(t);
  }, [term]);

  const filters = useQuery({ queryKey: qk.catalogFilters, queryFn: () => api.catalog.filters(), staleTime: 30 * 60_000 });

  const query = useMemo<CatalogQuery>(
    () => ({ q: debounced || undefined, category, sort, page: 1, pageSize: PAGE_SIZE }),
    [debounced, category, sort],
  );
  const result = useQuery({ queryKey: qk.catalog(query), queryFn: ({ signal }) => api.catalog.search(query, signal), staleTime: 60_000 });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flex: 1 }}>
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <TextField
            label="Buscar"
            placeholder="Produto, loja, benefício…"
            value={term}
            onChangeText={setTerm}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            <Chip label="Todas" active={!category} onPress={() => setCategory(undefined)} />
            {(filters.data?.categories ?? []).map((c) => (
              <Chip key={c} label={c} active={category === c} onPress={() => setCategory(category === c ? undefined : c)} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {SORTS.map((s) => (
              <Chip key={s.value} label={s.label} active={sort === s.value} onPress={() => setSort(s.value)} />
            ))}
          </ScrollView>
        </View>

        {result.isPending ? (
          <LoadingState label="Buscando…" />
        ) : result.error ? (
          <ErrorState error={result.error} onRetry={() => result.refetch()} />
        ) : (
          <FlatList
            data={result.data?.items ?? []}
            keyExtractor={(p) => p.id}
            numColumns={2}
            columnWrapperStyle={{ gap: spacing.md }}
            contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md, paddingBottom: spacing.xxl }}
            renderItem={({ item }) => <ProductCard product={item} wide />}
            ListHeaderComponent={
              result.data ? (
                <Row style={{ paddingBottom: spacing.sm }}>
                  <AppText variant="small">
                    {result.data.total} {result.data.total === 1 ? 'resultado' : 'resultados'}
                  </AppText>
                </Row>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                icon="search-outline"
                title="Nada encontrado"
                message={debounced ? `Não achamos nada para "${debounced}". Tente outra palavra ou tire os filtros.` : 'Tente outra categoria.'}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
