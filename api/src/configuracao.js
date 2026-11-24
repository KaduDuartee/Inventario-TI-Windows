const variaveisObrigatoriasBanco = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
];

export function obterConfiguracaoServidor(env = process.env) {
    const hostBruto = env.HOST === undefined || env.HOST === ''
        ? '127.0.0.1'
        : String(env.HOST).trim();

    if (!hostBruto || /\s/.test(hostBruto)) {
        throw new Error('HOST deve ser um endereço válido sem espaços.');
    }

    const portaBruta = env.PORT === undefined || env.PORT === ''
        ? '3000'
        : String(env.PORT).trim();

    const porta = Number(portaBruta);

    if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
        throw new Error('PORT deve ser um número inteiro entre 1 e 65535.');
    }

    return { host: hostBruto, porta };
}

export function obterConfiguracaoTrustProxy(env = process.env) {
    const valorBruto = env.TRUST_PROXY;

    if (valorBruto === undefined || String(valorBruto).trim() === '') {
        return false;
    }

    const valor = String(valorBruto).trim().toLowerCase();

    if (valor === 'false' || valor === '0') {
        return false;
    }

    if (valor === 'loopback') {
        return 'loopback';
    }

    if (/^[1-9]\d*$/.test(valor)) {
        const saltos = Number(valor);

        if (saltos <= 10) {
            return saltos;
        }
    }

    throw new Error(
        'TRUST_PROXY inválido. Use "false", "loopback" ou um inteiro de 1 a 10.'
    );
}

export function obterConfiguracaoBanco(env = process.env) {
    for (const nome of variaveisObrigatoriasBanco) {
        if (!env[nome]) {
            throw new Error(`Configuração ausente: ${nome}`);
        }
    }

    const porta = Number(env.DB_PORT);

    if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
        throw new Error('DB_PORT deve ser um número inteiro entre 1 e 65535.');
    }

    const sslBruto = env.DB_SSL === undefined || String(env.DB_SSL).trim() === ''
        ? 'false'
        : String(env.DB_SSL).trim().toLowerCase();

    if (sslBruto !== 'true' && sslBruto !== 'false') {
        throw new Error('DB_SSL deve ser "true" ou "false".');
    }

    const configuracao = {
        host: env.DB_HOST,
        port: porta,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        connectTimeout: 5000,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 20
    };

    if (sslBruto === 'true') {
        configuracao.ssl = {
            rejectUnauthorized: true
        };
    }

    return configuracao;
}

export function validarConfiguracaoAdmin(env = process.env) {
    const hashConfigurado = env.ADMIN_TOKEN_HASH ?? '';
    return /^[a-f0-9]{64}$/i.test(hashConfigurado);
}
