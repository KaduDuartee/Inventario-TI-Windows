import './index.css';

const botaoApi = document.querySelector('#verificar-api');
const estadoApi = document.querySelector('#estado-api');
const estadoGeral = document.querySelector('#estado-geral');
const pontoApi = document.querySelector('.status-item .status-ponto');

const formulario = document.querySelector('#form-credencial');
const campoEquipamento = document.querySelector('#equipamento-id');
const campoToken = document.querySelector('#token-dispositivo');
const botaoSalvar = document.querySelector('#salvar-credencial');
const estadoDispositivo = document.querySelector('#estado-dispositivo');
const pontoDispositivo = document.querySelector('#ponto-dispositivo');
const mensagemCredencial = document.querySelector('#mensagem-credencial');

const botaoColeta = document.querySelector('#coletar-inventario');
const resultadoColeta = document.querySelector('#resultado-coleta');

let apiDisponivel = false;
let credencialConfigurada = false;
let coletaEmAndamento = false;
let equipamentoConfiguradoId = null;

function atualizarEstadoApi(disponivel, mensagem) {
  apiDisponivel = disponivel;
  estadoApi.textContent = mensagem;
  estadoGeral.textContent = disponivel
    ? 'API e banco disponíveis'
    : 'Conexão indisponível';
  pontoApi.classList.toggle('status-ok', disponivel);
  atualizarBotaoColeta();
}

function atualizarBotaoColeta() {
  const idDigitado = Number(campoEquipamento.value);
  const configuracaoPendente =
    credencialConfigurada &&
    (
      !Number.isSafeInteger(idDigitado) ||
      idDigitado !== equipamentoConfiguradoId ||
      campoToken.value.trim().length > 0
    );

  botaoColeta.disabled =
    !apiDisponivel ||
    !credencialConfigurada ||
    coletaEmAndamento ||
    configuracaoPendente;

  if (configuracaoPendente) {
    resultadoColeta.textContent =
      'Salve as alterações da credencial antes de coletar.';
  } else if (
    resultadoColeta.textContent ===
    'Salve as alterações da credencial antes de coletar.'
  ) {
    resultadoColeta.textContent = '';
  }
}

async function verificarApi() {
  botaoApi.disabled = true;
  botaoApi.textContent = 'Verificando...';
  estadoApi.textContent = 'Consultando a API local...';

  try {
    const resultado = await window.inventarioTI.verificarApi();
    atualizarEstadoApi(resultado.ok, resultado.mensagem);
  } catch {
    atualizarEstadoApi(
      false,
      'Não foi possível consultar o status da API e do banco.'
    );
  } finally {
    botaoApi.disabled = false;
    botaoApi.textContent = 'Verificar conexão';
    atualizarBotaoColeta();
  }
}

botaoApi.addEventListener('click', verificarApi);

campoEquipamento.addEventListener('input', atualizarBotaoColeta);
campoToken.addEventListener('input', atualizarBotaoColeta);

async function atualizarEstadoCredencial() {
  try {
    const resultado = await window.inventarioTI.verificarCredencial();
    const id = resultado.equipamentoId;

    const configuracaoValida =
      resultado.armazenamentoDisponivel &&
      resultado.credencialConfigurada &&
      Number.isSafeInteger(id) &&
      id >= 1 &&
      id <= 4294967295;

    credencialConfigurada = configuracaoValida;
    equipamentoConfiguradoId = configuracaoValida ? id : null;

    if (configuracaoValida) {
      campoEquipamento.value = String(id);
      estadoDispositivo.textContent =
        `Credencial configurada para o equipamento ${id}.`;
    } else {
      estadoDispositivo.textContent =
        'Configuração do dispositivo incompleta.';
    }

    pontoDispositivo.classList.toggle('status-ok', configuracaoValida);
  } catch {
    credencialConfigurada = false;
    equipamentoConfiguradoId = null;
    estadoDispositivo.textContent = 'Não foi possível verificar a credencial.';
    pontoDispositivo.classList.remove('status-ok');
  } finally {
    atualizarBotaoColeta();
  }
}

formulario.addEventListener('submit', async evento => {
  evento.preventDefault();

  const equipamentoId = Number(campoEquipamento.value);
  const token = campoToken.value.trim();

  if (
    !Number.isSafeInteger(equipamentoId) ||
    equipamentoId < 1 ||
    equipamentoId > 4294967295 ||
    !/^[A-Za-z0-9_-]{43}$/.test(token)
  ) {
    mensagemCredencial.textContent = 'Confira o ID e o token informados.';
    return;
  }

  botaoSalvar.disabled = true;
  botaoSalvar.textContent = 'Salvando...';
  mensagemCredencial.textContent = '';

  try {
    await window.inventarioTI.salvarCredencial({ equipamentoId, token });
    campoToken.value = '';
    mensagemCredencial.textContent =
      'Credencial salva com proteção do sistema operacional.';
    await atualizarEstadoCredencial();
  } catch (erro) {
    mensagemCredencial.textContent =
      erro.message || 'Não foi possível salvar a credencial.';
  } finally {
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = 'Salvar credencial';
    atualizarBotaoColeta();
  }
});

botaoColeta.addEventListener('click', async () => {
  coletaEmAndamento = true;
  resultadoColeta.textContent = 'Coletando e enviando inventário...';
  atualizarBotaoColeta();

  try {
    const resultado = await window.inventarioTI.executarColeta();
    if (resultado.apiDisponivel === false) {
      atualizarEstadoApi(
        false,
        resultado.mensagemApi ?? 'API ou banco indisponível.'
      );
    }
    resultadoColeta.textContent = resultado.mensagem;
  } catch {
    resultadoColeta.textContent = 'Não foi possível executar a coleta.';
  } finally {
    coletaEmAndamento = false;
    atualizarBotaoColeta();
  }
});

atualizarEstadoCredencial();
