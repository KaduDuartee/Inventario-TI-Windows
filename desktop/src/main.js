import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import started from 'electron-squirrel-startup';
import path from 'node:path';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';


const executarArquivo = promisify(execFile);

// Cria ou remove atalhos durante a instalação ou desinstalação no Windows.
if (started) {
  app.quit();
}

const caminhoCredencial = () =>
  path.join(app.getPath('userData'), 'credencial-dispositivo.enc');

function remetenteConfiavel(event) {
  const url = event.senderFrame?.url;

  if (!url) return false;
  if (app.isPackaged) return url.startsWith('file://');

  try {
    const endereco = new URL(url);
    return endereco.protocol === 'http:' &&
      endereco.hostname === 'localhost' &&
      endereco.port === '3001';
  } catch {
    return false;
  }
}

function exigirRemetenteConfiavel(event) {
  if (!remetenteConfiavel(event)) {
    throw new Error('Origem não autorizada.');
  }
}

function configuracaoCredencialValida(configuracao) {
  return configuracao &&
    typeof configuracao === 'object' &&
    Number.isSafeInteger(configuracao.equipamentoId) &&
    configuracao.equipamentoId >= 1 &&
    configuracao.equipamentoId <= 4294967295 &&
    typeof configuracao.token === 'string' &&
    /^[A-Za-z0-9_-]{43}$/.test(configuracao.token);
}

ipcMain.handle('inventario:status-credencial', async event => {
  exigirRemetenteConfiavel(event);

  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    return {
      armazenamentoDisponivel: false,
      credencialConfigurada: false,
      equipamentoId: null,
    };
  }

  try {
    const arquivo = await readFile(caminhoCredencial());
    const { result } = await safeStorage.decryptStringAsync(arquivo);

    let configuracao;
    try {
      configuracao = JSON.parse(result);
    } catch {
      return {
        armazenamentoDisponivel: true,
        credencialConfigurada: false,
        equipamentoId: null,
      };
    }

    const configurada = configuracaoCredencialValida(configuracao);

    return {
      armazenamentoDisponivel: true,
      credencialConfigurada: configurada,
      equipamentoId: configurada
        ? Number(configuracao.equipamentoId)
        : null,
    };
  } catch (erro) {
    if (erro.code === 'ENOENT') {
      return {
        armazenamentoDisponivel: true,
        credencialConfigurada: false,
        equipamentoId: null,
      };
    }

    throw new Error('Não foi possível ler a credencial salva.');
  }
});

ipcMain.handle('inventario:salvar-credencial', async (event, configuracao) => {
  exigirRemetenteConfiavel(event);

  if (!configuracaoCredencialValida(configuracao)) {
    throw new Error('Informe um ID de equipamento e um token válidos.');
  }

  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new Error('O armazenamento seguro não está disponível.');
  }

  const diretorio = app.getPath('userData');
  const destino = caminhoCredencial();
  const temporario = `${destino}.tmp`;
  const conteudo = JSON.stringify(configuracao);
  const arquivoCriptografado = await safeStorage.encryptStringAsync(conteudo);

  await mkdir(diretorio, { recursive: true });
  await writeFile(temporario, arquivoCriptografado);
  await rename(temporario, destino);

  return { ok: true };
});

async function lerConfiguracaoCredencial() {
  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new Error('Armazenamento seguro indisponível.');
  }

  const arquivo = await readFile(caminhoCredencial());
  const { result } = await safeStorage.decryptStringAsync(arquivo);

  let configuracao;
  try {
    configuracao = JSON.parse(result);
  } catch {
    throw new Error('A configuração salva está inválida.');
  }

  if (!configuracaoCredencialValida(configuracao)) {
    throw new Error('Configure novamente o dispositivo.');
  }

  return configuracao;
}

const camposColetaPermitidos = new Set([
  'nome_computador',
  'ram_gb',
  'sistema_operacional',
  'ipv4',
  'fabricante',
  'modelo',
  'numero_serie',
  'processador',
  'versao_so',
  'tipo_chave',
  'status_licenca',
  'interface_rede',
  'status_rede',
  'velocidade_rede',
  'anydesk_id',
  'office_produtos',
  'office_ids',
]);

function prepararDadosColeta(inventario) {
  if (
    inventario === null ||
    typeof inventario !== 'object' ||
    Array.isArray(inventario)
  ) {
    throw new Error('O coletor não retornou um objeto JSON.');
  }

  const dados = Object.fromEntries(
    Object.entries(inventario)
      .filter(([campo]) => camposColetaPermitidos.has(campo))
  );

  const obrigatorios = [
    'nome_computador',
    'ram_gb',
    'sistema_operacional',
  ];

  if (obrigatorios.some(campo => !Object.hasOwn(dados, campo))) {
    throw new Error('O JSON do coletor não contém os campos obrigatórios.');
  }

  if (!Object.hasOwn(dados, 'ipv4')) {
    dados.ipv4 = null;
  }

  return dados;
}

