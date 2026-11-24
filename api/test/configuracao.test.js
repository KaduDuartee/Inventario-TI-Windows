import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { criarAplicacao } from '../src/aplicacao.js';
import {
    obterConfiguracaoBanco,
    obterConfiguracaoServidor,
    obterConfiguracaoTrustProxy,
    validarConfiguracaoAdmin
} from '../src/configuracao.js';

const envBancoValido = {
    DB_HOST: '127.0.0.1',
    DB_PORT: '3306',
    DB_USER: 'inventario_app',
    DB_PASSWORD: 'segredo-de-teste-nao-real',
    DB_NAME: 'inventario_teste_1'
};

test('usa 127.0.0.1 e porta 3000 como padrão do servidor', () => {
    assert.deepEqual(obterConfiguracaoServidor({}), {
        host: '127.0.0.1',
        porta: 3000
    });
});

test('aceita HOST e PORT personalizados válidos', () => {
    assert.deepEqual(
        obterConfiguracaoServidor({ HOST: '127.0.0.1', PORT: '4000' }),
        { host: '127.0.0.1', porta: 4000 }
    );
});

test('rejeita HOST com espaços e PORT fora da faixa', () => {
    assert.throws(
        () => obterConfiguracaoServidor({ HOST: '127.0.0.1 extra' }),
        /HOST deve ser um endereço válido/
    );
    assert.throws(
        () => obterConfiguracaoServidor({ PORT: '0' }),
        /PORT deve ser um número inteiro/
    );
    assert.throws(
        () => obterConfiguracaoServidor({ PORT: '70000' }),
        /PORT deve ser um número inteiro/
    );
    assert.throws(
        () => obterConfiguracaoServidor({ PORT: 'abc' }),
        /PORT deve ser um número inteiro/
    );
});

test('mantém trust proxy desativado por padrão e aceita valores controlados', () => {
    assert.equal(obterConfiguracaoTrustProxy({}), false);
    assert.equal(obterConfiguracaoTrustProxy({ TRUST_PROXY: 'false' }), false);
    assert.equal(obterConfiguracaoTrustProxy({ TRUST_PROXY: '0' }), false);
    assert.equal(obterConfiguracaoTrustProxy({ TRUST_PROXY: '1' }), 1);
    assert.equal(obterConfiguracaoTrustProxy({ TRUST_PROXY: '2' }), 2);
    assert.equal(
        obterConfiguracaoTrustProxy({ TRUST_PROXY: 'loopback' }),
        'loopback'
    );
});

test('rejeita TRUST_PROXY permissivo ("true") ou fora do padrão', () => {
    assert.throws(
        () => obterConfiguracaoTrustProxy({ TRUST_PROXY: 'true' }),
        /TRUST_PROXY inválido/
    );
    assert.throws(
        () => obterConfiguracaoTrustProxy({ TRUST_PROXY: '11' }),
        /TRUST_PROXY inválido/
    );
    assert.throws(
        () => obterConfiguracaoTrustProxy({ TRUST_PROXY: 'qualquer' }),
        /TRUST_PROXY inválido/
    );
});

test('configura banco sem SSL por padrão e ativa TLS com verificação quando DB_SSL=true', () => {
    const padrao = obterConfiguracaoBanco(envBancoValido);
    assert.equal(padrao.port, 3306);
    assert.equal(padrao.ssl, undefined);

    const comSsl = obterConfiguracaoBanco({
        ...envBancoValido,
        DB_SSL: 'true'
    });
    assert.deepEqual(comSsl.ssl, { rejectUnauthorized: true });
});

test('rejeita variáveis ausentes, DB_PORT inválida e DB_SSL inválido', () => {
    assert.throws(
        () => obterConfiguracaoBanco({}),
        /Configuração ausente: DB_HOST/
    );
    assert.throws(
        () => obterConfiguracaoBanco({ ...envBancoValido, DB_PORT: '99999' }),
        /DB_PORT deve ser um número inteiro/
    );
    assert.throws(
        () => obterConfiguracaoBanco({ ...envBancoValido, DB_SSL: 'sim' }),
        /DB_SSL deve ser "true" ou "false"/
    );
});

