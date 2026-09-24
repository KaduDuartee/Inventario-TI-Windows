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

// Disponibiliza a API somente neste computador.
app.listen(porta, endereco, () => {
    console.log(`API disponível em http://${endereco}:${porta}`);
});
