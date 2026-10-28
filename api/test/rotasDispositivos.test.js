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