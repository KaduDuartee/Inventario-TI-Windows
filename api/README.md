# API do Inventário TI

Esta pasta contém a API em Node.js e Express que acessa o banco MySQL do projeto.

## Autenticação administrativa

As rotas de cadastro e consulta de equipamentos exigem uma credencial administrativa. O arquivo `.env` local deve conter `ADMIN_TOKEN_HASH`, com o hash SHA-256 do token — nunca o token em texto puro.

Não compartilhe nem versione o `.env`, o token administrativo ou seu hash. O token não deve ser embutido no Electron ou em outro código distribuído aos usuários.

## Gerar a credencial administrativa

No PowerShell, dentro da pasta `api`, gere o token e o hash:

```powershell
$credencialAdmin = node --input-type=module -e "import { randomBytes, createHash } from 'node:crypto'; const token = randomBytes(32).toString('base64url'); const hash = createHash('sha256').update(token).digest('hex'); console.log(JSON.stringify({ token, hash }));" | ConvertFrom-Json
$credencialAdmin.hash
```

O comprimento esperado do token é `43`. Copie somente o hash exibido para `ADMIN_TOKEN_HASH` no `.env`. O token fica em `$credencialAdmin.token` apenas nessa sessão do PowerShell; mantenha-a aberta e inicie a API em outro terminal. Se o `.env` mudar enquanto a API estiver rodando, reinicie-a.

Para testar uma rota administrativa na sessão que contém o token:

```powershell
$cabecalhoAdmin = @{ Authorization = "Bearer $($credencialAdmin.token)" }
Invoke-RestMethod -Uri 'http://127.0.0.1:3000/equipamentos' -Headers $cabecalhoAdmin
```

Se perder o token, gere outro, substitua o hash no `.env` e reinicie a API. Não coloque valores reais no README.

## Cadastrar um dispositivo

O cadastro exige a credencial administrativa criada acima. Envie o ID do equipamento e um nome para o dispositivo:

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

Em caso de sucesso, a API responde com HTTP `201`. O token do dispositivo fica em `$respostaDispositivo.token` e é retornado somente nessa resposta; guarde-o em local seguro. O banco armazena apenas o hash SHA-256, portanto não é possível recuperar o token depois. Não o imprima em capturas de tela, não o compartilhe e nunca o versione.

Cada equipamento pode ter somente um dispositivo cadastrado. Uma nova tentativa para um equipamento que já tenha dispositivo retorna HTTP `409`; ela não recupera nem substitui o token existente.

## Enviar uma coleta

Use o token do dispositivo cadastrado para enviar uma coleta. O ID na URL precisa ser o mesmo equipamento ao qual o token está vinculado:

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

Envie `nome_computador` e `sistema_operacional` como textos não vazios, e `ram_gb` como número positivo com no máximo duas casas decimais. `ipv4` é opcional; quando informado, deve ser um endereço IPv4 válido ou `null`. A API também rejeita campos extras e corpos JSON acima de 10 KB.

Uma resposta HTTP `201` confirma que a coleta foi registrada. O token de dispositivo só pode enviar coletas ao equipamento vinculado: uma tentativa para outro ID retorna HTTP `403` e não grava a coleta. Credencial ausente, inválida ou inativa retorna `401`; dados inválidos retornam `400`; equipamento inexistente retorna `404`.

## Configuração e execução local

1. Crie o arquivo `.env` a partir de `.env.example`, sem substituir um `.env` que já exista.
2. No `.env`, configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` conforme seu MySQL local.
3. Defina `ADMIN_TOKEN_HASH` com o hash SHA-256 de um token administrativo aleatório. Guarde o token em local seguro; não o inclua no código do Electron.
4. No terminal, dentro desta pasta, instale as dependências e inicie a API:

   ```powershell
   npm.cmd install
   npm.cmd start
   ```

A API atual escuta em `127.0.0.1:3000` e destina-se a testes locais. Não a exponha à rede ou à internet; a implantação remota exige uma revisão adicional de segurança.
