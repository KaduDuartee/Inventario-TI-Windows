import mysql from 'mysql2/promise';
import { obterConfiguracaoBanco } from './configuracao.js';

// Compartilha o gerenciador de conexões com os outros módulos.
export const banco = mysql.createPool(obterConfiguracaoBanco());
