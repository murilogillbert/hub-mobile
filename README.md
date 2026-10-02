# OpenDriverHub — app (iOS e Android)

App da **área do cliente** do [OpenDriverHub](../hub): catálogo dos parceiros, compra por Pix ou
cartão, cashback e o voucher com QR para resgatar no balcão. Mais a tela de **validar voucher**,
usada pela loja parceira.

Mesma pilha do [app de corridas](../opendriver/mobile) — Expo SDK 57 + Expo Router + TanStack
Query — e a mesma conta: o login é o `public.users` compartilhado, então quem já usa o OpenDriver
entra aqui com as mesmas credenciais e vê o mesmo saldo de cashback.

| Cliente | Loja parceira |
| --- | --- |
| **Início** — saldo de cashback, categorias, destaques | **Validar voucher** — lê o QR do cliente, mostra o repasse e confirma o resgate |
| **Catálogo** — busca, filtros e ordenação | |
| **Carrinho** e **checkout** — cashback já aplicado, Pix com QR/copia-e-cola ou cartão | |
| **Meus itens** — voucher com QR e código, avaliação pós-compra | |
| **Conta** — dados, senha, preferências de aviso, extrato de cashback | |

Catálogo e produto funcionam **sem conta**; o login só é exigido para comprar.

## Estrutura

```
src/app/            rotas (Expo Router): (tabs)/ e telas de pilha
src/screens/        telas de rota dinâmica (produto, pedido) — ver nota abaixo
src/api/            cliente HTTP (refresh single-flight), endpoints e tipos da API do hub
src/context/        sessão (AuthContext), carrinho (CartContext), React Query
src/components/     UI base, ProductCard, PaymentPanel, RatingInput, QR
src/lib/            formatação, máscaras, validação, recuperação de erro
```

As telas de rota dinâmica (`produto/[id]`, `pedido/[id]`) são arquivos-ponte de duas linhas que
reexportam de `src/screens/` — o nome com colchetes atrapalha algumas ferramentas de edição.

## Rodar

```bash
npm install
# API local (ver ../hub/backend) — no celular use o IP da máquina, não localhost
EXPO_PUBLIC_API_URL=http://192.168.0.10:5000 npx expo run:android   # ou run:ios
```

O leitor de QR usa módulo nativo (`expo-camera`), então precisa de **development build** — a tela
de validar voucher não roda no Expo Go.

| Variável | Uso |
| --- | --- |
| `APP_VARIANT` | `development` \| `preview` \| `production` (muda nome e bundle id) |
| `EXPO_PUBLIC_API_URL` | API do hub (https fora de dev) |
| `EXPO_PUBLIC_WEB_URL` | site do hub (painel do parceiro abre no navegador) |
| `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_TERMS_URL` | opcional; padrão `WEB_URL/privacidade` e `/termos` |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | contato de suporte |
| `EAS_PROJECT_ID`, `EAS_OWNER` | projeto EAS |
| `IOS_BUNDLE_ID`, `ANDROID_PACKAGE` | padrão `br.com.opendriverhub.app` |

Builds `preview`/`production` falham de propósito se a API ou o site não forem https.

## Qualidade

```bash
npm run typecheck
npm run lint
npm test
npm run export:check     # gera os bundles iOS/Android (todas as rotas compilam)
```

## Backend: o que foi adicionado para o app

Duas exigências de loja não existiam no hub e foram implementadas no `hub/backend` (apenas backend
— **nenhum arquivo do frontend web foi tocado**, a interface web desses recursos fica para depois):

| Recurso | Onde |
| --- | --- |
| **Excluir conta** (App Store 5.1.1(v)) | `POST /me/delete` → `authService.deleteAccount`. Anonimiza a linha de `users` em vez de apagar: pedidos, extrato de cashback e comissões das lojas continuam íntegros. Recusa conta de loja/equipe e conta com pedido em aberto. |
| **Push** | Tabela `push_tokens` (migration `20261002210000_push_tokens`), `infra/push.ts` (Expo Push), `POST`/`DELETE /me/push-tokens`. Disparado em pagamento confirmado (`paymentService.approve`) e resgate (`partnerService.redeem`), sempre depois do commit e fire-and-forget. |

A migration é aditiva e foi validada num Postgres 16 descartável: todas aplicam limpas e
`prisma migrate diff` não acusa divergência. **Não foi aplicada em produção** — o banco do hub é
produção e exige o protocolo de backup.

Limitação registrada: o access token em curso continua válido até expirar depois da exclusão (não
há revogação por usuário neste backend); o refresh é invalidado, então a sessão morre no próximo
ciclo.

## Pendência conhecida

**Deep link de volta pro app** — verificação de e-mail e redefinição de senha montam URL a partir
de `FRONTEND_URL` e abrem no navegador. Funciona, mas não devolve a pessoa ao app. Resolver junto
com a normalização do hub.

## Sincronia com os outros dois projetos

Não há pacote de tipos compartilhado — é a prática que o `hub/CLAUDE.md` já descreve. Mudança de
contrato mexe nos três lugares:

| Aqui | Equivalente |
| --- | --- |
| `src/api/types.ts` | `hub/src/shared/types/index.ts` + os formatos em `hub/src/shared/api/endpoints.ts` |
| `src/api/endpoints.ts` | `hub/backend/src/routes/*.routes.ts` |
| `src/api/http.ts`, `secureTokenStorage.ts`, `components/ui/*`, `lib/*`, `theme/tokens.ts` | cópias de `opendriver/mobile` — mantenha iguais ou divirja de propósito |
