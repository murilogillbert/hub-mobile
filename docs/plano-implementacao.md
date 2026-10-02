# OpenDriverHub — app mobile (iOS e Android)

> Plano de implementação do `hub-mobile`, escrito depois de analisar
> `C:\...\Projetos\hub` (frontend Vite + React, backend Node/Express/Prisma) e o app já pronto em
> `C:\...\Projetos\opendriver\mobile` (Expo SDK 57 + Expo Router), que vai servir de base.
>
> **Este documento é para validação. Nenhum código foi escrito ainda.** As decisões da §2 mudam o
> tamanho e a forma da entrega — preciso delas antes de começar.

---

## 1. O que existe hoje (levantamento)

O hub é **só web**. Um projeto Vite + React 18 + React Router + TanStack Query na raiz, e a API em
`backend/` (Express + Prisma + Postgres). Não há nada mobile: nem React Native, nem Capacitor, nem
PWA com manifest de instalação.

**Quatro áreas por papel** (`src/routes/AppRoutes.tsx`), com `UserRole` =
`client | passenger | driver | partner | admin | financeiro | guest`:

| Área | Telas | Natureza |
|---|---|---|
| Cliente (comprador) | Home, Catálogo, Produto, Carrinho, Checkout, Confirmação, Meus itens, Detalhe do pedido, Histórico, Cashback, Perfil | marketplace — **mobile faz sentido** |
| Parceiro (loja) | Catálogo, Unidades, **Venda (resgate por QR)**, Afiliados-motoristas, Métricas, Perfil, + 4 telas do afiliado solar | só o resgate é mobile-first |
| Admin | 16 telas, incluindo 6 do painel OpenDriver | dashboard — **web** |
| Financeiro | Saques, Afiliados, Perfil | back-office — **web** |

**A API já está pronta para o app.** Mapeei a superfície em `src/shared/api/endpoints.ts` (890
linhas) e nas rotas do backend. Tudo que o cliente precisa já existe e é REST com envelope
`{ data }`:

```
POST /auth/login · /auth/register · /auth/refresh · GET /auth/me
GET  /products · /products/:id · /products/:id/reviews · /catalog · /catalog/filters
GET  /categories · /stores · /stores/nearby · /partners · /partners/:id
POST /orders · GET /me/orders · /me/orders/:id · GET /me/cashback/entries
POST /payments/process · GET /orders/:id/payment-status
GET  /me/notifications · POST /me/notifications/read · PUT /me/profile · /me/password · /me/notifications
POST /reviews · GET /me/reviews/eligibility
POST /partner/redeem        (resgate do voucher no balcão)
```

**Autenticação** é JWT próprio com refresh (`/auth/refresh`), o mesmo `public.users` que o
OpenDriver usa — é por isso que o app de corridas abre o hub já logado. O cliente web guarda o
token e faz uma retentativa no 401 (`src/shared/api/client.ts`); o app de corridas já tem a mesma
lógica com *single-flight* e `expo-secure-store`.

**Pagamento** é `POST /payments/process` com `method: 'pix' | 'credit_card' | 'debit_card'` e os
dados do cartão em claro para a API, que tokeniza no gateway (Asaas/Mercado Pago/mock, escolhidos
por `PAYMENT_PROVIDER` no boot). Mesmo desenho do OpenDriver, então a tela de cartão do app de
corridas serve de molde direto.

### Três lacunas que o app vai expor

1. **Não existe push.** O modelo `Notification` do Prisma é notificação *dentro* do app (sino no
   header). Não há `push_tokens`, nem envio por Expo — confirmei com busca em todo
   `hub/backend/`. Sem isso, o app não avisa "pagamento aprovado" nem "cashback creditado", que é
   metade do valor de ter app.
2. **Links de e-mail apontam para a web.** Verificação de e-mail, redefinição de senha e o
   redirect de indicação (`/r/:code`) montam URL a partir de `FRONTEND_URL`. Funciona (abre o
   navegador), mas não devolve a pessoa para o app.
3. **Componentes web sem equivalente nativo:** `StoreMap` (react-leaflet), `QrScanner`
   (html5-qrcode), `exportReport`/`jspdf`. Os dois primeiros já estão resolvidos no app de
   corridas (MapLibre e `expo-camera`); o terceiro é do afiliado solar, fora de escopo.

---

## 2. Decisões — confirmadas em 2026-10-02

