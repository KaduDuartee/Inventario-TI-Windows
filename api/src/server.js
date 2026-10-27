import { banco } from './banco.js';
import { criarAplicacao } from './aplicacao.js';

const app = criarAplicacao(banco);
const endereco = '127.0.0.1';
const porta = 3000;

// Disponibiliza a API somente neste computador.
app.listen(porta, endereco, () => {
    console.log(`API disponível em http://${endereco}:${porta}`);
});
