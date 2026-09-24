import express from 'express';
import { banco } from './banco.js';

const app = express();
const endereco = '127.0.0.1';
const porta = 3000;

// Confirma que a API está respondendo.
app.get('/saude', (requisicao, resposta) => {
    resposta.json({
        status: 'ok',
        servico: 'inventario-ti-api'
    });
});

// Verifica se a API consegue executar uma consulta no banco.
app.get('/saude/banco', async (requisicao, resposta) => {
    try {
        await banco.execute('SELECT 1');

        resposta.json({
            status: 'ok',
            banco: 'disponivel'
        });
    } catch (erro) {
        console.error('Falha na consulta ao banco:', erro.code ?? 'SEM_CODIGO');

        resposta.status(503).json({
            status: 'erro',
            banco: 'indisponivel'
        });
    }
});

// Lista até 100 equipamentos cadastrados.
app.get('/equipamentos', async (requisicao, resposta) => {
    try {
        const [equipamentos] = await banco.execute(
            `SELECT id, codigo_inventario, data_cadastro
             FROM equipamentos
             ORDER BY id
             LIMIT 100`
        );

        resposta.json({
            equipamentos: equipamentos
        });
    } catch (erro) {
        console.error('Falha ao listar equipamentos:', erro.code ?? 'SEM_CODIGO');

        resposta.status(500).json({
            erro: 'Não foi possível consultar os equipamentos.'
        });
    }
});

// Consulta um equipamento pelo ID.
app.get('/equipamentos/:id', async (requisicao, resposta) => {
    const idRecebido = requisicao.params.id;

    // Aceita somente dígitos, começando de 1 a 9.
    if (!/^[1-9][0-9]{0,9}$/.test(idRecebido)) {
        return resposta.status(400).json({
            erro: 'O ID deve ser um número inteiro positivo válido.'
        });
    }

    const id = Number(idRecebido);

    // Limite da coluna INT UNSIGNED utilizada no banco.
    if (id > 4294967295) {
        return resposta.status(400).json({
            erro: 'O ID está fora do intervalo permitido.'
        });
    }

    try {
        const [equipamentos] = await banco.execute(
            `SELECT id, codigo_inventario, data_cadastro
             FROM equipamentos
             WHERE id = ?`,
            [id]
        );

        if (equipamentos.length === 0) {
            return resposta.status(404).json({
                erro: 'Equipamento não encontrado.'
            });
        }

        resposta.json({
            equipamento: equipamentos[0]
        });
    } catch (erro) {
        console.error('Falha ao consultar equipamento:', erro.code ?? 'SEM_CODIGO');

        resposta.status(500).json({
            erro: 'Não foi possível consultar o equipamento.'
        });
    }
});

// Disponibiliza a API somente neste computador.
app.listen(porta, endereco, () => {
    console.log(`API disponível em http://${endereco}:${porta}`);
});
