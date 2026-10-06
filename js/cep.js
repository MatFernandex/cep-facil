// Regras independentes da tela, reutilizadas pela aplicação e pelos testes.
(function (global) {
  'use strict';
  const CHAVE_HISTORICO = 'cep-facil:historico:v1';
  const LIMITE_HISTORICO = 5;
  const VALIDADE_HISTORICO = 30 * 24 * 60 * 60 * 1000;

  function normalizarCep(valor) {
    const texto = String(valor ?? '').trim();
    if (!/^\d{5}-?\d{3}$/.test(texto)) {
      throw new Error('Digite um CEP com 8 números. Exemplo: 01001-000.');
    }
    return texto.replace('-', '');
  }

  function formatarCep(valor) {
    const cep = normalizarCep(valor);
    return cep.slice(0, 5) + '-' + cep.slice(5);
  }

  function textoSeguro(valor, limite = 160) {
    return typeof valor === 'string' ? valor.trim().slice(0, limite) : '';
  }

  function normalizarEndereco(dados, cep, fonte) {
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error('Resposta de endereço inválida.');
    const cidade = textoSeguro(dados.localidade || dados.city);
    const uf = textoSeguro(dados.uf || dados.state, 2);
    if (!cidade || !/^[A-Z]{2}$/.test(uf) || normalizarCep(dados.cep) !== normalizarCep(cep)) {
      throw new Error('Resposta de endereço inválida.');
    }
    return {
      cep: formatarCep(cep),
      logradouro: textoSeguro(dados.logradouro || dados.street),
      bairro: textoSeguro(dados.bairro || dados.neighborhood),
      cidade, uf,
      estado: textoSeguro(dados.estado),
      regiao: textoSeguro(dados.regiao),
      ddd: textoSeguro(dados.ddd, 3),
      complemento: textoSeguro(dados.complemento),
      fonte: fonte === 'BrasilAPI' ? 'BrasilAPI' : 'ViaCEP'
    };
  }

  function montarTextoEndereco(endereco) {
    // CEPs gerais podem não ter logradouro ou bairro; não inventar esses dados.
    return [endereco.logradouro, endereco.bairro, endereco.cidade + ' - ' + endereco.uf, 'CEP ' + endereco.cep]
      .filter(Boolean).join('\n');
  }

  function adicionarAoHistorico(historico, endereco, agora = Date.now()) {
    return [{ ...endereco, consultadoEm: agora }, ...historico.filter(item => item.cep !== endereco.cep)]
      .slice(0, LIMITE_HISTORICO);
  }

  function lerHistorico(armazenamento, agora = Date.now()) {
    try {
      const dados = JSON.parse(armazenamento.getItem(CHAVE_HISTORICO) || '[]');
      if (!Array.isArray(dados)) return { itens: [], disponivel: true };
      const itens = [];
      for (const item of dados.slice(0, 50)) {
        try {
          if (!item || !Number.isFinite(item.consultadoEm) || item.consultadoEm > agora || agora - item.consultadoEm > VALIDADE_HISTORICO) continue;
          const endereco = normalizarEndereco({ ...item, localidade: item.cidade }, item.cep, item.fonte);
          if (!itens.some(anterior => anterior.cep === endereco.cep)) itens.push({ ...endereco, consultadoEm: item.consultadoEm });
          if (itens.length === LIMITE_HISTORICO) break;
        } catch { /* Ignorar somente o registro inválido. */ }
      }
      return { itens, disponivel: true };
    } catch { return { itens: [], disponivel: false }; }
  }

  function salvarHistorico(armazenamento, itens) {
    try { armazenamento.setItem(CHAVE_HISTORICO, JSON.stringify(itens)); return true; }
    catch { return false; }
  }

  async function requisitarJson(url, { fetchImpl = global.fetch.bind(global), signal, tempoLimite = 6500 } = {}) {
    const controle = new AbortController();
    const cancelar = () => controle.abort(signal.reason);
    if (signal?.aborted) cancelar();
    else signal?.addEventListener('abort', cancelar, { once: true });
    const temporizador = setTimeout(() => controle.abort(), tempoLimite);
    try {
      const resposta = await fetchImpl(url, { signal: controle.signal, headers: { Accept: 'application/json' } });
      if (!resposta.ok) {
        const erro = new Error('O serviço de consulta está indisponível.');
        erro.status = resposta.status;
        throw erro;
      }
      return await resposta.json();
    } finally {
      clearTimeout(temporizador);
      signal?.removeEventListener('abort', cancelar);
    }
  }

  async function buscarEndereco(valor, opcoes = {}) {
    const cep = normalizarCep(valor);
    try {
      const dados = await requisitarJson('https://viacep.com.br/ws/' + cep + '/json/', opcoes);
      if (dados.erro === true || dados.erro === 'true') {
        const erro = new Error('CEP não encontrado. Confira os números e tente novamente.');
        erro.codigo = 'NAO_ENCONTRADO';
        throw erro;
      }
      return normalizarEndereco(dados, cep, 'ViaCEP');
    } catch (erro) {
      // Ausência real não é indisponibilidade: não repetir a consulta nesse caso.
      if (opcoes.signal?.aborted || erro.codigo === 'NAO_ENCONTRADO') throw erro;
      try {
        const dados = await requisitarJson('https://brasilapi.com.br/api/cep/v1/' + cep, opcoes);
        return normalizarEndereco(dados, cep, 'BrasilAPI');
      } catch (alternativo) {
        if (opcoes.signal?.aborted) throw alternativo;
        if (alternativo.status === 404) throw new Error('CEP não encontrado. Confira os números e tente novamente.');
        throw new Error('Não foi possível consultar agora. Confira sua conexão e tente novamente.');
      }
    }
  }

  global.CepFacil = Object.freeze({ CHAVE_HISTORICO, LIMITE_HISTORICO, normalizarCep, formatarCep, normalizarEndereco,
    montarTextoEndereco, adicionarAoHistorico, lerHistorico, salvarHistorico, requisitarJson, buscarEndereco });
})(globalThis);
