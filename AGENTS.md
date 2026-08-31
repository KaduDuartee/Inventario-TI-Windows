# Instruções para agentes de IA

Este projeto é um script de inventário de desktops Windows em PowerShell.

# Compatibilidade

Windows PowerShell 5.1

# Antes de alterar código

Leia:

- InventárioTI.ps1
- README.md

# Diretrizes

- Prefira objetos PowerShell e propriedades estruturadas.
- Evite parsing de texto localizado quando existir CIM, WMI, registro ou API estruturada.
- Não introduza dependências desnecessárias.
- Explique alterações relevantes antes de implementá-las.
- Preserve legibilidade do código.
- Adicione tratamento de erros nas operações que possam falhar.
- Não exponha credenciais, product keys ou dados internos.

# Git

Não adicionar ao Git:

- AI_CONTEXT.private.md
- arquivos CSV de inventário
- logs
- credenciais
- arquivos .env