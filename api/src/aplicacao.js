import express from 'express';
import { criarRotasEquipamentos } from './rotas/equipamentos.js';

export function criarAplicacao(banco) {
    const app = express();

    // Lê corpos JSON de até 10 KB.
    app.use(express.json({ limit: '10kb' }));

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

    // Encaminha as requisições de equipamentos para seu módulo de rotas.
    app.use('/equipamentos', criarRotasEquipamentos(banco));

    // Trata falhas de leitura do corpo da requisição.
    app.use((erro, requisicao, resposta, proximo) => {
        if (erro.type === 'entity.parse.failed') {
            return resposta.status(400).json({
                erro: 'O corpo da requisição contém um JSON inválido.'
            });
        }

        if (erro.type === 'entity.too.large') {
            return resposta.status(413).json({
                erro: 'O corpo da requisição excede o limite permitido.'
            });
        }

        proximo(erro);
    });

    return app;
}
