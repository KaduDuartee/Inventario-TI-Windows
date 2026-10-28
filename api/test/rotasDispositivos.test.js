import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { criarAplicacao } from '../src/aplicacao.js';

const tokenAdmin = 'A'.repeat(43);
const hashTokenAdmin = createHash('sha256')
    .update(tokenAdmin)
    .digest('hex');

async function comApiDeTeste(banco, executar) {
    const app = criarAplicacao(banco);
    const servidor = app.listen(0, '127.0.0.1');
    await once(servidor, 'listening');

    try {
        const endereco = servidor.address();
        return await executar(`http://127.0.0.1:${endereco.port}`);
    } finally {
        const fechamento = new Promise((resolve, reject) => {
            servidor.close(erro => erro ? reject(erro) : resolve());
        });
        servidor.closeAllConnections();
        await fechamento;
    }
}

test('revoga dispositivo existente com credencial administrativa', async () => {
    const hashAnterior = process.env.ADMIN_TOKEN_HASH;
    process.env.ADMIN_TOKEN_HASH = hashTokenAdmin;

    const consultas = [];
    const banco = {
        async execute(sql, parametros = []) {
            consultas.push({ sql, parametros });
            return [{ affectedRows: 1 }, []];
        }
    };

    try {
        await comApiDeTeste(banco, async urlBase => {
            const resposta = await fetch(
                `${urlBase}/equipamentos/7/dispositivo`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${tokenAdmin}`
                    }
                }
            );

            assert.equal(resposta.status, 204);
            assert.equal(await resposta.text(), '');
        });
    } finally {
        if (hashAnterior === undefined) {
            delete process.env.ADMIN_TOKEN_HASH;
        } else {
            process.env.ADMIN_TOKEN_HASH = hashAnterior;
        }
    }

    assert.equal(consultas.length, 1);
    assert.match(consultas[0].sql, /UPDATE\s+dispositivos/i);
    assert.match(consultas[0].sql, /ativo\s*=\s*FALSE/i);
    assert.deepEqual(consultas[0].parametros, [7]);
});

test('rotaciona a credencial e reativa o dispositivo existente', async () => {
    const hashAnterior = process.env.ADMIN_TOKEN_HASH;
    process.env.ADMIN_TOKEN_HASH = hashTokenAdmin;

    const consultas = [];
    const banco = {
        async execute(sql, parametros = []) {
            consultas.push({ sql, parametros });
            return [{ affectedRows: 1 }, []];
        }
    };

    try {
        await comApiDeTeste(banco, async urlBase => {
            const resposta = await fetch(
                `${urlBase}/equipamentos/7/dispositivo/rotacionar`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${tokenAdmin}`
                    }
                }
            );

            assert.equal(resposta.status, 200);

            const corpo = await resposta.json();
            assert.equal(corpo.dispositivo.equipamento_id, 7);
            assert.match(corpo.token, /^[A-Za-z0-9_-]{43}$/);

            const hashNovo = createHash('sha256')
                .update(corpo.token)
                .digest('hex');

            assert.equal(consultas[0].parametros[0], hashNovo);
        });
    } finally {
        if (hashAnterior === undefined) {
            delete process.env.ADMIN_TOKEN_HASH;
        } else {
            process.env.ADMIN_TOKEN_HASH = hashAnterior;
        }
    }

    assert.equal(consultas.length, 1);
    assert.match(consultas[0].sql, /UPDATE\s+dispositivos/i);
    assert.match(consultas[0].sql, /ativo\s*=\s*TRUE/i);
    assert.deepEqual(consultas[0].parametros.slice(1), [7]);
});

test('exige credencial administrativa para revogar ou rotacionar dispositivo', async () => {
    const hashAnterior = process.env.ADMIN_TOKEN_HASH;
    process.env.ADMIN_TOKEN_HASH = hashTokenAdmin;

    let consultas = 0;
    const banco = {
        async execute() {
            consultas += 1;
            return [{ affectedRows: 1 }, []];
        }
    };

    try {
        await comApiDeTeste(banco, async urlBase => {
            const revogacao = await fetch(
                `${urlBase}/equipamentos/7/dispositivo`,
                { method: 'DELETE' }
            );

            const rotacao = await fetch(
                `${urlBase}/equipamentos/7/dispositivo/rotacionar`,
                { method: 'POST' }
            );

            assert.equal(revogacao.status, 401);
            assert.equal(rotacao.status, 401);
            assert.equal(consultas, 0);
        });
    } finally {
        if (hashAnterior === undefined) {
            delete process.env.ADMIN_TOKEN_HASH;
        } else {
            process.env.ADMIN_TOKEN_HASH = hashAnterior;
        }
    }
});

