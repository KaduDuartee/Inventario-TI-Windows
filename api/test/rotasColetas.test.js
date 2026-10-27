import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { criarAplicacao } from '../src/aplicacao.js';

const tokenValido = 'A'.repeat(43);
const hashTokenValido = createHash('sha256')
    .update(tokenValido)
    .digest('hex');

const coletaValida = {
    nome_computador: 'PC-API-TESTE',
    ram_gb: 16,
    sistema_operacional: 'Windows 11 Pro',
    ipv4: '192.0.2.44'
};

function criarBancoFalso({
    dispositivoAtivo = true,
    equipamentoVinculado = 7,
    equipamentoExiste = true,
    erroInsercao = null
} = {}) {
    const consultas = [];

    const banco = {
        async execute(sql, parametros = []) {
            consultas.push({ sql, parametros });

            if (/FROM dispositivos/i.test(sql)) {
                const dispositivos = dispositivoAtivo
                    ? [{ equipamento_id: String(equipamentoVinculado) }]
                    : [];

                return [dispositivos, []];
            }

            if (/SELECT id FROM equipamentos/i.test(sql)) {
                const equipamentos = equipamentoExiste
                    ? [{ id: Number(parametros[0]) }]
                    : [];

                return [equipamentos, []];
            }

            if (/INSERT INTO coletas/i.test(sql)) {
                if (erroInsercao) {
                    throw erroInsercao;
                }

                return [{ insertId: 73 }, []];
            }

            throw new Error(`Consulta inesperada no teste: ${sql}`);
        }
    };

    return { banco, consultas };
}

async function comApiDeTeste(banco, executar) {
    const app = criarAplicacao(banco);

    const servidor = app.listen(0, '127.0.0.1');
    await once(servidor, 'listening');

    try {
        const endereco = servidor.address();
        const urlBase = `http://127.0.0.1:${endereco.port}`;
        return await executar(urlBase);
    } finally {
        const fechamento = new Promise((resolve, reject) => {
            servidor.close(erro => erro ? reject(erro) : resolve());
        });
        servidor.closeAllConnections();
        await fechamento;
    }
}

async function enviarColeta(urlBase, {
    equipamentoId = 7,
    token = tokenValido,
    corpo = coletaValida
} = {}) {
    const cabecalhos = {
        'Content-Type': 'application/json'
    };

    if (token !== null) {
        cabecalhos.Authorization = `Bearer ${token}`;
    }

    return fetch(
        `${urlBase}/equipamentos/${equipamentoId}/coletas`,
        {
            method: 'POST',
            headers: cabecalhos,
            body: JSON.stringify(corpo)
        }
    );
}

test('registra coleta válida para o equipamento vinculado', async () => {
    const { banco, consultas } = criarBancoFalso();

    await comApiDeTeste(banco, async urlBase => {
        const resposta = await enviarColeta(urlBase);
        const corpo = await resposta.json();

        assert.equal(resposta.status, 201);
        assert.deepEqual(corpo, {
            id: 73,
            equipamento_id: 7,
            nome_computador: 'PC-API-TESTE',
            ram_gb: 16,
            sistema_operacional: 'Windows 11 Pro',
            ipv4: '192.0.2.44'
        });
    });

    assert.equal(consultas.length, 3);
    assert.deepEqual(consultas[0].parametros, [hashTokenValido]);
    assert.match(consultas[2].sql, /VALUES \(\?, \?, \?, \?, \?\)/);
    assert.deepEqual(consultas[2].parametros, [
        7,
        'PC-API-TESTE',
        16,
        'Windows 11 Pro',
        '192.0.2.44'
    ]);
});

test('rejeita credencial ausente sem consultar o banco', async () => {
    const { banco, consultas } = criarBancoFalso();

    await comApiDeTeste(banco, async urlBase => {
        const resposta = await enviarColeta(urlBase, { token: null });

        assert.equal(resposta.status, 401);
        assert.deepEqual(await resposta.json(), {
            erro: 'Credencial de dispositivo ausente ou inválida.'
        });
    });

    assert.equal(consultas.length, 0);
});

test('rejeita credencial que não corresponde a dispositivo ativo', async () => {
    const { banco, consultas } = criarBancoFalso({ dispositivoAtivo: false });

    await comApiDeTeste(banco, async urlBase => {
        const resposta = await enviarColeta(urlBase);

        assert.equal(resposta.status, 401);
        assert.deepEqual(await resposta.json(), {
            erro: 'Credencial de dispositivo ausente ou inválida.'
        });
    });

    assert.equal(consultas.length, 1);
    assert.match(consultas[0].sql, /ativo = TRUE/);
});

test('nega token válido usado em outro equipamento sem inserir coleta', async () => {
    const { banco, consultas } = criarBancoFalso({ equipamentoVinculado: 7 });

    await comApiDeTeste(banco, async urlBase => {
        const resposta = await enviarColeta(urlBase, { equipamentoId: 8 });

        assert.equal(resposta.status, 403);
        assert.deepEqual(await resposta.json(), {
            erro: 'Este dispositivo não está autorizado para esse equipamento.'
        });
    });

    assert.equal(consultas.length, 1);
    assert.doesNotMatch(consultas[0].sql, /INSERT INTO coletas/i);
});

