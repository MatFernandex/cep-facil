const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const contexto = { AbortController, setTimeout, clearTimeout, fetch };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/cep.js'), 'utf8'), contexto);
const cep = contexto.CepFacil;
const dados = { cep: '01001-000', logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP', ddd: '11' };
const endereco = cep.normalizarEndereco(dados, '01001000', 'ViaCEP');
const resposta = (json, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => json });

test('aceita hífen e preserva zeros à esquerda', () => {
  assert.equal(cep.normalizarCep(' 01001-000 '), '01001000');
  assert.equal(cep.formatarCep('01001000'), '01001-000');
});
test('rejeita letras, espaço interno e quantidade errada sem corrigir silenciosamente', () => {
  for (const valor of ['', '0100100', '010010000', '01001A000', '01001 000', '01001--000', null]) assert.throws(() => cep.normalizarCep(valor));
});
test('endereço geral não inventa rua, bairro ou número de casa', () => {
  const geral = cep.normalizarEndereco({ cep: '01001-000', localidade: 'São Paulo', uf: 'SP' }, '01001000', 'ViaCEP');
  assert.equal(cep.montarTextoEndereco(geral), 'São Paulo - SP\nCEP 01001-000');
});
test('rejeita resposta de outro CEP e objeto incompleto', () => {
  assert.throws(() => cep.normalizarEndereco({ ...dados, cep: '01002-000' }, '01001000', 'ViaCEP'));
  assert.throws(() => cep.normalizarEndereco({ cep: '01001-000' }, '01001000', 'ViaCEP'));
});
test('histórico limita a cinco e move duplicados para o começo', () => {
  let itens = [];
  for (let i = 0; i < 7; i++) itens = cep.adicionarAoHistorico(itens, { ...endereco, cep: '01001-00' + i }, 100 + i);
  itens = cep.adicionarAoHistorico(itens, { ...endereco, cep: '01001-004' }, 200);
  assert.equal(itens.length, 5);
  assert.equal(itens[0].cep, '01001-004');
  assert.equal(itens.filter(item => item.cep === '01001-004').length, 1);
});
test('histórico descartado quando inválido ou com mais de trinta dias', () => {
  const agora = 40 * 86400000;
  const registros = [{ ...endereco, consultadoEm: agora }, { ...endereco, cep: '01002-000', consultadoEm: 1 }, { cep: 'invalido', consultadoEm: agora }];
  const leitura = cep.lerHistorico({ getItem: () => JSON.stringify(registros) }, agora);
  assert.equal(leitura.itens.length, 1);
  assert.equal(leitura.itens[0].cidade, 'São Paulo');
});
test('storage indisponível e JSON corrompido não interrompem a aplicação', () => {
  const indisponivel = { getItem() { throw new Error('Bloqueado'); }, setItem() { throw new Error('Sem espaço'); } };
  assert.equal(cep.lerHistorico(indisponivel).disponivel, false);
  assert.equal(cep.salvarHistorico(indisponivel, []).valueOf(), false);
  assert.equal(cep.lerHistorico({ getItem: () => 'invalid json' }).itens.length, 0);
});
test('sucesso usa ViaCEP e não chama serviço alternativo', async () => {
  let chamadas = 0;
  const resultado = await cep.buscarEndereco('01001000', { fetchImpl: async () => { chamadas++; return resposta(dados); } });
  assert.equal(resultado.logradouro, 'Praça da Sé');
  assert.equal(chamadas, 1);
});
test('CEP inexistente não dispara fallback nem vira endereço válido', async () => {
  let chamadas = 0;
  await assert.rejects(cep.buscarEndereco('99999999', { fetchImpl: async () => { chamadas++; return resposta({ erro: true }); } }), /CEP não encontrado/);
  assert.equal(chamadas, 1);
});
test('indisponibilidade do ViaCEP recorre à BrasilAPI', async () => {
  const urls = [];
  const resultado = await cep.buscarEndereco('01001000', { fetchImpl: async url => {
    urls.push(url);
    return url.includes('viacep') ? resposta({}, 503) : resposta({ cep: '01001000', street: 'Praça da Sé', neighborhood: 'Sé', city: 'São Paulo', state: 'SP' });
  } });
  assert.equal(resultado.fonte, 'BrasilAPI');
  assert.equal(urls.length, 2);
});
test('falha nos dois serviços devolve mensagem tratável', async () => {
  await assert.rejects(cep.buscarEndereco('01001000', { fetchImpl: async () => { throw new Error('Falha de rede'); } }), /Confira sua conexão/);
});
test('cancelamento impede fallback e limita respostas antigas', async () => {
  const controle = new AbortController();
  let chamadas = 0;
  await assert.rejects(cep.buscarEndereco('01001000', { signal: controle.signal, fetchImpl: async () => {
    chamadas++;
    controle.abort();
    throw new Error('Cancelada');
  } }), /Cancelada/);
  assert.equal(chamadas, 1);
});
test('tempo limite cancela requisição pendente', async () => {
  await assert.rejects(cep.requisitarJson('https://exemplo.test', { tempoLimite: 10, fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Tempo limite')), { once: true });
  }) }), /Tempo limite/);
});
