import { createHash } from 'node:crypto';

export function criarAutenticarDispositivo(banco) {
    return async function autenticarDispositivo(requisicao, resposta, proximo) {
        const cabecalho = requisicao.get('authorization') ?? '';
        const correspondencia = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(cabecalho);

        if (!correspondencia) {
            return resposta.status(401).json({
                erro: 'Credencial de dispositivo ausente ou inválida.'
            });
        }

        const tokenHash = createHash('sha256')
            .update(correspondencia[1])
            .digest('hex');

        let dispositivos;

        try {
            [dispositivos] = await banco.execute(
                `SELECT equipamento_id
                 FROM dispositivos
                 WHERE token_hash = ?
                   AND ativo = TRUE`,
                [tokenHash]
            );
        } catch (erro) {
            console.error(
                'Falha ao autenticar dispositivo:',
                erro.code ?? 'SEM_CODIGO'
            );

            return resposta.status(503).json({
                erro: 'Não foi possível verificar a credencial do dispositivo.'
            });
        }

        if (dispositivos.length === 0) {
            return resposta.status(401).json({
                erro: 'Credencial de dispositivo ausente ou inválida.'
            });
        }

        requisicao.dispositivo = {
            equipamentoId: Number(dispositivos[0].equipamento_id)
        };

        return proximo();
    };
}
