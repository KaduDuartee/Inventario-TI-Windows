import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { autenticarAdministrador } from '../src/middleware/autenticarAdministrador.js';

const hashOriginal = process.env.ADMIN_TOKEN_HASH;
const tokenTeste = 'A'.repeat(43);
const hashTeste = createHash('sha256').update(tokenTeste).digest('hex');

afterEach(() => {
    if (hashOriginal === undefined) {
        delete process.env.ADMIN_TOKEN_HASH;
    } else {
        process.env.ADMIN_TOKEN_HASH = hashOriginal;
    }
});

function executarMiddleware(cabecalho) {
    const resposta = {
        statusRecebido: null,
        corpoRecebido: null,
        status(codigo) {
            this.statusRecebido = codigo;
            return this;
        },
        json(corpo) {
            this.corpoRecebido = corpo;
            return this;
        }
    };

    let proximoFoiChamado = false;

    autenticarAdministrador(
        { get: () => cabecalho },
        resposta,
        () => {
            proximoFoiChamado = true;
        }
    );

    return { resposta, proximoFoiChamado };
}

test('retorna 503 quando o hash administrativo não está configurado', () => {
    delete process.env.ADMIN_TOKEN_HASH;

    const { resposta, proximoFoiChamado } = executarMiddleware('');

    assert.equal(resposta.statusRecebido, 503);
    assert.equal(proximoFoiChamado, false);
});

test('retorna 401 sem credencial', () => {
    process.env.ADMIN_TOKEN_HASH = hashTeste;

    const { resposta, proximoFoiChamado } = executarMiddleware('');

    assert.equal(resposta.statusRecebido, 401);
    assert.equal(proximoFoiChamado, false);
});

test('retorna 401 com token incorreto', () => {
    process.env.ADMIN_TOKEN_HASH = hashTeste;

    const tokenIncorreto = 'B'.repeat(43);
    const { resposta, proximoFoiChamado } =
        executarMiddleware(`Bearer ${tokenIncorreto}`);

    assert.equal(resposta.statusRecebido, 401);
    assert.equal(proximoFoiChamado, false);
});

test('chama a próxima etapa com token válido', () => {
    process.env.ADMIN_TOKEN_HASH = hashTeste;

    const { resposta, proximoFoiChamado } =
        executarMiddleware(`Bearer ${tokenTeste}`);

    assert.equal(resposta.statusRecebido, null);
    assert.equal(proximoFoiChamado, true);
});
