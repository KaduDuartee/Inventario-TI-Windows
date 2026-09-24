import { Router } from 'express';
import { banco } from '../banco.js';

export const rotasEquipamentos = Router();

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

// Cadastra um equipamento pelo código de inventário.
rotasEquipamentos.post('/', async (requisicao, resposta) => {
    const corpo = requisicao.body;

    // Aceita somente um objeto com o campo codigo_inventario.
    if (
        corpo === null ||
        typeof corpo !== 'object' ||
        Array.isArray(corpo) ||
        Object.keys(corpo).length !== 1 ||
        Object.keys(corpo)[0] !== 'codigo_inventario'
    ) {
        return resposta.status(400).json({
            erro: 'Envie somente o campo codigo_inventario.'
        });
    }

    const codigo = corpo.codigo_inventario;

    // O código deve ter entre 1 e 50 caracteres permitidos.
    if (
        typeof codigo !== 'string' ||
        codigo.length < 1 ||
        codigo.length > 50 ||
        !/^[A-Z0-9]/.test(codigo) ||
        /[^A-Z0-9_-]/.test(codigo)
    ) {
        return resposta.status(400).json({
            erro: 'O código deve usar de 1 a 50 letras maiúsculas, números, hífen ou sublinhado.'
        });
    }

    try {
        const [resultado] = await banco.execute(
            'INSERT INTO equipamentos (codigo_inventario) VALUES (?)',
            [codigo]
        );

        resposta.status(201).json({
            id: resultado.insertId,
            codigo_inventario: codigo
        });
    } catch (erro) {
        if (erro.code === 'ER_DUP_ENTRY') {
            return resposta.status(409).json({
                erro: 'Esse código de inventário já está cadastrado.'
            });
        }

        console.error('Falha ao cadastrar equipamento:', erro.code ?? 'SEM_CODIGO');

        resposta.status(500).json({
            erro: 'Não foi possível cadastrar o equipamento.'
        });
    }
});

// Lista até 100 equipamentos cadastrados.
rotasEquipamentos.get('/', async (requisicao, resposta) => {
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
rotasEquipamentos.get('/:id', async (requisicao, resposta) => {
    const idRecebido = requisicao.params.id;
    const erroValidacao = validarIdEquipamento(idRecebido);

    if (erroValidacao !== null) {
        return resposta.status(400).json({
            erro: erroValidacao
        });
    }

    const id = Number(idRecebido);

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
rotasEquipamentos.get('/:id/coletas', async (requisicao, resposta) => {
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