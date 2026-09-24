import mysql from 'mysql2/promise';

const variaveisObrigatorias = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
];

// Interrompe a inicialização se faltar alguma configuração.
for (const nome of variaveisObrigatorias) {
    if (!process.env[nome]) {
        throw new Error(`Configuração ausente: ${nome}`);
    }
}

const porta = Number(process.env.DB_PORT);

if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
    throw new Error('DB_PORT deve ser um número inteiro entre 1 e 65535.');
}

// Compartilha o gerenciador de conexões com os outros módulos.
export const banco = mysql.createPool({
    host: process.env.DB_HOST,
    port: porta,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 5000,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 20
});
