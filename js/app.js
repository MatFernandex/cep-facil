(function () {
  'use strict';
  const regras = window.CepFacil;
  const elemento = id => document.getElementById(id);
  const formulario = elemento('formulario-cep');
  const campoCep = elemento('cep');
  const botaoBuscar = elemento('buscar');
  const resultado = elemento('resultado');
  let enderecoAtual = null;
  let consultaAtual = null;
  let versaoConsulta = 0;
  let promessaEstados = null;
  let armazenamento;
  try { armazenamento = window.localStorage; } catch { armazenamento = null; }
  const leitura = regras.lerHistorico(armazenamento);
  let historico = leitura.itens;
  elemento('aviso-armazenamento').hidden = leitura.disponivel;

  function mostrarMensagem(texto = '', tipo = 'informacao') {
    elemento('mensagem').textContent = texto;
    elemento('mensagem').dataset.tipo = tipo;
    elemento('mensagem').hidden = !texto;
  }

  function atualizarCarregamento(carregando) {
    formulario.setAttribute('aria-busy', String(carregando));
    botaoBuscar.disabled = carregando;
    elemento('texto-buscar').textContent = carregando ? 'Consultando…' : 'Consultar CEP';
  }

  function exibirEndereco(endereco, salvo = false) {
    const mudouEndereco = enderecoAtual !== endereco;
    enderecoAtual = endereco;
    elemento('vazio').hidden = true;
    resultado.hidden = false;
    elemento('origem-resultado').textContent = salvo ? 'Consulta salva neste navegador' : 'Endereço encontrado';
    elemento('cep-resultado').textContent = endereco.cep;
    elemento('titulo-resultado').textContent = endereco.logradouro || 'CEP geral da localidade';
    elemento('cidade-resultado').textContent = endereco.cidade + ' · ' + endereco.uf;
    elemento('bairro-resultado').textContent = endereco.bairro || 'Não informado';
    elemento('estado-resultado').textContent = endereco.estado ? endereco.estado + ' (' + endereco.uf + ')' : endereco.uf;
    elemento('ddd-resultado').textContent = endereco.ddd || 'Não informado';
    elemento('regiao-resultado').textContent = endereco.regiao || 'Não informada';
    elemento('complemento-resultado').textContent = endereco.complemento ? 'Complemento da fonte: ' + endereco.complemento : '';
    elemento('complemento-resultado').hidden = !endereco.complemento;
    elemento('fonte-resultado').textContent = 'Fonte: ' + endereco.fonte + (endereco.enriquecido ? ' · IBGE' : '');
    if (mudouEndereco) elemento('copia-manual').hidden = true;
  }

  function renderizarHistorico() {
    const lista = elemento('lista-historico');
    lista.replaceChildren();
    elemento('historico-vazio').hidden = historico.length > 0;
    elemento('limpar-historico').hidden = historico.length === 0;
    for (const endereco of historico) {
      const item = document.createElement('li');
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'item-historico';
      botao.setAttribute('aria-label', 'Abrir consulta salva do CEP ' + endereco.cep + ', ' + endereco.cidade);
      const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(endereco.consultadoEm);
      const campos = [['historico-cep', endereco.cep], ['historico-cidade', endereco.cidade + ' · ' + endereco.uf], ['historico-data', 'Consultado em ' + data]];
      for (const [classe, texto] of campos) {
        const span = document.createElement('span');
        span.className = classe;
        span.textContent = texto;
        botao.append(span);
      }
      botao.addEventListener('click', () => {
        cancelarConsulta();
        campoCep.value = endereco.cep;
        campoCep.removeAttribute('aria-invalid');
        exibirEndereco(endereco, true);
        mostrarMensagem('Endereço recuperado do histórico. Consulte o CEP novamente para atualizar os dados.');
        resultado.focus({ preventScroll: true });
      });
      item.append(botao);
      lista.append(item);
    }
  }

  function gravarEndereco(endereco) {
    historico = regras.adicionarAoHistorico(historico, endereco);
    if (!regras.salvarHistorico(armazenamento, historico)) elemento('aviso-armazenamento').hidden = false;
    renderizarHistorico();
  }

  function carregarEstados() {
    // A lista de UFs é pequena, independente do CEP e reutilizada durante a sessão.
    if (!promessaEstados) {
      promessaEstados = regras.requisitarJson('https://servicodados.ibge.gov.br/api/v1/localidades/estados', { tempoLimite: 3500 })
        .then(dados => Array.isArray(dados) ? dados : [])
        .catch(() => { promessaEstados = null; return []; });
    }
    return promessaEstados;
  }

  function cancelarConsulta() {
    versaoConsulta += 1;
    consultaAtual?.abort();
    consultaAtual = null;
    atualizarCarregamento(false);
  }

  async function consultar(valor, moverFoco = true) {
    cancelarConsulta();
    const versao = versaoConsulta;
    let cep;
    try { cep = regras.normalizarCep(valor); }
    catch (erro) {
      resultado.hidden = true;
      enderecoAtual = null;
      elemento('vazio').hidden = false;
      campoCep.setAttribute('aria-invalid', 'true');
      mostrarMensagem(erro.message, 'erro');
      if (moverFoco) campoCep.focus();
      return { sucesso: false, erro: erro.message };
    }
    campoCep.removeAttribute('aria-invalid');
    campoCep.value = regras.formatarCep(cep);
    resultado.hidden = true;
    enderecoAtual = null;
    elemento('vazio').hidden = true;
    mostrarMensagem('Buscando o endereço…');
    atualizarCarregamento(true);
    const controle = new AbortController();
    consultaAtual = controle;
    try {
      const promessaEndereco = regras.buscarEndereco(cep, { signal: controle.signal });
      // O endereço aparece assim que chegar; a consulta independente ao IBGE não o bloqueia.
      const promessaDetalhes = Promise.all([promessaEndereco, carregarEstados()]);
      // Consumir cedo a rejeição evita uma Promise sem tratamento quando a busca falha.
      promessaDetalhes.catch(() => {});
      const endereco = await promessaEndereco;
      if (versao !== versaoConsulta) return { sucesso: false, cancelado: true };
      exibirEndereco(endereco);
      gravarEndereco(endereco);
      mostrarMensagem();
      if (moverFoco) resultado.focus({ preventScroll: true });
      const [, estados] = await promessaDetalhes;
      if (versao !== versaoConsulta) return { sucesso: false, cancelado: true };
      const estado = estados.find(item => item?.sigla === endereco.uf);
      if (estado && typeof estado.nome === 'string' && typeof estado.regiao?.nome === 'string') {
        endereco.estado = estado.nome.slice(0, 80);
        endereco.regiao = estado.regiao.nome.slice(0, 80);
        endereco.enriquecido = true;
        exibirEndereco(endereco);
        // Preservar a hora da consulta ao complementar os dados.
        historico = historico.map(item => item.cep === endereco.cep ? { ...item, ...endereco } : item);
        regras.salvarHistorico(armazenamento, historico);
      }
      return { sucesso: true, endereco: { ...endereco } };
    } catch (erro) {
      if (versao !== versaoConsulta || controle.signal.aborted) return { sucesso: false, cancelado: true };
      resultado.hidden = true;
      elemento('vazio').hidden = false;
      mostrarMensagem(erro.message, 'erro');
      return { sucesso: false, erro: erro.message };
    } finally {
      if (versao === versaoConsulta) {
        atualizarCarregamento(false);
        consultaAtual = null;
      }
    }
  }

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    void consultar(campoCep.value);
  });

  campoCep.addEventListener('input', () => {
    // Formatar somente entradas numéricas: letras não viram silenciosamente um CEP válido.
    const texto = campoCep.value.replace('-', '');
    if (/^\d{0,8}$/.test(texto)) campoCep.value = texto.length > 5 ? texto.slice(0, 5) + '-' + texto.slice(5) : texto;
    campoCep.removeAttribute('aria-invalid');
    cancelarConsulta();
    resultado.hidden = true;
    enderecoAtual = null;
    elemento('vazio').hidden = false;
    elemento('copia-manual').hidden = true;
    mostrarMensagem();
  });

  elemento('exemplo').addEventListener('click', () => { void consultar('01001000'); });

  elemento('copiar').addEventListener('click', async () => {
    if (!enderecoAtual) return;
    const enderecoCopiado = enderecoAtual;
    const texto = regras.montarTextoEndereco(enderecoCopiado);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Cópia indisponível');
      await navigator.clipboard.writeText(texto);
      if (enderecoAtual !== enderecoCopiado) return;
      mostrarMensagem('Endereço copiado. Agora é só colar onde precisar.', 'sucesso');
    } catch {
      if (enderecoAtual !== enderecoCopiado) return;
      elemento('copia-manual').hidden = false;
      elemento('texto-copia').value = texto;
      elemento('texto-copia').focus();
      elemento('texto-copia').select();
      mostrarMensagem('A cópia automática não está disponível. O endereço está selecionado abaixo para você copiar.');
    }
  });

  elemento('limpar-historico').addEventListener('click', () => {
    historico = [];
    const salvo = regras.salvarHistorico(armazenamento, historico);
    if (!salvo) elemento('aviso-armazenamento').hidden = false;
    renderizarHistorico();
    mostrarMensagem(salvo ? 'Histórico deste navegador limpo.' : 'A lista foi limpa nesta sessão. O navegador bloqueou a alteração dos dados salvos.');
    campoCep.focus();
  });

  // O link pessoal é configurável e só aceita endereços HTTP ou HTTPS.
  const configuracao = window.CONFIGURACAO_CEP;
  try {
    const urlAutor = new URL(configuracao.siteAutor);
    if (/^https?:$/.test(urlAutor.protocol)) {
      elemento('link-autor').href = urlAutor.href;
      elemento('link-autor').textContent = configuracao.nomeAutor;
    }
  } catch { /* Manter o link público definido no HTML. */ }
  elemento('ano').textContent = String(new Date().getFullYear());
  renderizarHistorico();

  // Recurso progressivo: navegadores sem WebMCP continuam funcionando normalmente.
  if (document.modelContext?.registerTool) {
    const ciclo = new AbortController();
    try {
      Promise.resolve(document.modelContext.registerTool({
        name: 'consultar_cep',
        title: 'Consultar CEP',
        description: 'Consulta um CEP brasileiro, mostra o endereço e salva a consulta no histórico local deste navegador.',
        inputSchema: { type: 'object', properties: { cep: { type: 'string', pattern: '^\\d{5}-?\\d{3}$' } }, required: ['cep'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(entrada) {
          if (!entrada || typeof entrada.cep !== 'string' || Object.keys(entrada).some(chave => chave !== 'cep')) throw new Error('Informe apenas um CEP válido.');
          regras.normalizarCep(entrada.cep);
          return consultar(entrada.cep, false);
        }
      }, { signal: ciclo.signal })).catch(() => {});
    } catch { /* Suporte experimental não pode interromper a consulta. */ }
    window.addEventListener('pagehide', () => ciclo.abort(), { once: true });
  }
})();
