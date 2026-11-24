import webpack from 'webpack';
import { rules } from './webpack.rules.mjs';
import { normalizarUrlApi } from './src/configuracaoApi.js';

const urlApiBuild = process.env.INVENTARIO_API_URL?.trim()
  ? normalizarUrlApi(process.env.INVENTARIO_API_URL)
  : '';

export default {
  /**
   * Este é o ponto de entrada principal do aplicativo, o primeiro arquivo
   * executado no processo principal.
   */
  entry: './src/main.js',
  module: {
    rules,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.INVENTARIO_API_URL_BUILD': JSON.stringify(urlApiBuild),
    }),
  ],
};
