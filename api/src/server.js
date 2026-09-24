import express from 'express';
import { banco } from './banco.js';

const app = express();
const endereco = '127.0.0.1';
const porta = 3000;

// Retorna uma mensagem de erro ou null quando o ID é válido.
function validarIdEquipamento(valor) {
    if (!/^[1-9][0-9]{0,9}$/.test(valor)) {
        return 'O ID deve ser um número inteiro positivo válido.';
    }

    if (Number(valor) > 4294967295) {
        return 'O ID está fora do intervalo permitido.';
    }

    return null;
}

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

            const idRecebido = requisicao.params.id;
    const erroValidacao = validarIdEquipamento(idRecebido);

    if (erroValidacao !== null) {
        return resposta.status(400).json({
            erro: erroValidacao
        });
    }

    const id = Number(idRecebido);
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

// Consulta as 100 coletas mais recentes de um equipamento.
app.get('/equipamentos/:id/coletas', async (requisicao, resposta) => {
    const idRecebido = requisicao.params.id;
    const erroValidacao = validarIdEquipamento(idRecebido);

    if (erroValidacao !== null) {
        return resposta.status(400).json({
            erro: erroValidacao
        });
    }

    const id = Number(idRecebido);

    try {
        // Diferencia um equipamento inexistente de um sem coletas.
        const [equipamentos] = await banco.execute(
            `SELECT id, codigo_inventario
             FROM equipamentos

             WHERE id = ?`,
            [id]
        );

        if (equipamentos.length === 0) {
            return resposta.status(404).json({
                erro: 'Equipamento não encontrado.'
            });
        }

        const [coletas] = await banco.execute(
            `SELECT id, equipamento_id, data_coleta, nome_computador,
                    ram_gb, sistema_operacional, ipv4
             FROM coletas
             WHERE equipamento_id = ?
             ORDER BY data_coleta DESC, id DESC
             LIMIT 100`,
            [id]
        );

        resposta.json({
            equipamento: equipamentos[0],
            coletas: coletas
        });
    } catch (erro) {
        console.error('Falha ao consultar coletas:', erro.code ?? 'SEM_CODIGO');

        resposta.status(500).json({
            erro: 'Não foi possível consultar o histórico de coletas.'
        });
    }
});

// Disponibiliza a API somente neste computador.
app.listen(porta, endereco, () => {
    console.log(`API disponível em http://${endereco}:${porta}`);
});
