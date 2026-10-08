import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { api } from '@/api/client';
import { qk } from '@/api/queryKeys';
import type { Product, ProductStoreStockItem } from '@/api/types';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { AppText, Badge, Card, Divider, Row, Stack } from '@/components/ui/primitives';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { formatCurrency } from '@/lib/format';
import { moneyToInput, parseMoney } from '@/lib/masks';
import { alertError } from '@/lib/recovery';
import { colors, spacing } from '@/theme/tokens';

/**
 * Ajuste rápido de um produto, atrás do balcão.
 *
 * ============================================================================
 * Os dois estoques, e por que a tela insiste na diferença
 * ============================================================================
 *
 * "Estoque da rede" é o número que **autoriza a compra**: o checkout o valida e o resgate o
 * decrementa. "Disponibilidade por unidade" responde outra pergunta — onde o cliente pode
 * retirar — e antes não tinha como ser representada.
 *
 * Os dois aparecem com rótulo explícito e um texto curto explicando a diferença, porque
 * "estoque" em dois lugares é exatamente o que o lojista interpreta errado: ou ele zera a
 * unidade achando que tirou o produto de venda, ou zera o total achando que fechou uma loja.
 *
 * ============================================================================
 * Por que não dá para editar tudo aqui
 * ============================================================================
 *
 * Foto, descrição longa e categoria continuam na web. Formulário completo no celular, com
 * upload de imagem e seletor de categoria, é mais tela do que valor — e o que o lojista faz
 * todo dia é mexer em preço e estoque.
 */