ipcMain.handle('inventario:executar-coleta', async event => {
  exigirRemetenteConfiavel(event);

  if (process.platform !== 'win32') {
    return { ok: false, mensagem: 'O coletor funciona somente no Windows.' };
  }

  let configuracao;
  try {
    configuracao = await lerConfiguracaoCredencial();
  } catch {
    return { ok: false, mensagem: 'A credencial do dispositivo não está disponível.' };
  }

  try {
    const respostaSaude = await fetch(
      'http://127.0.0.1:3000/saude/banco',
      { signal: AbortSignal.timeout(3000) }
    );

    if (!respostaSaude.ok) {
      return {
        ok: false,
        apiDisponivel: false,
        mensagem: 'API ou banco indisponível; a coleta não foi iniciada.',
        mensagemApi: 'A API respondeu, mas o banco está indisponível.',
      };
    }

    const saude = await respostaSaude.json();

    if (saude.status !== 'ok' || saude.banco !== 'disponivel') {
      return {
        ok: false,
        apiDisponivel: false,
        mensagem: 'API ou banco indisponível; a coleta não foi iniciada.',
        mensagemApi: 'A API respondeu, mas o banco está indisponível.',
      };
    }
  } catch {
    return {
      ok: false,
      apiDisponivel: false,
      mensagem: 'API indisponível; a coleta não foi iniciada.',
      mensagemApi: 'API indisponível. Confira se está iniciada.',
    };
  }

  const caminhoScript = app.isPackaged
    ? path.join(process.resourcesPath, 'InventarioTI.ps1')
    : path.resolve(app.getAppPath(), '..', 'InventarioTI.ps1');

  let stdout;
  try {
    ({ stdout } = await executarArquivo(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-File',
        caminhoScript,
        '-Json',
      ],
      {
        windowsHide: true,
        timeout: 120000,
        maxBuffer: 5 * 1024 * 1024,
      }
    ));
  } catch (erro) {
    const codigo = erro.code ?? erro.signal ?? 'desconhecido';
    const codigoSaida = Number.isInteger(erro.code) ? erro.code : null;

    console.error('Falha ao executar o coletor:', {
      codigo,
      codigoSaida,
      stderr: String(erro.stderr ?? '').slice(0, 2000),
    });

    return {
      ok: false,
      mensagem: `O coletor falhou (código ${codigo}); a coleta não foi enviada.`,
    };
  }
  let inventario;
  try {
    inventario = JSON.parse(stdout.trim().replace(/^\uFEFF/, ''));
  } catch {
    return { ok: false, mensagem: 'O coletor não retornou JSON válido.' };
  }

  let dados;
  try {
    dados = prepararDadosColeta(inventario);
  } catch (erro) {
    return { ok: false, mensagem: erro.message };
  }

  let resposta;
  try {
    resposta = await fetch(
      `http://127.0.0.1:3000/equipamentos/${configuracao.equipamentoId}/coletas`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${configuracao.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
      }
    );
  } catch {
    return {
      ok: false,
      apiDisponivel: false,
      mensagem: 'API indisponível; a coleta não foi enviada.',
      mensagemApi: 'API indisponível. Confira se está iniciada.',
    };
  }

  let resultado;
  try {
    resultado = await resposta.json();
  } catch {
    resultado = null;
  }

  if (!resposta.ok) {
    return {
      ok: false,
      mensagem: resultado?.erro ?? `A API respondeu com HTTP ${resposta.status}.`,
      ...(resposta.status >= 500
        ? {
            apiDisponivel: false,
            mensagemApi: resultado?.erro ?? `A API respondeu com HTTP ${resposta.status}.`,
          }
        : {}),
    };
  }

  return {
    ok: true,
    coletaId: resultado.id,
    nomeComputador: resultado.nome_computador,
    mensagem: `Coleta ${resultado.id} enviada para a API.`,
  };
});

ipcMain.handle('inventario:verificar-api', async event => {
  exigirRemetenteConfiavel(event);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const resposta = await fetch('http://127.0.0.1:3000/saude/banco', {
      signal: controller.signal,
    });

    if (!resposta.ok) {
      return {
        ok: false,
        mensagem: resposta.status === 503
          ? 'A API respondeu, mas o banco está indisponível.'
          : `A API respondeu com HTTP ${resposta.status}.`,
      };
    }

    const dados = await resposta.json();

    return dados.status === 'ok' && dados.banco === 'disponivel'
      ? { ok: true, mensagem: 'API e banco disponíveis em 127.0.0.1:3000.' }
      : { ok: false, mensagem: 'A API respondeu, mas o banco está indisponível.' };
  } catch {
    return { ok: false, mensagem: 'API indisponível. Confira se está iniciada.' };
  } finally {
    clearTimeout(timeout);
  }
});

const createWindow = () => {
  // Cria a janela do aplicativo.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Carrega a página principal do aplicativo.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Abre as ferramentas de desenvolvedor somente durante o desenvolvimento.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

// Aguarda a inicialização do Electron antes de criar as janelas.
app.whenReady().then(() => {
  createWindow();

  // No macOS, recria a janela quando o ícone do aplicativo é acionado
  // e não há nenhuma janela aberta.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Encerra o aplicativo quando todas as janelas forem fechadas,
// exceto no macOS, onde ele pode continuar ativo no Dock.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