test('rejeita IPv4 inválido sem consultar o equipamento nem inserir coleta', async () => {
    const { banco, consultas } = criarBancoFalso();
    const corpoInvalido = { ...coletaValida, ipv4: '999.1.2.3' };

    await comApiDeTeste(banco, async urlBase => {
        const resposta = await enviarColeta(urlBase, { corpo: corpoInvalido });

        assert.equal(resposta.status, 400);
        assert.deepEqual(await resposta.json(), {
            erro: 'ipv4 deve ser um endereço IPv4 válido ou null.'
        });
    });

    assert.equal(consultas.length, 1);
});

test('retorna 404 quando o equipamento não existe', async () => {
    const { banco, consultas } = criarBancoFalso({ equipamentoExiste: false });

    await comApiDeTeste(banco, async urlBase => {
        const resposta = await enviarColeta(urlBase);

        assert.equal(resposta.status, 404);
        assert.deepEqual(await resposta.json(), {
            erro: 'Equipamento não encontrado.'
        });
    });

    assert.equal(consultas.length, 2);
});

test('retorna erro genérico se o banco falhar ao inserir', async t => {
    const logErro = t.mock.method(console, 'error', () => {});
    const erroBanco = new Error('Detalhe interno não deve ser enviado ao cliente.');
    erroBanco.code = 'ER_SIMULADO';
    const { banco, consultas } = criarBancoFalso({ erroInsercao: erroBanco });

    await comApiDeTeste(banco, async urlBase => {
        const resposta = await enviarColeta(urlBase);
        const corpo = await resposta.json();

        assert.equal(resposta.status, 500);
        assert.deepEqual(corpo, {
            erro: 'Não foi possível registrar a coleta.'
        });
        assert.doesNotMatch(JSON.stringify(corpo), /Detalhe interno|ER_SIMULADO/);
    });

    assert.equal(consultas.length, 3);
    assert.equal(logErro.mock.calls.length, 1);
});

test('rejeita JSON malformado com resposta segura sem consultar o banco', async () => {
    const { banco, consultas } = criarBancoFalso();

    await comApiDeTeste(banco, async urlBase => {
        const resposta = await fetch(
            `${urlBase}/equipamentos/7/coletas`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${tokenValido}`,
                    'Content-Type': 'application/json'
                },
                body: '{"nome_computador":'
            }
        );

        assert.equal(resposta.status, 400);
        assert.deepEqual(await resposta.json(), {
            erro: 'O corpo da requisição contém um JSON inválido.'
        });
    });

    assert.equal(consultas.length, 0);
});

test('rejeita corpo maior que 10 KB sem consultar o banco', async () => {
    const { banco, consultas } = criarBancoFalso();
    const corpoGrande = JSON.stringify({ dado: 'x'.repeat(11 * 1024) });

    await comApiDeTeste(banco, async urlBase => {
        const resposta = await fetch(
            `${urlBase}/equipamentos/7/coletas`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${tokenValido}`,
                    'Content-Type': 'application/json'
                },
                body: corpoGrande
            }
        );

        assert.equal(resposta.status, 413);
        assert.deepEqual(await resposta.json(), {
            erro: 'O corpo da requisição excede o limite permitido.'
        });
    });

    assert.equal(consultas.length, 0);
});

test('rejeita campos adicionais no JSON e não grava a coleta', async () => {
    const { banco, consultas } = criarBancoFalso();
    const corpoComCampoExtra = {
        ...coletaValida,
        administrador: true
    };

    await comApiDeTeste(banco, async urlBase => {
        const resposta = await enviarColeta(urlBase, {
            corpo: corpoComCampoExtra
        });

        assert.equal(resposta.status, 400);
        assert.deepEqual(await resposta.json(), {
            erro: 'Envie nome_computador, ram_gb e sistema_operacional. ipv4 é opcional.'
        });
    });

    assert.equal(consultas.length, 1);
});

test('retorna 429 quando o IP excede o limite de requisições', async () => {
    const { banco, consultas } = criarBancoFalso();

    await comApiDeTeste(banco, async urlBase => {
        const resultados = await Promise.all(
            Array.from({ length: 101 }, async () => {
                const resposta = await fetch(`${urlBase}/equipamentos`);

                return {
                    status: resposta.status,
                    corpo: await resposta.json()
                };
            })
        );

        assert.equal(
            resultados.filter(resultado => resultado.status === 429).length,
            1
        );
        assert.equal(
            resultados.filter(resultado => resultado.status !== 429).length,
            100
        );

        const respostaBloqueada = resultados.find(
            resultado => resultado.status === 429
        );

        const respostaSaude = await fetch(`${urlBase}/saude`);
        assert.equal(respostaSaude.status, 200);

        assert.deepEqual(respostaBloqueada.corpo, {
            erro: 'Limite de requisições atingido. Tente novamente mais tarde.'
        });
    });

    assert.equal(consultas.length, 0);
});
