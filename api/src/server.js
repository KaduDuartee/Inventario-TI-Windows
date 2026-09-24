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

// Disponibiliza a API somente neste computador.
app.listen(porta, endereco, () => {
    console.log(`API disponível em http://${endereco}:${porta}`);
});
