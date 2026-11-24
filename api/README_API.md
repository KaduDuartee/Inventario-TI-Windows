# API do Inventário TI

API em Node.js e Express que recebe as coletas do inventário e as grava no banco MySQL do projeto. Usa `mysql2/promise`, sem ORM.

Visão geral do projeto: [README principal](../README.md).

> **Uso local.** A API atual escuta apenas em `127.0.0.1:3000` e destina-se a desenvolvimento e testes. Não a exponha à rede ou à internet: a implantação remota exige HTTPS com certificado válido, MySQL em rede privada e uma revisão adicional de segurança.

## Requisitos

- Node.js (testado com v24.21.0) e npm;
- MySQL 8.4 ativo (testado com 8.4.11), com as migrações de [`sql/`](../sql/README_BD.md) aplicadas;
- uma conta MySQL com permissões limitadas, não `root` (veja [sql/README_BD.md](../sql/README_BD.md#criar-uma-conta-limitada-para-a-api)).

## Estrutura

```text
api/
  src/
    server.js              inicia o serviço
    configuracao.js        lê e valida variáveis de ambiente
    aplicacao.js           monta middlewares e rotas
    banco.js               cria o pool MySQL
    rotas/equipamentos.js  rotas de equipamentos, dispositivos e coletas
    middleware/            autenticação
    seguranca/             regras de vínculo entre credencial e equipamento
  test/                    testes automatizados
  .env.example             modelo de configuração
```

## Configuração e execução local

1. Crie o arquivo `.env` a partir de `.env.example`, sem substituir um `.env` que já exista:

   ```powershell
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   ```

2. No `.env`, configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` conforme o seu MySQL local. As variáveis opcionais `HOST` (padrão `127.0.0.1`), `PORT` (padrão `3000`), `TRUST_PROXY` (padrão `false`) e `DB_SSL` (padrão `false`) permitem ajustar a API para ambiente remoto atrás de proxy reverso.
3. Defina `ADMIN_TOKEN_HASH` com o hash SHA-256 de um token administrativo aleatório, como descrito em [Gerar a credencial administrativa](#gerar-a-credencial-administrativa).
4. Aplique as migrações do banco, seguindo [`sql/README_BD.md`](../sql/README_BD.md).
5. Dentro da pasta `api/`, instale as dependências e inicie a API:

   ```powershell
   npm.cmd ci
   npm.cmd start
   ```

Se o `.env` mudar enquanto a API estiver rodando, reinicie-a. Nunca versione o `.env`.

### Verificar se está funcionando

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:3000/saude'
Invoke-RestMethod -Uri 'http://127.0.0.1:3000/saude/banco'
```

`/saude` verifica se a API responde; `/saude/banco` verifica também a conexão com o banco.

## Testes

```powershell
npm.cmd test
npm.cmd run test:db
```

- `npm.cmd test` executa os testes automatizados da API (autenticação, credenciais, coleta, dispositivos e vínculo).
- `npm.cmd run test:db` testa a conexão real e exige MySQL ativo e um `.env` válido.

## Autenticação

A API usa duas credenciais distintas:

| Credencial | Quem usa | Como é guardada | O que permite |
| --- | --- | --- | --- |
| Token administrativo | Administrador | Hash SHA-256 em `ADMIN_TOKEN_HASH`, no `.env` do servidor | Consultar equipamentos e cadastrar dispositivos |
| Token de dispositivo | Um equipamento | Somente o hash, no banco | Enviar coletas do equipamento ao qual está vinculado |

O token administrativo nunca deve ser embutido no aplicativo desktop, no coletor ou em qualquer código distribuído aos usuários. Não compartilhe nem versione o `.env`, o token ou o seu hash.

### Gerar a credencial administrativa

No PowerShell, dentro da pasta `api/`, gere o token e o hash:

```powershell
$credencialAdmin = node --input-type=module -e "import { randomBytes, createHash } from 'node:crypto'; const token = randomBytes(32).toString('base64url'); const hash = createHash('sha256').update(token).digest('hex'); console.log(JSON.stringify({ token, hash }));" | ConvertFrom-Json
$credencialAdmin.hash
```

O comprimento esperado do token é `43`. Copie somente o hash exibido para `ADMIN_TOKEN_HASH` no `.env`. O token fica em `$credencialAdmin.token` apenas nessa sessão do PowerShell: mantenha-a aberta e inicie a API em outro terminal.

Se perder o token, gere outro, substitua o hash no `.env` e reinicie a API.

Para testar uma rota administrativa na sessão que contém o token:

```powershell
$cabecalhoAdmin = @{ Authorization = "Bearer $($credencialAdmin.token)" }
Invoke-RestMethod -Uri 'http://127.0.0.1:3000/equipamentos' -Headers $cabecalhoAdmin
```

## Rotas

| Método | Rota | Credencial | Função |
| --- | --- | --- | --- |
| `POST` | `/equipamentos` | Administrativa | Cadastra um equipamento |
| `GET` | `/equipamentos` | Administrativa | Lista até 100 equipamentos |
| `GET` | `/equipamentos/:id` | Administrativa | Consulta um equipamento pelo ID |
| `GET` | `/equipamentos/:id/coletas` | Administrativa | Consulta até 100 coletas recentes |
| `POST` | `/equipamentos/:id/dispositivo` | Administrativa | Cadastra o dispositivo de um equipamento |
| `DELETE` | `/equipamentos/:id/dispositivo` | Administrativa | Revoga o dispositivo ativo do equipamento |
| `POST` | `/equipamentos/:id/dispositivo/rotacionar` | Administrativa | Gera novo token e reativa o dispositivo |
| `POST` | `/equipamentos/:id/coletas` | Do dispositivo | Registra uma coleta |

As rotas de saúde (`/saude` e `/saude/banco`) estão descritas em [Verificar se está funcionando](#verificar-se-está-funcionando).

### Cadastrar um dispositivo

O cadastro exige a credencial administrativa. O ID do equipamento vai na URL, e o corpo leva apenas o nome do dispositivo:

```powershell
$corpoDispositivo = @{
    nome_dispositivo = 'PC-TESTE-001'
} | ConvertTo-Json -Compress

$respostaDispositivo = Invoke-RestMethod `
    -Uri 'http://127.0.0.1:3000/equipamentos/1/dispositivo' `
    -Method Post `
    -Headers $cabecalhoAdmin `
    -ContentType 'application/json' `
    -Body $corpoDispositivo

$respostaDispositivo.dispositivo
```

Em caso de sucesso, a API responde com HTTP `201`. O token do dispositivo fica em `$respostaDispositivo.token` e é retornado **somente nessa resposta**: guarde-o em local seguro. O banco armazena apenas o hash SHA-256, portanto o token não pode ser recuperado depois. Não o imprima em capturas de tela, não o compartilhe e nunca o versione.

Cada equipamento pode ter somente um dispositivo cadastrado. Uma nova tentativa para um equipamento que já tenha dispositivo retorna HTTP `409`; ela não recupera nem substitui o token existente.

### Revogar ou rotacionar um dispositivo

Ambas as operações exigem a credencial administrativa:

- **Revogar (`DELETE /equipamentos/:id/dispositivo`):** marca `ativo = FALSE` no banco e retorna HTTP `204`.
- **Rotacionar (`POST /equipamentos/:id/dispositivo/rotacionar`):** gera um novo token aleatório, substitui `token_hash`, reativa o dispositivo (`ativo = TRUE`) e retorna HTTP `200` com o novo `token` uma única vez (com `Cache-Control: no-store`).

```powershell
# Revogar dispositivo ativo do equipamento 1
Invoke-RestMethod -Uri 'http://127.0.0.1:3000/equipamentos/1/dispositivo' -Method Delete -Headers $cabecalhoAdmin

# Rotacionar credencial do equipamento 1
$rotacao = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/equipamentos/1/dispositivo/rotacionar' -Method Post -Headers $cabecalhoAdmin
```

### Enviar uma coleta

Use o token do dispositivo cadastrado. O ID na URL precisa ser o do equipamento ao qual o token está vinculado:

```powershell
$cabecalhoDispositivo = @{
    Authorization = "Bearer $($respostaDispositivo.token)"
}

$corpoColeta = @{
    nome_computador     = 'PC-TESTE-001'
    ram_gb              = 16
    sistema_operacional = 'Windows 11 Pro'
    ipv4                = '192.0.2.10'
} | ConvertTo-Json -Compress

$respostaColeta = Invoke-RestMethod `
    -Uri 'http://127.0.0.1:3000/equipamentos/1/coletas' `
    -Method Post `
    -Headers $cabecalhoDispositivo `
    -ContentType 'application/json' `
    -Body $corpoColeta

$respostaColeta
```

| Campo | Obrigatório | Regra |
| --- | --- | --- |
| `nome_computador` | Sim | Texto não vazio, até 100 caracteres |
| `sistema_operacional` | Sim | Texto não vazio, até 150 caracteres |
| `ram_gb` | Sim | Número positivo até `99999999.99`, com no máximo duas casas decimais |
| `ipv4` | Não | Endereço IPv4 válido ou `null` |
| `fabricante`, `modelo`, `numero_serie`, `interface_rede` | Não | Texto ou `null`, até 100 caracteres cada |
| `processador` | Não | Texto ou `null`, até 255 caracteres |
| `versao_so`, `tipo_chave`, `anydesk_id` | Não | Texto ou `null`, até 50 caracteres cada |
| `status_licenca` | Não | Texto ou `null`, até 60 caracteres |
| `status_rede`, `velocidade_rede` | Não | Texto ou `null`, até 30 caracteres cada |
| `office_produtos` | Não | Lista com até 50 objetos (`nome_produto` até 150 chars; opcionais `id_produto`, `versao`, `arquitetura`, `tipo_instalacao`) |
| `office_ids` | Não | Lista com até 50 IDs ASCII sem espaços (1 a 100 caracteres cada) |

A API rejeita campos não previstos e corpos JSON acima de `10 KB`. Em caso de dados inválidos, nada é gravado.

## Códigos de resposta

| Código | Significado |
| --- | --- |
| `201` | Dispositivo cadastrado ou coleta registrada |
| `400` | Dados inválidos |
| `401` | Credencial ausente, inválida ou inativa |
| `403` | O token de dispositivo pertence a outro equipamento; a coleta não é gravada |
| `404` | Equipamento inexistente |
| `409` | O equipamento já tem um dispositivo cadastrado |

## Segurança

- Consultas SQL parametrizadas, sem ORM.
- A gravação da coleta e dos registros relacionados é transacional.
- A credencial ativa e o vínculo do dispositivo são revalidados no momento da gravação.
- O banco guarda somente o hash do token de dispositivo.
- A API não confia em cabeçalhos de proxy enviados por clientes. Configure um proxy confiável somente quando houver um proxy conhecido e controlado.
- Para implantação remota: HTTPS com certificado válido e MySQL em rede privada, acessível apenas pela API. Nunca exponha a porta do banco publicamente.
