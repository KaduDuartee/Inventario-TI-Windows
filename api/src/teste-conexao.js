import { banco } from './banco.js';

try {
    const [linhas] = await banco.execute(
        'SELECT DATABASE() AS banco_atual, CURRENT_USER() AS conta_autorizada'
    );

    console.table(linhas);
} catch (erro) {
    console.error('Falha na conexão ou consulta:', erro.code ?? 'SEM_CODIGO');
    process.exitCode = 1;
} finally {
    await banco.end();
}