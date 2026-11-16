import { rules } from './webpack.rules.mjs';

export default {
  /**
   * Este é o ponto de entrada principal do aplicativo, o primeiro arquivo
   * executado no processo principal.
   */
  entry: './src/main.js',
  module: {
    rules,
  },
};
