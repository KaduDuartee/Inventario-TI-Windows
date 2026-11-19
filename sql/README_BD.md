# Banco de dados (MySQL)

Esta pasta contém as migrações do banco MySQL usado pela [API](../api/README.md) e dados fictícios para reproduzir um ambiente local de desenvolvimento e demonstração do Inventário TI.

Visão geral do projeto: [README principal](../README.md).

## Arquivos

| Arquivo | Função |
| --- | --- |
| `001_criar_tabelas.sql` | Cria as tabelas de equipamentos e coletas |
| `002_criar_tabela_dispositivos.sql` | Cria a identidade técnica vinculada a um equipamento e guarda apenas o hash do token |
| `exemplos/001_dados_ficticios.sql` | Cadastra dois equipamentos fictícios e três coletas de demonstração |

<!-- VERIFICAR: listar aqui as migrações seguintes (003 em diante), como as que criam as tabelas de produtos e IDs do Office e os demais campos da coleta. Rode: Get-ChildItem sql -Filter '*.sql' | Sort-Object Name -->

## Como as migrações funcionam

- São aplicadas manualmente, pelo cliente `mysql`, em ordem numérica.
- Cada migração depende das anteriores. Por exemplo, `002` depende da tabela `equipamentos`, criada por `001`.
- Uma migração já aplicada em um banco que você mantém não deve ser editada. Crie uma nova migração.
- No MySQL, comandos como `CREATE TABLE` fazem commit implícito e **não podem ser desfeitos com `ROLLBACK`**. Se ocorrer um erro, investigue antes de continuar. Se precisar recomeçar, descarte apenas um banco de demonstração criado por você para esse fim.

## Requisitos

- MySQL Server em execução;
- cliente de linha de comando `mysql`;
- conta com permissão para criar o banco e as tabelas.

Os arquivos foram testados com MySQL Community Server 8.4.11.

## Conectar ao MySQL

Abra o PowerShell na raiz do repositório, onde está a pasta `sql`.

No Windows, com a instalação padrão do MySQL 8.4:

```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' --host=127.0.0.1 --port=3306 --user=root --password --default-character-set=utf8mb4
```

Digite a senha quando solicitada. Não coloque senhas nos arquivos SQL nem nos commits.

Os comandos seguintes devem ser executados no prompt `mysql>`.

## Criar um banco de demonstração

```sql
CREATE DATABASE inventario_demo
    CHARACTER SET utf8mb4;
```

```sql
USE inventario_demo;
```

Se esse banco já existir, interrompa o procedimento e escolha outro nome para uma demonstração nova. Não apague um banco existente sem verificar seu conteúdo.

O nome escolhido é o valor de `DB_NAME` no `.env` da API.

## Aplicar as migrações

Execute as migrações em ordem numérica, em um banco sem essas tabelas. Para listar os comandos na ordem correta, rode no PowerShell, na raiz do repositório:

```powershell
Get-ChildItem sql -Filter '0*.sql' | Sort-Object Name | ForEach-Object { "SOURCE sql/$($_.Name);" }
```

Execute cada linha exibida no prompt `mysql>`. Por exemplo:

```sql
SOURCE sql/001_criar_tabelas.sql;
```

```sql
SOURCE sql/002_criar_tabela_dispositivos.sql;
```

Depois de aplicar todas, confira:

```sql
SHOW TABLES;
```

O resultado deve incluir `equipamentos`, `coletas`, a tabela de dispositivos e as tabelas criadas pelas migrações seguintes.

Se ocorrer algum erro, interrompa e investigue antes de continuar.

## Carregar os exemplos

Os exemplos são opcionais e servem para demonstração e testes locais. Execute esta etapa somente com as tabelas `equipamentos` e `coletas` vazias:

```sql
SELECT
    (SELECT COUNT(*) FROM equipamentos) AS equipamentos,
    (SELECT COUNT(*) FROM coletas) AS coletas;
```

As duas contagens devem ser zero. Então execute:

```sql
START TRANSACTION;
```

```sql
SOURCE sql/exemplos/001_dados_ficticios.sql;
```

Se aparecer qualquer erro, execute `ROLLBACK;` e interrompa o procedimento. O cliente pode continuar executando instruções do arquivo após uma falha.

Se não houver erros, confira:

```sql
SELECT
    e.codigo_inventario,
    c.data_coleta,
    c.nome_computador,
    c.ram_gb,
    c.sistema_operacional,
    c.ipv4
FROM equipamentos AS e
INNER JOIN coletas AS c
    ON c.equipamento_id = e.id
ORDER BY e.codigo_inventario, c.data_coleta;
```

O resultado esperado tem duas coletas de `EQ-TESTE-001` e uma de `EQ-TESTE-002`.

Se os resultados estiverem corretos, confirme:

```sql
COMMIT;
```

Caso contrário, desfaça:

```sql
ROLLBACK;
```

### Identificar o ID do equipamento

As rotas da API usam o `id` do equipamento na URL (por exemplo, `/equipamentos/1/dispositivo`). Para descobrir o `id` de cada equipamento de demonstração:

```sql
SELECT id, codigo_inventario FROM equipamentos;
```

## Criar uma conta limitada para a API

A API não deve usar `root`. Os arquivos SQL não criam usuários nem concedem permissões, então crie uma conta específica, no prompt `mysql>`, substituindo o texto entre `<` e `>` por uma senha forte:

```sql
CREATE USER 'inventario_api'@'localhost' IDENTIFIED BY '<SENHA_FORTE>';
```

```sql
GRANT SELECT, INSERT, UPDATE ON inventario_demo.* TO 'inventario_api'@'localhost';
```

Use essa conta em `DB_USER` e `DB_PASSWORD` no `.env` da API. Não registre a senha em arquivos versionados, logs ou capturas de tela. Se a API não conseguir autenticar, confira se o host da conta corresponde ao `DB_HOST`. Se ela recusar uma operação por falta de permissão, revise os privilégios concedidos.

<!-- VERIFICAR: confirmar os privilégios mínimos que a API realmente precisa (por exemplo, se alguma rota usa DELETE) e ajustar o GRANT. -->

## Observações

- Todos os dados de exemplo são fictícios.
- O arquivo de exemplos não deve ser executado repetidamente em tabelas já preenchidas.
- Em uma implantação remota, o MySQL deve ficar em rede privada, acessível apenas pela API. Nunca exponha a porta do banco publicamente.
- A restauração de backup do banco ainda não foi testada.