export default function EditarProduto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = String(id ?? '');
  const toast = useToast();
  const qc = useQueryClient();

  const produtos = useQuery({
    queryKey: qk.partnerProducts,
    queryFn: () => api.partner.products(),
  });
  const produto = (produtos.data ?? []).find((p) => p.id === productId);

  const unidades = useQuery({
    queryKey: qk.partnerProductStores(productId),
    queryFn: () => api.partner.productStores(productId),
    // Produto digital não se retira em loja: a consulta não teria para que servir.
    enabled: Boolean(produto) && produto?.digital === false,
  });

  const [preco, setPreco] = useState('');
  const [estoque, setEstoque] = useState('');
  const [rascunho, setRascunho] = useState<Record<string, { quantity: number; active: boolean }>>({});

  /**
   * Semeia os campos quando o produto chega, e **não** a cada renderização.
   *
   * Semear no corpo do componente sobrescreveria o que o lojista digitou a cada atualização do
   * cache: ele mexeria no preço e o valor voltaria sozinho.
   */
  useEffect(() => {
    if (!produto) return;
    setPreco(moneyToInput(produto.price));
    setEstoque(String(produto.stock));
  }, [produto?.id, produto?.price, produto?.stock]);

  useEffect(() => {
    if (!unidades.data) return;
    const inicial: Record<string, { quantity: number; active: boolean }> = {};
    for (const i of unidades.data.items) {
      inicial[i.storeId] = { quantity: i.quantity, active: i.active };
    }
    setRascunho(inicial);
  }, [unidades.data]);

  const salvarProduto = useMutation({
    mutationFn: async () => {
      if (!produto) throw new Error('Produto não carregado.');
      const precoNovo = parseMoney(preco);
      const estoqueNovo = Math.max(0, Math.trunc(Number(estoque) || 0));
      if (!Number.isFinite(precoNovo) || precoNovo < 0) {
        throw new Error('Informe um preço válido.');
      }
      /**
       * O corpo vai **completo**, com os campos que esta tela não edita vindos do produto
       * carregado. `productUpsertSchema` do servidor é um upsert inteiro: mandar só preço e
       * estoque apagaria descrição, foto e categoria.
       */
      return api.partner.updateProduct(produto.id, {
        title: produto.title,
        description: produto.description,
        price: precoNovo,
        cashbackPercent: produto.cashbackPercent,
        kind: produto.kind,
        imageUrl: produto.imageUrl,
        category: produto.category,
        stock: estoqueNovo,
      });
    },
    onSuccess: () => {
      toast.success('Produto salvo.');
      void qc.invalidateQueries({ queryKey: qk.partnerProducts });
      // O catálogo público muda: sem isto o lojista confere no app do cliente e vê o preço antigo.
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      void qc.invalidateQueries({ queryKey: ['product', productId] });
    },
    onError: (e) => alertError(e, 'Não foi possível salvar'),
  });

  const salvarUnidades = useMutation({
    mutationFn: () =>
      api.partner.setProductStores(
        productId,
        Object.entries(rascunho).map(([storeId, v]) => ({
          storeId,
          quantity: v.quantity,
          active: v.active,
        })),
      ),
    onSuccess: () => {
      toast.success('Disponibilidade salva.');
      void qc.invalidateQueries({ queryKey: qk.partnerProductStores(productId) });
      void qc.invalidateQueries({ queryKey: qk.partnerProducts });
      void qc.invalidateQueries({ queryKey: ['catalog'] });
    },
    onError: (e) => alertError(e, 'Não foi possível salvar a disponibilidade'),
  });

  if (produtos.isPending) return <LoadingState label="Abrindo produto…" />;
  if (produtos.error && !produtos.data) {
    return <ErrorState error={produtos.error} onRetry={() => produtos.refetch()} />;
  }
  if (!produto) {
    return (
      <Screen>
        <Card>
          <AppText variant="subtitle">Produto não encontrado</AppText>
          <AppText variant="small">
            Ele pode ter sido removido. Volte e recarregue a lista.
          </AppText>
        </Card>
      </Screen>
    );
  }

  const set = (storeId: string, campo: 'quantity' | 'active', valor: number | boolean) =>
    setRascunho((atual) => ({
      ...atual,
      [storeId]: {
        quantity: campo === 'quantity' ? (valor as number) : (atual[storeId]?.quantity ?? 0),
        active: campo === 'active' ? (valor as boolean) : (atual[storeId]?.active ?? true),
      },
    }));

  return (
    <Screen>
      <Stack gap={spacing.lg}>
        <Card>
          <Stack gap={spacing.sm}>
            <AppText variant="label">{produto.title}</AppText>
            <AppText variant="small">{produto.category || 'Sem categoria'}</AppText>

            <TextField
              label="Preço (R$)"
              value={preco}
              onChangeText={setPreco}
              keyboardType="decimal-pad"
              hint={`Hoje: ${formatCurrency(produto.price)}`}
            />

            <TextField
              label="Estoque da rede"
              value={estoque}
              onChangeText={(v) => setEstoque(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              hint="É este número que autoriza a compra no catálogo."
            />

            <Button
              title="Salvar produto"
              icon="save-outline"
              loading={salvarProduto.isPending}
              onPress={() => salvarProduto.mutate()}
            />

            <AppText variant="small">
              Foto, descrição e categoria continuam no painel web — aqui fica o que muda todo dia.
            </AppText>
          </Stack>
        </Card>

        {!produto.digital && (
          <Card>
            <Stack gap={spacing.sm}>
              <AppText variant="label">Onde dá para retirar</AppText>
              <AppText variant="small">
                Isto não é o estoque que autoriza a compra — é em quais unidades o cliente
                encontra o produto.
              </AppText>

              {unidades.isPending ? (
                <LoadingState label="Carregando unidades…" />
              ) : unidades.error && !unidades.data ? (
                <ErrorState error={unidades.error} onRetry={() => unidades.refetch()} />
              ) : (unidades.data?.items ?? []).length === 0 ? (
                <AppText variant="small">
                  Nenhuma unidade cadastrada. Cadastre em Unidades, no painel web.
                </AppText>
              ) : (
                <>
                  {!unidades.data?.declared && (
                    <Badge
                      label="Sem disponibilidade definida: aparece em todas as unidades"
                      tone="info"
                    />
                  )}

                  {(unidades.data?.items ?? []).map((u: ProductStoreStockItem, idx) => (
                    <View key={u.storeId}>
                      {idx > 0 && <Divider />}
                      <Stack gap={spacing.xs}>
                        <Row style={styles.linha}>
                          <AppText variant="bodyStrong">{u.storeName}</AppText>
                          <Switch
                            value={rascunho[u.storeId]?.active ?? true}
                            onValueChange={(v) => set(u.storeId, 'active', v)}
                            accessibilityLabel={`Vende em ${u.storeName}`}
                          />
                        </Row>
                        <AppText variant="small">
                          {u.city}/{u.state}
                        </AppText>
                        <TextField
                          label="Quantidade nesta unidade"
                          value={String(rascunho[u.storeId]?.quantity ?? 0)}
                          onChangeText={(v) =>
                            set(u.storeId, 'quantity', Math.max(0, Math.trunc(Number(v.replace(/\D/g, '')) || 0)))
                          }
                          keyboardType="number-pad"
                        />
                      </Stack>
                    </View>
                  ))}

                  <Button
                    title="Salvar disponibilidade"
                    variant="secondary"
                    icon="storefront-outline"
                    loading={salvarUnidades.isPending}
                    onPress={() => salvarUnidades.mutate()}
                  />
                </>
              )}
            </Stack>
          </Card>
        )}
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  linha: { alignItems: 'center', justifyContent: 'space-between' },
});
