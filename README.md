# Inventário TI para Windows

Script desenvolvido em PowerShell para coletar informações de inventário de computadores Windows e registrar os resultados em um arquivo CSV.

Este projeto foi criado para estudo e portfólio, com foco em PowerShell, tratamento de erros, compatibilidade e segurança de dados.

Além do caráter educacional, o script é utilizado internamente, em ambiente autorizado de uma empresa de pequeno porte, como apoio ao controle de ativos e dispositivos Windows. Dados reais desse ambiente não fazem parte do repositório.

## Funcionalidades

O script coleta:

- nome do computador;
- fabricante e modelo;
- número de série;
- processador e memória RAM;
- sistema operacional e versão;
- tipo e status da licença do Windows;
- últimos cinco caracteres da chave instalada;
- interface de rede principal;
- endereço IPv4;
- status e velocidade do adaptador;
- produtos Microsoft Office instalados;
- versão, arquitetura e tipo de instalação do Office;
- ID do AnyDesk, quando disponível;
- data e hora da coleta.

## Requisitos

- Sistema operacional Windows;
- PowerShell 5.1 ou superior;
- acesso de leitura às informações CIM, Registro e arquivos consultados.

Privilégios administrativos normalmente não são necessários, mas algumas informações podem variar conforme as permissões da conta.

## Como executar

Clone o repositório:

```powershell
git clone <URL_DO_REPOSITORIO>
cd InventarioTI
```

Execute o script:

```powershell
.\InventárioTI.ps1
```

O CSV será salvo por padrão em:

```text
%LOCALAPPDATA%\InventarioTI\inventario.csv
```

## Parâmetros

### PastaSaida

Permite escolher outra pasta para o CSV:

```powershell
.\InventárioTI.ps1 -PastaSaida 'D:\Inventarios'
```

O script aceita somente caminhos pertencentes ao sistema de arquivos.

### Pausar

Mantém a execução aguardando Enter ao final:

```powershell
.\InventárioTI.ps1 -Pausar
```

Esse parâmetro é opcional. Sem ele, o script encerra automaticamente, permitindo uso em automações.

## Exemplo de resultado

Os dados abaixo são fictícios:

```text
Nome do computador : PC-EXEMPLO-01
Fabricante         : Fabricante Exemplo
Modelo             : Modelo Exemplo
Numero de Serie    : SERIAL-EXEMPLO
Processador        : Processador x64 de exemplo
RAM (GB)           : 16
Sistema Operacional: Microsoft Windows 11 Pro
Tipo de Chave      : OEM - firmware/BIOS
Status da Licenca  : Licenciada
Chave do Windows   : XXXXX-XXXXX-XXXXX-XXXXX-ABCDE
Versao             : 10.0.xxxxx
Interface de Rede  : Ethernet
IP                 : 192.0.2.10
Status da Rede     : Up
Velocidade da Rede : 1 Gbps
Produtos Office    : Microsoft 365 Apps
IDs Office         : O365ProPlusRetail
Versao Office      : 16.0.xxxxx.xxxxx
Arquitetura Office : x64
Instalacao Office  : Click-to-Run
AnyDesk            : 000000000

Inventario salvo em:
C:\Users\<USUARIO>\AppData\Local\InventarioTI\inventario.csv
```

## Funcionamento do CSV

O projeto utiliza uma estratégia histórica: cada execução acrescenta uma nova coleta ao CSV.

Quando a estrutura das colunas é modificada, o script preserva o arquivo anterior criando um backup antes de gerar o novo CSV.

O arquivo é salvo em UTF-8.

## Compatibilidade de rede

O script tenta identificar a interface principal usando a rota padrão do Windows.

Quando os comandos modernos de rede não estão disponíveis, utiliza um fallback baseado em classes CIM/WMI.

A velocidade apresentada é a velocidade do enlace entre o computador e o equipamento de rede. Ela não representa necessariamente a velocidade contratada da internet.

## Códigos de saída

- `0`: inventário concluído e CSV salvo;
- `1`: ocorreu uma falha fatal ou o CSV não pôde ser salvo.

Esses códigos permitem integração com Agendador de Tarefas, Intune e ferramentas RMM.

## Segurança e privacidade

O CSV pode conter informações sensíveis sobre o equipamento, incluindo:

- nome do computador;
- número de série;
- endereço IP;
- identificação parcial da licença;
- ID do AnyDesk.

Não publique CSVs reais em commits, issues, capturas de tela ou exemplos.

Arquivos gerados pelo inventário e configurações locais ou privadas não são versionados.

O projeto não coleta:

- senhas;
- tokens;
- credenciais;
- chave completa do Windows.

Os arquivos CSV, logs, `.env` e o contexto privado do projeto são excluídos pelo `.gitignore`.

## Limitações conhecidas

- compatível somente com Windows;
- algumas instalações menos comuns do Office podem não ser identificadas;
- o AnyDesk só é identificado quando o arquivo de configuração existe e pode ser lido;
- o script não realiza inventário de macOS ou Linux;
- resultados podem variar conforme versão do Windows e permissões do usuário.

## Estrutura do projeto

```text
InventárioTI.ps1
README.md
AGENTS.md
.gitignore
```

O arquivo `AI_CONTEXT.private.md` é utilizado apenas localmente e não deve ser publicado.

## Próximas melhorias

- organizar os blocos em funções;
- adicionar testes automatizados com Pester;
- executar análise estática com PSScriptAnalyzer;
- melhorar a compatibilidade com instalações menos comuns do Office;
- criar projetos separados para Linux e macOS.

## Uso responsável

Execute o script somente em computadores próprios ou em equipamentos para os quais você possua autorização.