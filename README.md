# CEP Fácil

**Site publicado:** [Abrir CEP Fácil](https://matfernandex.github.io/cep-facil/). **Código:** [MatFernandex/cep-facil](https://github.com/MatFernandex/cep-facil).

Serviço web para **encontrar e copiar um endereço a partir de um CEP**, voltado a pessoas que precisam preencher um formulário, preparar uma etiqueta ou enviar um endereço por mensagem.

Uma única tarefa, resolvida em poucos cliques. HTML, CSS e JavaScript puro, sem framework, banco, chave de API ou backend próprio. O navegador chama diretamente as APIs públicas.

## Usar e demonstrar

1. Digite `01001000` ou `01001-000` e clique em **Consultar CEP** (Enter também funciona).
2. Confira rua, bairro, cidade, estado, DDD e região.
3. Clique em **Copiar endereço** e cole em uma mensagem ou editor de texto.
4. Recarregue a página: a consulta continua no histórico local.
5. Abra um endereço salvo ou clique em **Limpar histórico**.

O histórico guarda até cinco consultas por trinta dias, somente neste navegador. Abrir um resultado salvo não precisa de rede; fazer uma nova consulta precisa. Não há sincronização entre aparelhos. A aplicação inteira não é anunciada como offline.

## Abrir localmente

Abra `index.html` no navegador. Se o navegador restringir consultas ou a cópia nesse modo, use um servidor estático local:

```sh
node ferramentas/servidor.cjs
```

Acesse `http://127.0.0.1:4175`. Esse servidor existe **apenas para desenvolvimento**, não é backend do produto e não é necessário no GitHub Pages. Para encerrar, pressione Ctrl+C.

## Arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Estrutura semântica, formulário, resultado, publicidade, instruções e rodapé |
| `css/estilos.css` | Layout responsivo, estados e acessibilidade |
| `css/tokens.css` | Cópia dos tokens Organic de `packages/tokens`, mantendo o site independente |
| `js/cep.js` | Validação, normalização, histórico e consulta às APIs |
| `js/app.js` | DOM, eventos, estados da tela e recursos do navegador |
| `js/configuracao.js` | Nome e link pessoal do autor |
| `testes/cep.test.cjs` | Verificação das regras e falhas simuladas, sem dependências |

Os ícones seguem os traços Lucide, com espessura 2,75. Fontes Caprasimo e Figtree são carregadas do Google Fonts, com fontes do sistema como alternativa. O site não depende do código do Agro Check para funcionar.

## Os sete incrementos do enunciado

| Incremento | Onde aparece no projeto | Demonstração |
| --- | --- | --- |
| 1. JS básico | `cep.js`: funções, strings, condicionais, arrays, objetos e laços | Validar e formatar CEP, montar endereço e limitar histórico |
| 2. DOM e eventos | `app.js`: `addEventListener`, `preventDefault`, `textContent` e criação de elementos | Consultar e atualizar o resultado sem recarregar |
| 3. Persistência | `lerHistorico`, `salvarHistorico` e `localStorage` | Consultar, recarregar e abrir consulta salva |
| 4. APIs | `fetch` para ViaCEP, BrasilAPI e IBGE | Buscar um endereço real e complementar estado/região |
| 5. Assincronismo e concorrência | `async/await`, Promises e `Promise.all` em `consultar` | Consultar endereço e lista de UFs em paralelo, sem bloquear o endereço pelo IBGE |
| 6. Web APIs | `navigator.clipboard.writeText` | Copiar o endereço; seleção manual se a cópia for bloqueada |
| 7. Publicação e monetização | Site estático compatível com GitHub Pages; espaço publicitário de 300 × 250 | Abrir a URL pública e explicar o modelo de receita |

A consulta alternativa à BrasilAPI acontece apenas quando a fonte principal falha. Um CEP inexistente no ViaCEP não dispara consulta extra. A lista de estados do IBGE é reutilizada durante a sessão; se o IBGE falhar, o endereço continua disponível. Cancelamento, limite de espera e versão da consulta evitam resultados antigos sobrescrevendo uma busca nova.

## Personalizar o rodapé

Edite `js/configuracao.js` com seu nome e seu site pessoal ou portfólio. A primeira versão usa o perfil público do GitHub conectado, `https://github.com/MatFernandex`. Não precisa criar outra conta. O rodapé já contém o link solicitado no enunciado.

## Publicar no GitHub Pages

1. Crie um repositório público específico, por exemplo `cep-facil`.
2. Envie **o conteúdo desta pasta**, sem enviar o monorepo do Agro Check. `index.html` deve ficar na raiz do novo repositório.
3. Abra **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch `main`, pasta `/ (root)`, e clique em **Save**.
6. Aguarde a publicação e abra o endereço mostrado pelo GitHub. Confira a consulta e a cópia na URL HTTPS.

O arquivo `.nojekyll` permite servir os arquivos diretamente. Todos os caminhos de recursos são relativos, compatíveis com sites publicados em uma subpasta.

Referência: [Criando um site GitHub Pages](https://docs.github.com/pt/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Estratégia opcional de monetização

O serviço permanece gratuito. A primeira possibilidade é um anúncio identificado de papelaria, impressão de etiquetas ou serviço local de entregas. Com público suficiente, pode-se avaliar uma rede de anúncios, observando as regras do provedor e os requisitos de privacidade. Não há receita garantida nem anúncios reais nesta versão. A área reservada não coleta dados, carrega anúncios ou usa rastreadores.

Título e descrição ajudam mecanismos de busca a entender a tarefa: “consultar CEP e copiar endereço”. Instruções e dúvidas frequentes complementam o serviço. Não há compra de domínio, assinatura paga ou cadastro em rede de publicidade.

## Verificação

```sh
node --test testes/cep.test.cjs
```

Os testes cobrem entrada inválida, zeros à esquerda, CEP geral, resposta de outro CEP, histórico limitado/deduplicado/expirado, storage bloqueado, consulta principal, CEP inexistente, fallback, falha de rede, cancelamento e tempo limite. Consulte `VERIFICACAO.md` para os resultados e os passos de teste no navegador.

## Fontes e privacidade

- [ViaCEP](https://viacep.com.br/): consulta postal principal, JSON por CEP de oito dígitos.
- [BrasilAPI](https://brasilapi.com.br/docs): alternativa em caso de indisponibilidade.
- [IBGE — API de localidades](https://servicodados.ibge.gov.br/api/docs/localidades): lista pública de estados e regiões.
- O CEP informado é enviado à fonte de consulta; o IBGE recebe uma solicitação da lista de UFs. Não pedimos GPS, câmera, conta ou senha. Não há servidor próprio recebendo consultas. O navegador precisa de conexão para consultar as fontes e as fontes podem ter dados incompletos ou desatualizados.
- Dados externos são inseridos por `textContent`, sem interpretar HTML. As falhas de armazenamento e de clipboard têm alternativas tratadas.
- Há uma integração progressiva com WebMCP onde disponível; a ferramenta usa a mesma consulta e informa que grava histórico local. Ela não é necessária para o funcionamento ou para os requisitos do trabalho.
