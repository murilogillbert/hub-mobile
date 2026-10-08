import { env } from '@/config/env';
import { tokenStorage } from './client';

/**
 * Envia uma imagem para `POST /api/v1/uploads/image` e devolve a URL gravada.
 *
 * ============================================================================
 * Por que XMLHttpRequest e não `fetch`
 * ============================================================================
 *
 * Porque o `fetch` que o Expo instala no lugar do global **rejeita** a parte
 * `{ uri, name, type }` do React Native com `Unsupported FormDataPart implementation`. É a
 * mesma pedra em que o app do anunciante bateu (ver o cabeçalho de
 * `openad/app/openad-advertiser/src/api/upload.ts`): lá **todo** envio de criativo falhava até
 * o transporte virar XHR.
 *
 * O `XMLHttpRequest` do React Native entende essa parte e faz streaming do arquivo a partir do
 * disco, em vez de montar o corpo inteiro em memória.
 *
 * ============================================================================
 * Por que não passa pelo cliente HTTP comum
 * ============================================================================
 *
 * O cliente comum (`createHttpClient`) renova o token em `401` e trata o envelope `{ data }`.
 * Aqui o corpo é multipart e o transporte é outro, então reusá-lo exigiria um caminho especial
 * dentro dele. Em troca, esta função **não** renova token: um `401` aqui vira erro, e a tela
 * pede para tentar de novo — aceitável para uma ação que a pessoa iniciou e está olhando.
 */

const TIMEOUT_MS = 60_000;

export async function uploadImage(arquivo: {
  uri: string;
  name: string;
  type: string;
}): Promise<string> {
  const token = await tokenStorage.getAccessToken();
  if (!token) throw new Error('Sessão expirada. Entre de novo.');

  return new Promise<string>((resolve, reject) => {
    const form = new FormData();
    // O campo é `file`: é o que `upload.single('file')` espera no hub.
    form.append('file', arquivo as unknown as Blob);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${env.apiUrl}/api/v1/uploads/image`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    /**
     * `Content-Type` **não** é definido aqui de propósito: o runtime precisa gerar o
     * `boundary` do multipart. Definir a mão produz um corpo que o multer não consegue separar,
     * e o erro que chega é "Nenhum arquivo enviado" — que manda quem investiga para o lado
     * errado.
     */
    xhr.timeout = TIMEOUT_MS;

    xhr.onload = (): void => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let mensagem = `Falha ao enviar a imagem (HTTP ${xhr.status}).`;
        try {
          const corpo = JSON.parse(xhr.responseText) as { error?: string };
          if (corpo?.error) mensagem = corpo.error;
        } catch {
          // Corpo não-JSON (nginx, por exemplo). A mensagem padrão serve.
        }
        reject(new Error(mensagem));
        return;
      }
      try {
        const corpo = JSON.parse(xhr.responseText) as { data?: { url?: string }; url?: string };
        const url = corpo.data?.url ?? corpo.url;
        if (!url) {
          reject(new Error('O servidor não devolveu a URL da imagem.'));
          return;
        }
        resolve(url);
      } catch {
        reject(new Error('Resposta inesperada do servidor.'));
      }
    };
    xhr.onerror = (): void => reject(new Error('Sem conexão para enviar a imagem.'));
    xhr.ontimeout = (): void => reject(new Error('O envio demorou demais. Tente de novo.'));

    xhr.send(form);
  });
}
