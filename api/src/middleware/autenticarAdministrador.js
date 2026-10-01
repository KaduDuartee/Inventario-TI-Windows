import { createHash, timingSafeEqual } from 'node:crypto';

export function autenticarAdministrador(requisicao, resposta, proximo) {
    const hashConfigurado = process.env.ADMIN_TOKEN_HASH ?? '';

    if (!/^[a-f0-9]{64}$/i.test(hashConfigurado)) {
        return resposta.status(503).json({
            erro: 'A autenticação administrativa não está configurada.'
        });
    }

    const cabecalho = requisicao.get('authorization') ?? '';
    const correspondencia = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(cabecalho);

    if (!correspondencia) {
        return resposta.status(401).json({
            erro: 'Credencial administrativa ausente ou inválida.'
        });
    }

    const hashRecebido = createHash('sha256')
        .update(correspondencia[1])
        .digest();

    const hashEsperado = Buffer.from(hashConfigurado, 'hex');

    if (!timingSafeEqual(hashRecebido, hashEsperado)) {
        return resposta.status(401).json({
            erro: 'Credencial administrativa ausente ou inválida.'
        });
    }

    proximo();
}