# Verificação do CEP Fácil

## Testes automatizados

Executar `node --test testes/cep.test.cjs`. A consulta às APIs nos testes é simulada para verificar as falhas sem depender da internet. As consultas reais são conferidas separadamente no navegador.

## Roteiro para apresentação

1. Abra o site sem consulta prévia: campo de CEP visível, instrução de oito números e resultado vazio.
2. Consulte `01001-000`: deve aparecer Praça da Sé, Sé, São Paulo/SP.
3. Copie o endereço e cole em um editor de texto.
4. Digite `123`: deve aparecer aviso de oito números, sem apresentar o resultado anterior.
5. Digite `01001A000`: a letra deve ser rejeitada, sem transformá-la em um CEP válido.
6. Consulte `99999999`: deve aparecer aviso de CEP não encontrado.
7. Consulte dois CEPs válidos e repita o primeiro: histórico sem duplicatas.
8. Recarregue e abra o resultado salvo. Deve ser identificado como consulta salva; a fonte não é consultada de novo.
9. Limpe o histórico e recarregue: a lista deve continuar vazia.
10. Teste a página em celular (375px) e desktop, por teclado e com ampliação de texto.
11. Sem permissão de clipboard, o endereço deve aparecer selecionado para cópia manual.
12. Com internet indisponível, novas consultas devem informar a falha. Histórico salvo permanece acessível depois de carregar a página.

## Resultado desta entrega

Verificação em 06/10/2026:

- **13 testes automatizados aprovados**, sem falhas; sintaxe dos três arquivos JavaScript válida.
- Consulta real de `01001-000`: Praça da Sé, Sé, São Paulo/SP, DDD 11, Sudeste. ViaCEP e complemento do IBGE identificados na tela.
- Entrada `123`: mensagem de formato inválido; endereço anterior oculto.
- Consulta real de `99999999`: mensagem de CEP não encontrado.
- Histórico preservado após recarregar; consulta salva identificada; limpeza persistiu após novo carregamento.
- Busca por Enter funcionou.
- Layout conferido em 375 × 812 e 1280 × 900, sem transbordamento horizontal; controles, endereço e textos legíveis.
- Console do navegador sem erros ou avisos de execução.
- Botão de copiar recebeu sucesso da API nativa e exibiu confirmação. A automação dispõe de uma área de transferência virtual separada, portanto a colagem do conteúdo copiado deve ser conferida manualmente no navegador habitual. O texto a copiar é coberto pelas regras testadas.
- WebMCP: ferramenta registrada, consulta real válida retornou o endereço e atualizou a mesma tela; entrada inválida rejeitada.

Falhas de rede, fallback, armazenamento bloqueado e tempo limite foram simulados nos testes, não provocados nos serviços públicos. A seleção manual para clipboard bloqueado permanece no roteiro de conferência manual. A publicação será registrada em `PUBLICACAO.md` após conferência da URL pública.
