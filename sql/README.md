# Banco de dados — ambiente de estudos

Esta pasta contém a estrutura inicial do banco MySQL e dados fictícios para reproduzir um ambiente local de desenvolvimento e demonstração do Inventário TI.

O script PowerShell ainda exporta para CSV e não está integrado ao banco.

## Arquivos

- `001_criar_tabelas.sql`: cria as tabelas de equipamentos e coletas.
- `exemplos/001_dados_ficticios.sql`: cadastra dois equipamentos fictícios e três coletas de demonstração.

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

## Criar as tabelas

```sql
SOURCE sql/001_criar_tabelas.sql;
```

```sql
SHOW TABLES;
```

O resultado esperado contém `equipamentos` e `coletas`.

O arquivo deve ser executado em um banco sem essas tabelas. Se ocorrer algum erro, investigue antes de continuar: comandos de criação de tabelas não são desfeitos como as inserções do exercício com `ROLLBACK`.

## Carregar os exemplos

Execute esta etapa somente com as duas tabelas vazias.

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

## Observações

- Todos os dados de exemplo são fictícios.
- Os arquivos SQL não criam usuários nem concedem permissões.
- A futura API deverá usar uma conta com permissões limitadas, não `root`.
- O arquivo de exemplos não deve ser executado repetidamente em tabelas já preenchidas.
- Esta estrutura é inicial e ainda não representa todos os campos coletados pelo inventário.