test('rejeita ID inválido sem consultar o banco ao revogar ou rotacionar', async () => {
    const hashAnterior = process.env.ADMIN_TOKEN_HASH;
    process.env.ADMIN_TOKEN_HASH = hashTokenAdmin;

    let consultas = 0;
    const banco = {
        async execute() {
            consultas += 1;
            return [{ affectedRows: 1 }, []];
        }
    };

    try {
        await comApiDeTeste(banco, async urlBase => {
            const revogacao = await fetch(
                `${urlBase}/equipamentos/abc/dispositivo`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${tokenAdmin}` }
                }
            );

            const rotacao = await fetch(
                `${urlBase}/equipamentos/abc/dispositivo/rotacionar`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${tokenAdmin}` }
                }
            );

            assert.equal(revogacao.status, 400);
            assert.equal(rotacao.status, 400);
            assert.equal(consultas, 0);
        });
    } finally {
        if (hashAnterior === undefined) {
            delete process.env.ADMIN_TOKEN_HASH;
        } else {
            process.env.ADMIN_TOKEN_HASH = hashAnterior;
        }
    }
});

test('retorna 404 quando o dispositivo não existe ao revogar ou rotacionar', async () => {
    const hashAnterior = process.env.ADMIN_TOKEN_HASH;
    process.env.ADMIN_TOKEN_HASH = hashTokenAdmin;

    let consultas = 0;
    const banco = {
        async execute() {
            consultas += 1;
            return [{ affectedRows: 0 }, []];
        }
    };

    try {
        await comApiDeTeste(banco, async urlBase => {
            const cabecalhos = {
                Authorization: `Bearer ${tokenAdmin}`
            };

            const revogacao = await fetch(
                `${urlBase}/equipamentos/7/dispositivo`,
                { method: 'DELETE', headers: cabecalhos }
            );

            const rotacao = await fetch(
                `${urlBase}/equipamentos/7/dispositivo/rotacionar`,
                { method: 'POST', headers: cabecalhos }
            );

            assert.equal(revogacao.status, 404);
            assert.equal(rotacao.status, 404);
            assert.equal(consultas, 2);
        });
    } finally {
        if (hashAnterior === undefined) {
            delete process.env.ADMIN_TOKEN_HASH;
        } else {
            process.env.ADMIN_TOKEN_HASH = hashAnterior;
        }
    }
});

test('retorna 503 se o banco falhar ao revogar ou rotacionar', async () => {
    const hashAnterior = process.env.ADMIN_TOKEN_HASH;
    process.env.ADMIN_TOKEN_HASH = hashTokenAdmin;

    let consultas = 0;
    const banco = {
        async execute() {
            consultas += 1;
            throw new Error('Falha simulada no teste.');
        }
    };

    try {
        await comApiDeTeste(banco, async urlBase => {
            const cabecalhos = {
                Authorization: `Bearer ${tokenAdmin}`
            };

            const revogacao = await fetch(
                `${urlBase}/equipamentos/7/dispositivo`,
                { method: 'DELETE', headers: cabecalhos }
            );

            const rotacao = await fetch(
                `${urlBase}/equipamentos/7/dispositivo/rotacionar`,
                { method: 'POST', headers: cabecalhos }
            );

            assert.equal(revogacao.status, 503);
            assert.equal(rotacao.status, 503);

            const corpoRotacao = await rotacao.json();
            assert.equal(Object.hasOwn(corpoRotacao, 'token'), false);
            assert.equal(consultas, 2);
        });
    } finally {
        if (hashAnterior === undefined) {
            delete process.env.ADMIN_TOKEN_HASH;
        } else {
            process.env.ADMIN_TOKEN_HASH = hashAnterior;
        }
    }
});