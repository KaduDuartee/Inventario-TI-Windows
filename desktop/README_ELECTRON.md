# Aplicativo desktop (Electron)

Aplicativo Windows, feito com Electron Forge e Webpack, que executa o coletor `InventarioTI.ps1` com o parâmetro `-Json` e envia a coleta à [API](../api/README_API.md).

Visão geral do projeto: [README principal](../README.md).

> **Uso local e preparo remoto.** O aplicativo foi validado contra a API local (`http://127.0.0.1:3000`). O suporte a endereço remoto configurável já está preparado via `INVENTARIO_API_URL` (exigindo `https://` fora de loopback), aguardando a hospedagem remota para validação ponta a ponta.

## Como funciona

1. Na primeira execução, informe na seção **Vincular este computador** o **ID do equipamento** e o **Token do dispositivo** (43 caracteres) e clique em **Salvar credencial** — os dados ficam protegidos pelo sistema operacional com `safeStorage`.
2. O processo principal verifica `/saude/banco`, executa o coletor com `-Json` e recebe a coleta.
3. O aplicativo envia os dados à API usando o **token do dispositivo**.
4. A API valida a credencial, confere o vínculo com o equipamento e grava a coleta no MySQL.

O token administrativo não existe no aplicativo e nunca deve ser incluído nele.

## Estrutura

```text
desktop/
  src/
    main.js            processo principal e IPC
    configuracaoApi.js validação e seleção da URL base da API
    preload.js         API mínima exposta ao renderer
    renderer.js        controle da interface
    index.html         estrutura da interface
    index.css          apresentação
```

## Requisitos

- Windows;
- Node.js e npm;
- API e MySQL ativos, para enviar coletas (veja [api/README_API.md](../api/README_API.md)).

O coletor acompanha o aplicativo e fica em `resources/InventarioTI.ps1` na instalação.

## Executar em desenvolvimento

Use terminais separados para a API e para o aplicativo. Com a API e o MySQL ativos, na pasta `desktop/`:

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd start
```

## Gerar o instalador

Feche o aplicativo antes e, na pasta `desktop/`, execute:

```powershell
npm.cmd run make -- --platform=win32 --arch=x64
```

Para gerar o instalador apontando para uma API remota (somente `https://` é aceito fora de loopback):

```powershell
$env:INVENTARIO_API_URL = 'https://api.seu-dominio.exemplo'
npm.cmd run make -- --platform=win32 --arch=x64
```

O instalador Windows x64 (Squirrel) é gerado em `desktop/out/`. Essa pasta não é versionada.

### Atualizar uma instalação existente

- Incremente a versão em `package.json` e em `package-lock.json` antes de gerar o novo instalador.
- Confirme, no pacote e na instalação, que existe `resources/InventarioTI.ps1` com esse nome exato, em ASCII. Um nome com acento foi corrompido no pacote Squirrel.

### Antes de distribuir para outras pessoas

- substituir o nome provisório do aplicativo (`desktop`);
- revisar a versão e a identidade do instalador;
- assinar o instalador;
- auditar as dependências do aplicativo (`npm audit`).

## Segurança

- O renderer não tem acesso direto ao Node.js. A comunicação passa por `preload.js` e IPC, com validação do remetente e dos dados recebidos.
- O token do dispositivo é protegido com `safeStorage`. Isso não substitui a revogação e a autorização no servidor.
- O JSON da coleta contém dados reais da máquina: não o cole em chats, issues ou logs.
- Não versione `desktop/.webpack/`, `desktop/out/`, `node_modules/` nem instaladores.

## Estado de validação

**Validado:** coleta enviada à API local por instalador Windows x64, versão 1.0.1.

**Não validado:** conexão com servidor remoto, atualização em outros perfis de usuário e versões do Windows, distribuição assinada, e auditoria completa das dependências do aplicativo.
