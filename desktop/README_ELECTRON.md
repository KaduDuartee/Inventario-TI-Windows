# Aplicativo desktop (Electron)

Aplicativo Windows, feito com Electron Forge e Webpack, que executa o coletor `InventarioTI.ps1` com o parâmetro `-Json` e envia a coleta à [API](../api/README.md).

Visão geral do projeto: [README principal](../README.md).

> **Uso local.** O aplicativo foi validado apenas contra uma API local. O endereço de um servidor remoto ainda não está configurado nem foi testado. Não substitua o endereço local por um endereço público antes de planejar e testar uma implantação segura (HTTPS, MySQL em rede privada).

## Como funciona

1. O processo principal executa o coletor com `-Json` e recebe a coleta.
2. O aplicativo envia os dados à API usando o **token do dispositivo**, protegido no sistema operacional com `safeStorage`.
3. A API valida a credencial, confere o vínculo com o equipamento e grava a coleta no MySQL.

O token administrativo não existe no aplicativo e nunca deve ser incluído nele.

<!-- VERIFICAR: descrever como o token do dispositivo é informado ao aplicativo na primeira execução (tela, arquivo ou outro meio). -->

## Estrutura

```text
desktop/
  src/
    main.js       processo principal e IPC
    preload.js    API mínima exposta ao renderer
    renderer.js   controle da interface
    index.html    estrutura da interface
    index.css     apresentação
```

## Requisitos

- Windows;
- Node.js e npm;
- API e MySQL ativos, para enviar coletas (veja [api/README.md](../api/README.md)).

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
