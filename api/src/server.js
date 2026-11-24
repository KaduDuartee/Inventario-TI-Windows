import { banco } from './banco.js';
import { criarAplicacao } from './aplicacao.js';
import {
    obterConfiguracaoServidor,
    obterConfiguracaoTrustProxy
} from './configuracao.js';

const { host, porta } = obterConfiguracaoServidor();
const trustProxy = obterConfiguracaoTrustProxy();
const app = criarAplicacao(banco, { trustProxy });

app.listen(porta, host, () => {
    console.log(`API disponível em http://${host}:${porta}`);
});
