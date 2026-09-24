import mysql from 'mysql2/promise';

const variaveisObrigatorias = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
];

// Confere a configuração sem mostrar seus valores.
for (const nome of variaveisObrigatorias) {
    if (!process.env[nome]) {
        console.error(`Configuração ausente: ${nome}`);
        process.exit(1);
    }
}

let conexao;

try {
    conexao = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 5000
    });

    const [linhas] = await conexao.execute(
        'SELECT DATABASE() AS banco_atual, CURRENT_USER() AS conta_autorizada'
    );

    console.table(linhas);
} catch (erro) {
    console.error('Falha na conexão ou consulta:', erro.code ?? 'SEM_CODIGO');
    process.exitCode = 1;
} finally {
    if (conexao) {
        await conexao.end();
    }
}
