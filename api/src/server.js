import express from 'express';

const app = express();
const endereco = '127.0.0.1';
const porta = 3000;

// Confirma que a API está respondendo.
app.get('/saude', (requisicao, resposta) => {
    resposta.json({
        status: 'ok',
        servico: 'inventario-ti-api'
    });
});

// Disponibiliza a API somente neste computador.
app.listen(porta, endereco, () => {
    console.log(`API disponível em http://${endereco}:${porta}`);
});
