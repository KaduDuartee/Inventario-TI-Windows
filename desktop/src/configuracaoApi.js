export const URL_API_PADRAO_LOCAL = 'http://127.0.0.1:3000';

const HOSTS_LOOPBACK = new Set(['127.0.0.1', 'localhost']);

export function normalizarUrlApi(urlBruta) {
  if (typeof urlBruta !== 'string' || urlBruta.trim() === '') {
    throw new Error('Endereço da API inválido.');
  }

  let endereco;
  try {
    endereco = new URL(urlBruta.trim());
  } catch {
    throw new Error('Endereço da API inválido.');
  }

  if (endereco.username || endereco.password) {
    throw new Error('O endereço da API não pode conter credenciais.');
  }

  if (endereco.search || endereco.hash || endereco.pathname !== '/') {
    throw new Error(
      'Informe apenas a origem da API (protocolo, host e porta).',
    );
  }

  if (endereco.protocol === 'https:') {
    return endereco.origin;
  }

  if (endereco.protocol === 'http:' && HOSTS_LOOPBACK.has(endereco.hostname)) {
    return endereco.origin;
  }

  throw new Error('Use https:// para conexões com servidores remotos.');
}

export function obterUrlBaseApi(env = process.env) {
  const urlRuntime = env?.INVENTARIO_API_URL;

  if (typeof urlRuntime === 'string' && urlRuntime.trim() !== '') {
    return normalizarUrlApi(urlRuntime);
  }

  const urlBuild = env?.INVENTARIO_API_URL_BUILD;

  if (typeof urlBuild === 'string' && urlBuild.trim() !== '') {
    return normalizarUrlApi(urlBuild);
  }

  return URL_API_PADRAO_LOCAL;
}
