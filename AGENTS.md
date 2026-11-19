# Instruções para agentes de IA

Estas instruções orientam assistentes e agentes de IA (como Antigravity, Codex e similares) que trabalhem neste repositório.

## Antes de começar

- Confira a branch atual e o estado do diretório com `git status --short --branch`; preserve alterações preexistentes não relacionadas à tarefa.
- Leia o README relevante antes de alterar uma área: `README.md` para a visão geral, `api/README.md` para o backend e `sql/README.md` para o esquema do banco.
- Caso existam arquivos locais de contexto privado (como `AGENTS.private.md` ou `AI_CONTEXT.private.md`, ignorados pelo Git), leia-os apenas como referência local e **nunca** copie credenciais, tokens, hashes, hosts privados ou dados reais de máquinas para arquivos versionados, logs ou respostas.
- Explique mudanças relevantes antes ou ao concluir a tarefa. Não faça `commit`, `push`, publicação ou implantação sem pedido explícito.

## Estrutura do repositório

- `InventarioTI.ps1`: coletor Windows em PowerShell. Mantém a exportação em CSV e oferece a flag `-Json` para integração. O nome do arquivo utiliza apenas caracteres ASCII para evitar corrupção no empacotamento Squirrel.
- `api/`: API REST em Node.js/Express.
  - `src/server.js`: ponto de entrada que inicia o serviço HTTP.
  - `src/aplicacao.js`: configuração de middlewares e registro de rotas.
  - `src/rotas/equipamentos.js`: endpoints de inventário e coleta.
  - `src/middleware/` e `src/seguranca/`: autenticação, controle de acesso e regras de vínculo de dispositivos.
- `api/test/`: suíte de testes automatizados (autenticação, credenciais, coleta, dispositivos e vínculo).
- `desktop/`: aplicativo desktop em Electron (Electron Forge + Webpack).
  - `src/main.js`: processo principal e handlers IPC.
  - `src/preload.js`: ponte segura com exposição mínima de APIs.
  - `src/renderer.js`, `src/index.html` e `src/index.css`: lógica e interface visual.
- `sql/`: scripts e migrações versionadas para MySQL (a API usa `mysql2/promise` diretamente, sem ORM).

## Convenções e segurança

### PowerShell (`InventarioTI.ps1`)

- Preserve compatibilidade estrita com **Windows PowerShell 5.1**; não introduza sintaxes ou cmdlets exclusivos do PowerShell 7+ sem requisito explícito.
- Prefira consultas estruturadas (CIM/WMI, Registro do Windows ou APIs nativas) em vez de fazer parse de saídas textuais dependentes de idioma.
- Trate falhas de coleta por componente para que o erro em um item não interrompa o inventário inteiro.
- No modo `-Json`, a saída padrão (`stdout`) deve conter **apenas JSON válido** — nunca emita banners, mensagens de progresso ou avisos de CSV nesse fluxo.
- Nunca colete, envie ou registre a chave de produto completa do Windows ou credenciais locais.

### API e Banco de Dados (`api/` e `sql/`)

- Utilize exclusivamente consultas SQL parametrizadas.
- Operações de coleta e registros vinculados devem ser transacionais, revalidando a credencial ativa e o vínculo do dispositivo no momento da gravação.
- Mantenha a separação entre **token administrativo** e **token de dispositivo**:
  - Nunca inclua o token administrativo no aplicativo Electron, no coletor PowerShell ou em arquivos versionados.
  - A API valida o token administrativo via `ADMIN_TOKEN_HASH` configurado por variável de ambiente; nunca exiba ou registre tokens ou hashes em logs.
  - O banco de dados deve armazenar apenas o hash do token de dispositivo.
- Em desenvolvimento, mantenha a API restrita a `loopback` (`127.0.0.1` / `localhost`). Não altere bind, firewall ou configurações de rede para expor o serviço externamente sem solicitação explícita.
- Para cenários de produção/implantação remota, considere como requisito obrigatório o uso de HTTPS com certificado válido e MySQL em rede privada acessível apenas pela API (nunca exposto diretamente).
- Não confie em cabeçalhos de proxy enviados por clientes; configure `trust proxy` apenas quando houver proxy reverso conhecido e controlado.

### Electron (`desktop/`)

- Preserve o isolamento de contexto do `renderer`: sem acesso direto ao Node.js no frontend; toda comunicação deve passar por `preload.js` e canais IPC validados no processo principal.
- O armazenamento local do token de dispositivo via `safeStorage` protege a credencial em repouso no sistema operacional, mas não substitui a validação e revogação no backend.

### Padrões gerais e Git

- Escreva novos comentários, mensagens de interface e documentação em **português**, mantendo em inglês apenas identificadores públicos de API, nomes de pacotes ou contratos já estabelecidos.
- Nunca versione `.env`, arquivos CSV de inventário, dados reais de máquinas, logs, `node_modules/`, `desktop/.webpack/`, `desktop/out/` ou instaladores gerados.
- Nunca desative validações de segurança ou regras de negócio para fazer um teste passar.

## Comandos locais

Utilize terminais separados para API e Electron. A API exige MySQL ativo e `api/.env` configurado a partir de `api/.env.example` (nunca sobrescreva um `.env` existente).

### API (executar em `api/`)

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run test:db
npm.cmd start
```

- `npm.cmd test`: executa os testes automatizados sem depender do banco ativo.
- `npm.cmd run test:db`: valida a integração real com o MySQL configurado localmente.
- Endpoints de verificação: `/saude` (status HTTP da API) e `/saude/banco` (conectividade com o MySQL).

### Electron (executar em `desktop/`, com API e MySQL ativos)

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd start
```

Para empacotar o instalador Windows x64 (feche o aplicativo antes de rodar):

```powershell
npm.cmd run make -- --platform=win32 --arch=x64
```

Ao atualizar versões do instalador Squirrel, atualize a versão em `desktop/package.json` e `desktop/package-lock.json`, garantindo que `resources/InventarioTI.ps1` seja empacotado com o nome ASCII exato.

### Coletor

- Executar `InventarioTI.ps1` lê dados reais do hardware e sistema operacional da máquina local; execute-o apenas quando a tarefa exigir validação prática e nunca cole o JSON completo com dados reais em chats ou logs.

## Revisão antes de concluir

- Execute `git diff --check` e rode os testes pertinentes às áreas modificadas (`npm.cmd test`, `npm.cmd run lint`, etc.).
- Revise o `git diff` completo para garantir que não há credenciais, dados reais de inventário, artefatos de build ou alterações fora do escopo.
- Relate claramente os comandos executados e seus resultados, sem afirmar validação de cenários que não foram testados (como hospedagem remota, HTTPS em produção ou distribuição assinada).
