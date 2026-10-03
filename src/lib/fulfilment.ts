import type { ProductKind } from '@/api/types';

/**
 * Como o benefício chega até quem compra — e, por consequência, por que este aplicativo não
 * usa In-App Purchase.
 *
 * ## A regra, e por que ela se sustenta
 *
 * A Apple exige IAP para conteúdo ou funcionalidade **consumidos dentro do aplicativo**. Aqui
 * nenhum dos três tipos é: todo pedido pago gera um **código de resgate** (`Order.code`), e o
 * resgate acontece no parceiro, fora do aplicativo. `digital` não é "conteúdo digital que abre
 * no app" — é um código de resgate sem suporte físico, resgatado do mesmo jeito que o voucher.
 *
 * O aplicativo **não tem nenhum caminho de entrega de conteúdo**: não existe download,
 * liberação de acesso, reprodução nem WebView de conteúdo pago. A única tela de um pedido pago
 * é a que mostra o QR e o código.
 *
 * ## Por que isto é um módulo, e não um detalhe da tela
 *
 * Esta política é o que separa "sem IAP" de "recusado na revisão", e ela pode ser quebrada sem
 * ninguém perceber: basta alguém cadastrar um produto cujo benefício abra no aplicativo, ou
 * reescrever a cópia abaixo prometendo acesso imediato. O módulo existe para que a regra tenha
 * nome, lugar e teste — `tests/unit/fulfilment.test.tsx` afirma o invariante.
 *
 * **Se algum dia o produto passar a entregar benefício dentro do aplicativo, a isenção cai e o
 * IAP passa a ser obrigatório para aquele item.** Nesse caso há três saídas: tirar o item do
 * catálogo do aplicativo e mantê-lo só na web, implementar IAP para ele, ou transformá-lo em
 * resgate externo de fato.
 */
export interface Fulfilment {
  icon: 'qr-code-outline' | 'key-outline' | 'cube-outline';
  title: string;
  detail: string;
  /**
   * `true` para todo tipo cujo benefício é resgatado **fora** do aplicativo.
   *
   * Hoje os três são. O campo existe para que o teste possa afirmar isso e para que uma
   * eventual exceção futura seja uma decisão explícita, com o nome certo, em vez de uma
   * mudança silenciosa de cópia.
   */
  resgateExterno: boolean;
}

export const FULFILMENT: Record<ProductKind, Fulfilment> = {
  voucher: {
    icon: 'qr-code-outline',
    title: 'Voucher para apresentar',
    detail:
      'Depois de pagar, você recebe um QR e um código. Mostre no parceiro para resgatar.',
    resgateExterno: true,
  },
  digital: {
    icon: 'key-outline',
    title: 'Benefício com código de resgate',
    detail: 'Depois de pagar, você recebe um código de resgate para usar no parceiro.',
    resgateExterno: true,
  },
  physical: {
    icon: 'cube-outline',
    title: 'Retirada ou entrega pelo parceiro',
    detail:
      'Combine a retirada ou a entrega direto com o parceiro, apresentando o código do pedido.',
    resgateExterno: true,
  },
};

/**
 * `true` quando **todo** o catálogo é resgatado fora do aplicativo — a condição que dispensa
 * In-App Purchase. Usado pelo teste; se um dia devolver `false`, a submissão precisa de IAP.
 */
export function catalogoTodoResgatadoForaDoApp(): boolean {
  return Object.values(FULFILMENT).every((f) => f.resgateExterno);
}
