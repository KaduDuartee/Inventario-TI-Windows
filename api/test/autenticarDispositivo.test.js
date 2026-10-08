import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { criarAutenticarDispositivo } from '../src/middleware/autenticarDispositivo.js';

const tokenTeste = 'A'.repeat(43);

function criarResposta() {
    return {
        codigoStatus: null,
        corpo: null,
        status(codigo) {
            this.codigoStatus = codigo;
            return this;
        },
        json(corpo) {
            this.corpo = corpo;
            return this;
        }
    };
}

test('rejeita credencial ausente sem consultar o banco', async () => {
    let consultaRealizada = false;
    let proximoChamado = false;

    const bancoFalso = {
        async execute() {
            consultaRealizada = true;
            return [[], []];
        }
    };

    const resposta = criarResposta();
    const middleware = criarAutenticarDispositivo(bancoFalso);

    await middleware(
        { get: () => '' },
        resposta,
        () => {
            proximoChamado = true;
        }
    );

    assert.equal(resposta.codigoStatus, 401);
    assert.equal(consultaRealizada, false);
    assert.equal(proximoChamado, false);
});

test('rejeita token sem dispositivo ativo correspondente', async () => {
    let proximoChamado = false;

    const bancoFalso = {
        async execute() {
            return [[], []];
        }
    };

    const resposta = criarResposta();
    const middleware = criarAutenticarDispositivo(bancoFalso);

    await middleware(
        { get: () => `Bearer ${tokenTeste}` },
        resposta,
        () => {
            proximoChamado = true;
        }
    );

    assert.equal(resposta.codigoStatus, 401);
    assert.equal(proximoChamado, false);
});

test('aceita token válido e associa o equipamento ao pedido', async () => {
    const hashEsperado = createHash('sha256')
        .update(tokenTeste)
        .digest('hex');

    const bancoFalso = {
        async execute(sql, parametros) {
            assert.match(sql, /ativo = TRUE/);
            assert.deepEqual(parametros, [hashEsperado]);
            return [[{ equipamento_id: '7' }], []];
        }
    };

    const requisicao = { get: () => `Bearer ${tokenTeste}` };
    const resposta = criarResposta();
    const middleware = criarAutenticarDispositivo(bancoFalso);
    let proximoChamado = false;

    await middleware(requisicao, resposta, () => {
        proximoChamado = true;
    });

    assert.equal(proximoChamado, true);
    assert.deepEqual(requisicao.dispositivo, { equipamentoId: 7 });
    assert.equal(resposta.codigoStatus, null);
});

test('retorna 503 quando não consegue consultar o banco', async t => {
    const logErro = t.mock.method(console, 'error', () => {});

    const bancoFalso = {
        async execute() {
            const erro = new Error('Falha simulada');
            erro.code = 'ECONNREFUSED';
            throw erro;
        }
    };

    const resposta = criarResposta();
    const middleware = criarAutenticarDispositivo(bancoFalso);
    let proximoChamado = false;

    await middleware(
        { get: () => `Bearer ${tokenTeste}` },
        resposta,
        () => {
            proximoChamado = true;
        }
    );

    assert.equal(resposta.codigoStatus, 503);
    assert.deepEqual(resposta.corpo, {
        erro: 'Não foi possível verificar a credencial do dispositivo.'
    });
    assert.equal(proximoChamado, false);
    assert.equal(logErro.mock.calls.length, 1);
});

test('rejeita token malformado sem consultar o banco', async () => {
    let consultaRealizada = false;

    const bancoFalso = {
        async execute() {
            consultaRealizada = true;
            return [[], []];
        }
    };

    const resposta = criarResposta();
    const middleware = criarAutenticarDispositivo(bancoFalso);

    await middleware(
        { get: () => 'Bearer curto' },
        resposta,
        () => {
            assert.fail('A etapa seguinte não deveria ser chamada.');
        }
    );

    assert.equal(resposta.codigoStatus, 401);
    assert.equal(consultaRealizada, false);
});