| Questão | Decisão |
|---|---|
| App separado ou aba nativa no OpenDriver | **Apps distintos.** A aba "Hub" do app de corridas passa a redirecionar para este app, ou para a loja se não estiver instalado (trabalho no `opendriver/mobile`, ainda não feito). |
| Escopo da v1 | Área do cliente completa + validar voucher do parceiro. Admin, financeiro e afiliado solar seguem só na web. |
| Push no `hub/backend` | **Não agora.** O `hub` não é tocado nesta fase; normalizamos depois. |
| Produto `digital` | É benefício resgatado por QR/código **fora do app** — mesma isenção dos vouchers, **sem In-App Purchase**. Confirmado no schema: o resgate usa `Order.code`, o mesmo de todos os tipos. |
| Navegar sem login | Sim: catálogo e produto abertos, login exigido só no checkout. |
| Mapa de lojas | Fora da v1. `GET /stores/nearby` já devolve distância, então a lista resolve sem MapLibre. |

> Como o `hub` não foi alterado, duas exigências de loja seguem pendentes — ver "Bloqueios conhecidos
> antes de publicar" no [README](../README.md).

### Registro das perguntas originais (histórico)

### 2.1 App separado ou aba nativa dentro do OpenDriver? **(a mais importante)**

O app do OpenDriver **já tem uma aba "Hub"** que abre o site do hub logado. Se o `hub-mobile`
nascer como app separado, você passa a ter dois apps nas lojas, dois processos de revisão, dois
pipelines EAS — e um motorista que usa os dois instala duas vezes.

As alternativas honestas:

| | Prós | Contras |
|---|---|---|
| **(A) App separado** (o que você pediu) | marca própria; público que não é motorista; evolui sem mexer no app de corridas | 2 listagens, 2 revisões, código duplicado (cliente HTTP, tokens de design, auth) |
| **(B) Substituir a aba "Hub" por telas nativas** no app atual | 1 app, 1 revisão, zero duplicação, login já resolvido | o hub fica preso ao público do app de corridas; o app cresce bastante |
| **(C) Os dois**: telas nativas no OpenDriver + app separado compartilhando um pacote comum | melhor dos dois | monorepo ou pacote publicado — a maior obra das três |

**Minha recomendação: (A), como você pediu, mas com cópia controlada.** Nasce de um `cp` do
`opendriver/mobile` e eu documento numa tabela quais arquivos são "gêmeos" (cliente HTTP, tokens,
componentes de UI base) para manter em sincronia manual. É exatamente a prática que o hub já adota
entre os DTOs do backend e os tipos do frontend, e que o `CLAUDE.md` descreve: duplicação
assumida, documentada, sem pacote compartilhado. Se um dia doer, aí vale o monorepo.

**Confirma (A)?**

### 2.2 Quais áreas entram na v1?

**Minha proposta:**

- **v1 — área do cliente completa + resgate do parceiro.** O comprador é o caso mobile de
  verdade: catálogo no celular, compra por Pix, voucher com QR no bolso. E o resgate é a única
  tela de parceiro genuinamente mobile-first: hoje o balcão escaneia o QR do cliente usando o site
  no celular.
- **v2 — resto do parceiro** (catálogo, unidades, métricas, afiliados-motoristas).
- **Fora de escopo** — Admin, Financeiro, afiliado solar (carteira/saque/materiais/link), assistente
  de leads e a pesquisa de opinião. São back-office e captação por WhatsApp; viram tela de celular
  ruim e não é disso que a demanda trata.

**Concorda com esse corte?** Se o que você precisa é outra coisa (ex.: só o parceiro, para o
balcão), o plano muda bastante.

### 2.3 Push: posso mexer no backend do hub?

Sem push o app perde muito. São ~4 arquivos novos e uma migration **aditiva** (tabela
`push_tokens`, espelhando a do OpenDriver), mais o disparo nos eventos que já existem: pagamento
confirmado, cashback creditado, pedido resgatado.

Lembrando que o banco do hub é **produção** e o `CLAUDE.md` manda preferir migration aditiva
escrita à mão — é o que eu faria, com o mesmo protocolo de backup que usamos no OpenDriver.

**Autoriza essa alteração no `hub/backend`?** Se não, a v1 sai sem notificação e o app só avisa
quando está aberto.

### 2.4 Produtos "digital" — risco de reprovação na App Store

A Apple exige compra via In-App Purchase (e fica com 30%) para **conteúdo digital consumido no
app**. Bens físicos e vouchers de produto/serviço do mundo real são isentos, e é isso que vi no
seed: vouchers de cafeteria, cinema, hamburgueria e itens físicos. Mas o enum `ProductKind` tem
`digital`, e `Product.digital` é usado no catálogo.