test('aplicação mantém trust proxy desativado por padrão e aplica valor informado', async () => {
    const trustProxyAnterior = process.env.TRUST_PROXY;
    delete process.env.TRUST_PROXY;

    const banco = {
        async execute() {
            return [[{ 1: 1 }], []];
        }
    };

    try {
        const appPadrao = criarAplicacao(banco);
        assert.equal(appPadrao.get('trust proxy'), false);

        const appComProxy = criarAplicacao(banco, { trustProxy: 'loopback' });
        assert.equal(appComProxy.get('trust proxy'), 'loopback');

        const servidor = appComProxy.listen(0, '127.0.0.1');
        await once(servidor, 'listening');

        try {
            const endereco = servidor.address();
            const resposta = await fetch(`http://127.0.0.1:${endereco.port}/saude`);
            assert.equal(resposta.status, 200);
            assert.equal(resposta.headers.get('x-powered-by'), null);
            assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
            assert.equal(resposta.headers.get('referrer-policy'), 'no-referrer');
        } finally {
            const fechamento = new Promise((resolve, reject) => {
                servidor.close(erro => erro ? reject(erro) : resolve());
            });
            servidor.closeAllConnections();
            await fechamento;
        }
    } finally {
        if (trustProxyAnterior === undefined) {
            delete process.env.TRUST_PROXY;
        } else {
            process.env.TRUST_PROXY = trustProxyAnterior;
        }
    }
});

test('valida formato SHA-256 de ADMIN_TOKEN_HASH no startup', () => {
    assert.equal(validarConfiguracaoAdmin({}), false);
    assert.equal(validarConfiguracaoAdmin({ ADMIN_TOKEN_HASH: 'curto' }), false);
    assert.equal(
        validarConfiguracaoAdmin({ ADMIN_TOKEN_HASH: 'a'.repeat(64) }),
        true
    );
});

test('aplica rate limit em /saude/banco e envia Cache-Control: no-store ao emitir token', async () => {
    const tokenAdmin = 'B'.repeat(43);
    const hashAdmin = createHash('sha256').update(tokenAdmin).digest('hex');
    const hashAnterior = process.env.ADMIN_TOKEN_HASH;
    process.env.ADMIN_TOKEN_HASH = hashAdmin;

    const banco = {
        async execute() {
            return [{ affectedRows: 1 }, []];
        }
    };

    const app = criarAplicacao(banco, { limiteSaudeBanco: 2 });
    const servidor = app.listen(0, '127.0.0.1');
    await once(servidor, 'listening');

    try {
        const endereco = servidor.address();
        const base = `http://127.0.0.1:${endereco.port}`;

        const r1 = await fetch(`${base}/saude/banco`);
        const r2 = await fetch(`${base}/saude/banco`);
        const r3 = await fetch(`${base}/saude/banco`);

        assert.equal(r1.status, 200);
        assert.equal(r2.status, 200);
        assert.equal(r3.status, 429);

        const respostaToken = await fetch(`${base}/equipamentos/1/dispositivo/rotacionar`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${tokenAdmin}`
            }
        });

        assert.equal(respostaToken.status, 200);
        assert.equal(respostaToken.headers.get('cache-control'), 'no-store');
        assert.equal(respostaToken.headers.get('pragma'), 'no-cache');
    } finally {
        const fechamento = new Promise((resolve, reject) => {
            servidor.close(erro => erro ? reject(erro) : resolve());
        });
        servidor.closeAllConnections();
        await fechamento;

        if (hashAnterior === undefined) {
            delete process.env.ADMIN_TOKEN_HASH;
        } else {
            process.env.ADMIN_TOKEN_HASH = hashAnterior;
        }
    }
});
