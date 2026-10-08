import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { api } from '@/api/client';
import { qk } from '@/api/queryKeys';
import type { Product } from '@/api/types';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, QueryView } from '@/components/ui/States';
import { AppText, Badge, Card, Icon, Row, Stack } from '@/components/ui/primitives';
import { formatCurrency, formatPercent } from '@/lib/format';
import { colors, spacing } from '@/theme/tokens';

/**
 * Produtos da loja, no app.
 *
 * ============================================================================
 * Por que gestão de produto vem para o app, e o resto fica na web
 * ============================================================================
 *
 * Decisão do plano v2 (Frente D). Mexer em preço e estoque é tarefa de **todo dia**, com o
 * celular na mão atrás do balcão — e o público deste produto é o comerciante pequeno, que
 * provavelmente não tem computador na loja. Cadastrar unidade, editar horário e ler métrica é
 * tarefa de vez em quando, e para essas o painel web serve.
 *
 * Então esta tela é lista + edição rápida. Cadastro completo (foto, descrição longa, categoria)
 * continua na web, e o atalho para lá está na tela de conta.
 */
export default function ProdutosDaLoja() {
  const q = useQuery({
    queryKey: qk.partnerProducts,
    queryFn: () => api.partner.products(),
  });

  return (
    <Screen>
      <QueryView
        query={q}
        isEmpty={(lista) => lista.length === 0}
        empty={
          <EmptyState
            icon="pricetags-outline"
            title="Nenhum produto cadastrado"
            message="Cadastre o primeiro produto no painel web; aqui você ajusta preço e estoque no dia a dia."
          />
        }
      >
        {(produtos) => (
        <Stack gap={spacing.sm}>
          <AppText variant="small">
            Toque num produto para ajustar preço, estoque e disponibilidade por unidade.
          </AppText>

          {produtos.map((p: Product) => (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/parceiro/produto/${p.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${p.title}`}
            >
              <Card style={styles.item}>
                <Stack gap={spacing.xs}>
                  <Row style={styles.titulo}>
                    <AppText variant="bodyStrong">{p.title}</AppText>
                    <Icon name="chevron-forward" size={18} color={colors.textMuted} />
                  </Row>

                  <Row gap={spacing.sm}>
                    <AppText variant="small">{formatCurrency(p.price)}</AppText>
                    <AppText variant="small">·</AppText>
                    <AppText variant="small">{formatPercent(p.cashbackPercent)} cashback</AppText>
                  </Row>

                  <Row gap={spacing.xs}>
                    {/*
                      "Estoque da rede", e não só "estoque": com disponibilidade por unidade no
                      ar, o lojista precisa ver de qual dos dois números se trata — senão ele
                      zera o total achando que está fechando uma loja.
                    */}
                    <Badge
                      label={`Rede: ${p.stock}`}
                      tone={p.stock > 0 ? 'neutral' : 'danger'}
                    />
                    {!p.digital && (
                      <Badge
                        label={
                          p.storeStockDeclared
                            ? `${(p.availableStores ?? []).length} unidade(s)`
                            : 'todas as unidades'
                        }
                        tone={
                          p.storeStockDeclared && (p.availableStores ?? []).length === 0
                            ? 'warning'
                            : 'info'
                        }
                      />
                    )}
                  </Row>
                </Stack>
              </Card>
            </Pressable>
          ))}

          <View style={{ height: spacing.lg }} />
        </Stack>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { gap: spacing.xs },
  titulo: { alignItems: 'center', justifyContent: 'space-between' },
});