**Preciso saber o que são os produtos `digital` em produção.** Se for e-book, curso ou assinatura
que a pessoa consome dentro do app, ou a loja reprova, ou esses itens têm de sair do app iOS.
Consigo te dar a lista real com uma consulta ao banco, se você quiser.

### 2.5 Dois detalhes menores

- **Catálogo e lojas sem login:** o site deixa navegar o catálogo deslogado e só exige conta no
  checkout. Mantenho isso no app (bom para conversão) ou exijo login na abertura?
- **Mapa de lojas:** o app de corridas usa MapLibre com um estilo de tiles próprio
  (`EXPO_PUBLIC_MAP_STYLE_URL`). Reaproveito o mesmo estilo, ou o mapa de lojas pode ser uma lista
  com distância (sem mapa) na v1?

---

## 3. Arquitetura proposta

Mesma pilha do app de corridas, que já passou por typecheck/lint/testes/bundle e está pronta para
as lojas — não há motivo para inventar diferente:

- **Expo SDK 57 + Expo Router** (rotas tipadas), **TanStack Query** para toda leitura e mutação,
  **expo-secure-store** para os tokens, **CNG** (sem `ios/` e `android/` no git).
- Sem framework de CSS: tokens em `theme/tokens.ts` e componentes próprios, como no OpenDriver.
- Cliente HTTP único com refresh *single-flight* e handler de 401 → logout.

```
hub-mobile/
  app.config.ts            variantes dev/preview/production, falha se a API não for https
  eas.json                 perfis de build e submit
  docs/plano-implementacao.md
  src/
    app/                   rotas (Expo Router)
      (tabs)/              Início · Catálogo · Meus itens · Cashback · Conta
      produto/[id].tsx
      carrinho.tsx  checkout.tsx  pedido/[id].tsx
      conta/{perfil,senha,notificacoes,excluir}.tsx
      login.tsx  cadastro.tsx  esqueci-senha.tsx
      parceiro/venda.tsx   resgate por QR (se a §2.2 for aprovada)
    api/                   client.ts (refresh single-flight), endpoints.ts, types.ts, queryKeys.ts
    context/               AuthContext, CartContext, QueryProvider
    components/            UI base + ProductCard, QrCode, QrScanner, StoreList
    features/              catálogo, checkout, cashback, resgate
    lib/                   format, masks, validation, recovery
    theme/tokens.ts
```

**Carrinho:** o web usa `CartContext` em memória/localStorage. No app ele precisa sobreviver ao
fechamento — mesmo contexto, persistido em `AsyncStorage`.

**Tipos:** copio `src/shared/types/index.ts` do hub e os formatos de request/response de
`endpoints.ts`. Como o `CLAUDE.md` já avisa, não há pacote de tipos compartilhado: quando o
contrato muda, muda nos dois lados. O `hub-mobile` entra nessa lista.

---

## 4. Mapa de telas → API

| Tela do app | Equivalente web | Endpoints |
|---|---|---|
| Início | `HomePage` | `/catalog`, `/categories`, `/stores/nearby` |
| Catálogo + busca e filtros | `CatalogPage` | `/catalog`, `/catalog/filters` |
| Produto | `ProductPage` | `/products/:id`, `/products/:id/reviews`, `/me/reviews/eligibility` |
| Carrinho | `CartPage` | local |
| Checkout (Pix e cartão) | `CheckoutPage` | `POST /orders`, `POST /payments/process`, `GET /orders/:id/payment-status` |
| Confirmação | `PurchaseConfirmationPage` | `/me/orders/:id` |
| Meus itens (voucher + QR) | `MyItemsPage`, `OrderDetailPage` | `/me/orders`, `/me/orders/:id` |
| Histórico | `HistoryPage` | `/me/orders?status=` |
| Cashback | `CashbackPage` | `/me/cashback/entries`, saldo em `/auth/me` |
| Avaliar compra | `Reviews` | `POST /reviews` |
| Conta e notificações | `ProfilePage`, `AccountSettingsCards` | `/me/profile`, `/me/password`, `/me/notifications` |
| Login, cadastro, senha | 6 telas de auth | `/auth/*` |
| Resgate no balcão (parceiro) | `PartnerRedeemPage` | `POST /partner/redeem` |

