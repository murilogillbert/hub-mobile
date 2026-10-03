import type { ProductKind } from '@/api/types';
import { FULFILMENT, catalogoTodoResgatadoForaDoApp } from '@/lib/fulfilment';

/**
 * Guarda da isenção de In-App Purchase.
 *
 * A Apple exige IAP para o que é consumido **dentro** do aplicativo. Aqui nada é: todo pedido
 * pago gera um código resgatado no parceiro. Esse invariante não está expresso em nenhum lugar
 * que o compilador verifique, e pode ser quebrado por uma mudança de cópia ou por um tipo novo
 * de produto — daí este teste.
 *
 * Se algum destes falhar, **pare antes de submeter** e releia `src/lib/fulfilment.ts`: a
 * submissão provavelmente passou a precisar de IAP.
 */
describe('política de entrega e isenção de IAP', () => {
  const TIPOS: ProductKind[] = ['physical', 'digital', 'voucher'];

  it('cobre todo tipo de produto que a API pode devolver', () => {
    // Um tipo novo sem entrada aqui faria a tela renderizar `undefined` e, pior, deixaria a
    // isenção sem resposta para aquele caso.
    for (const tipo of TIPOS) {
      expect(FULFILMENT[tipo]).toBeDefined();
    }
    expect(Object.keys(FULFILMENT).sort()).toEqual([...TIPOS].sort());
  });

  it('todo tipo é resgatado fora do aplicativo', () => {
    expect(catalogoTodoResgatadoForaDoApp()).toBe(true);
  });

  it('`digital` é código de resgate, não conteúdo que abre no aplicativo', () => {
    // É o tipo que a revisão vai questionar: o nome sugere entrega digital no app.
    expect(FULFILMENT.digital.resgateExterno).toBe(true);
    expect(FULFILMENT.digital.detail).toMatch(/c[óo]digo de resgate/i);
    expect(FULFILMENT.digital.detail).toMatch(/parceiro/i);
  });

  it('nenhuma cópia promete acesso ou consumo dentro do aplicativo', () => {
    // Palavras que, na descrição de entrega, indicariam consumo interno — e portanto IAP.
    const proibidas =
      /\b(no app|no aplicativo|acesso imediato|libera(?:r|do)|assistir|baixar|download|desbloquei)/i;
    for (const tipo of TIPOS) {
      expect(FULFILMENT[tipo].detail).not.toMatch(proibidas);
      expect(FULFILMENT[tipo].title).not.toMatch(proibidas);
    }
  });
});
