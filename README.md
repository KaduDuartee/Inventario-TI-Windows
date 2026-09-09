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
- PowerShell 5.1 - PowerShell 7 ainda não foi validado;
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

Quando os comandos modernos estão indisponíveis, falham ou não retornam um IPv4, o script tenta uma coleta alternativa por CIM/WMI.

Se a interface possuir vários endereços IPv4, o script prioriza endereços fora de APIPA, loopback e 0.0.0.0. Quando não existe outra opção, preserva um dos endereços disponíveis para diagnóstico.

A velocidade apresentada é a velocidade do enlace entre o computador e o equipamento de rede. Ela não representa necessariamente a velocidade contratada da internet.

## Códigos de saída

- `0`: inventário concluído e CSV salvo;
- `1`: ocorreu uma falha fatal ou o CSV não pôde ser salvo.

Esses códigos permitem integração com Agendador de Tarefas, Intune e ferramentas RMM.

A saída `0` confirma que a coleta principal e a exportação foram concluídas. Consultas opcionais ainda podem gerar avisos e campos indisponíveis; então, esse código não garante que todas as informações foram obtidas.

## Segurança e privacidade

O CSV pode conter informações sensíveis sobre o equipamento, incluindo:

- nome do computador;
- número de série;
- endereço IP;
- identificação parcial da licença;
- ID do AnyDesk.

Não publique CSVs reais em commits, issues, capturas de tela ou exemplos.

A exportação acrescenta um apóstrofo aos textos que começam com caracteres potencialmente interpretados como fórmulas. Essa medida reduz o risco de CSV Injection, mas não oferece proteção universal: o comportamento varia entre editores, e salvar e reabrir o CSV no Excel pode remover a proteção. Consulte as [limitações documentadas pela OWASP](https://owasp.org/www-community/attacks/CSV_Injection).

Arquivos gerados pelo inventário e configurações locais ou privadas não são versionados.

O projeto não coleta:

- senhas;
- tokens;
- credenciais;
- chave completa do Windows.

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
LICENSE
AGENTS.md
.gitignore
```

## Próximas melhorias

- organizar os blocos em funções;
- adicionar testes automatizados com Pester;
- executar análise estática com PSScriptAnalyzer;
- melhorar a compatibilidade com instalações menos comuns do Office;
- criar projetos separados para Linux e macOS.

## Uso responsável

Execute o script somente em computadores próprios ou em equipamentos para os quais você possua autorização.

## Licença

Este projeto é distribuído sob a licença MIT.
Consulte o arquivo [LICENSE](LICENSE) para conhecer os termos.