Duas coisas que o app ganha de graça e a web não tem: QR do voucher em tela cheia com brilho
forçado no balcão, e leitor de QR nativo (`expo-camera`) em vez de `html5-qrcode`.

---

## 5. Trabalho no `hub/backend` (se a §2.3 for aprovada)

Tudo aditivo, nada removido nem renomeado:

1. Migration `<timestamp>_push_tokens` — tabela nova, espelhando
   `opendriver.push_tokens` (`user_id`, `token` único, `platform`, `last_seen`).
2. `infra/push.ts` — envio pela Expo Push API, copiado do OpenDriver.
3. `me.routes.ts` — `POST`/`DELETE /me/push-tokens`.
4. Disparos nos pontos que já existem: pagamento confirmado
   (`jobs/paymentReconciliation.ts` e o webhook), cashback creditado e resgate
   (`partnerService.redeem`).
5. **Excluir conta** — a App Store exige (5.1.1(v)) e o hub não tem. O OpenDriver resolveu
   anonimizando `public.users`; como a tabela é a mesma, dá para reaproveitar quase inteiro.

Sem CORS a mudar: app nativo não manda `Origin`. A API já é pública (`hubapi.opendriver.com.br`) —
só preciso que você confirme o domínio.

---

## 6. Riscos

| Risco | Gravidade | Resposta |
|---|---|---|
| Produtos `digital` caírem na regra de IAP da Apple | **alta** — reprova a submissão | §2.4: inventariar antes de submeter |
| Falta de "excluir conta" | alta — reprova | entra na v1 (§5.5) |
| Dois apps com código duplicado divergindo | média | tabela de arquivos gêmeos, revisada a cada mudança de contrato |
| Dados do cartão passando pelo app | média | mesma arquitetura já aprovada no OpenDriver; nunca persistir no dispositivo |
| Migration em banco de produção | média | protocolo de backup + `pg_dump --schema-only` antes e depois, igual ao OpenDriver |

---

## 7. Fases de execução

Cada fase termina com `typecheck`, `lint`, testes e `expo export` passando — o mesmo portão do
`opendriver/mobile`.

### Fase 0 — Fundação
1. [ ] Criar `hub-mobile` a partir do `opendriver/mobile`: `app.config.ts`, `eas.json`, tsconfig,
       eslint, jest, tokens de tema, `Screen`/`Button`/`TextField`/`Card`/`States`.
2. [ ] `api/client.ts` apontando para a API do hub, com o envelope `{ data }` e refresh
       single-flight.
3. [ ] `api/types.ts` + `api/endpoints.ts` traduzidos de `src/shared/types` e
       `src/shared/api/endpoints.ts`.
4. [ ] `AuthContext` com `expo-secure-store`, `/auth/me` e guardas por papel.
5. [ ] Documentar a tabela de arquivos gêmeos com o `opendriver/mobile`.

### Fase 1 — Entrar e navegar
6. [ ] Login, cadastro (cliente), esqueci/redefinir senha, banner de e-mail não verificado.
7. [ ] Abas e Início: destaques, categorias, lojas por perto.
8. [ ] Catálogo com busca, filtros e paginação; Produto com avaliações.

### Fase 2 — Comprar
9. [ ] Carrinho persistido em `AsyncStorage`.
10. [ ] Checkout: cashback já aplicado, Pix (QR + copia e cola, polling de status) e cartão.
11. [ ] Confirmação e detalhe do pedido.

### Fase 3 — Usar o que comprou
12. [ ] Meus itens: voucher com QR em tela cheia e brilho forçado; estados pago/resgatado.
13. [ ] Histórico, extrato de cashback e avaliação pós-compra.

### Fase 4 — Conta e exigências de loja
14. [ ] Perfil, senha, preferências de notificação.
15. [ ] Excluir conta (backend + tela).
16. [ ] Push: tabela, envio no backend, registro do token e deep link para o pedido.

### Fase 5 — Parceiro no balcão (se aprovado na §2.2)
17. [ ] Leitor de QR com `expo-camera` e confirmação de resgate em dois passos.

### Fase 6 — Lojas
18. [ ] Ícones, splash, textos de permissão, política e termos.
19. [ ] Builds `preview` e `production` no EAS; checklist de publicação.

---

## 8. O que eu não vou fazer sem você pedir

- Mexer em qualquer tela do frontend web do hub.
- Tocar nas áreas Admin, Financeiro ou do afiliado solar.
- Rodar migration contra o banco de produção.
- Criar um monorepo ou mover o `opendriver/mobile`.
