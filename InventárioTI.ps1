#Requires -Version 5.1

param (
    [string]$PastaSaida,

    [switch]$Pausar
)

# Alerta para outros SO's
if ($env:OS -ne 'Windows_NT') {
    Write-Error 'Esse script é compatível somente com sistemas Windows.'
    exit 1
}

# Comandos essenciais para o script do inventário
$comandosObrigatorios = @(
    'Get-CimInstance'
    'Get-ItemProperty'
    'Export-Csv'
)

$comandosAusentes = @(
    foreach ($nomeComando in $comandosObrigatorios) {
        if (-not (Get-Command -Name $nomeComando -ErrorAction SilentlyContinue)) {
            $nomeComando
        }
    }
)

if ($comandosAusentes.Count -gt 0) {
    $listaComandos = $comandosAusentes -join ', '
    Write-Error "Os seguintes comandos obrigatórios não estão disponíveis: $listaComandos"
    exit 1
}

# Verifica os comandos de rede
$comandosRede = @(
    'Get-NetRoute'
    'Get-NetIPConfiguration'
    'Get-NetAdapter'
)

$comandosRedeAusentes = @(
    foreach ($nomeComando in $comandosRede) {
        if (-not (Get-Command -Name $nomeComando -ErrorAction SilentlyContinue)) {
            $nomeComando
        }
    }
)

$redeModernaDisponivel = $comandosRedeAusentes.Count -eq 0

# Pastas do Windows
$pastaDadosComuns = [Environment]::GetFolderPath(
    [Environment+SpecialFolder]::CommonApplicationData
)

$pastaDadosLocais = [Environment]::GetFolderPath(
    [Environment+SpecialFolder]::LocalApplicationData
)

$pastaDadosRoaming = [Environment]::GetFolderPath(
    [Environment+SpecialFolder]::ApplicationData
)

# Destino padrão quando nenhum caminho é informado
if ([string]::IsNullOrWhiteSpace($PastaSaida)) {
    $PastaSaida = Join-Path -Path $pastaDadosLocais -ChildPath 'InventarioTI'
}

# Validação e normalização da pasta de saída
$provedorSaida = $null
$unidadeSaida = $null

try {
    $PastaSaida = (
        $ExecutionContext.SessionState.Path.
            GetUnresolvedProviderPathFromPSPath(
                $PastaSaida,
                [ref]$provedorSaida,
                [ref]$unidadeSaida
            )
    )

    if ($provedorSaida.Name -ne 'FileSystem') {
        throw (
            "O provedor '{0}' não é permitido. " +
            'Informe uma pasta do sistema de arquivos.'
        ) -f $provedorSaida.Name
    }
}
catch {
    $mensagemErro = (
        'A pasta de saída informada é inválida. Detalhes: {0}'
    ) -f $_.Exception.Message

    Write-Error $mensagemErro
    exit 1
}

Clear-Host

Write-Host "===================================="
Write-Host " INVENTÁRIO TI - TESTE 02"
Write-Host "===================================="
Write-Host ""

#================================================
# Informações do Desktop

try {
# Nome do Desktop
     $pc = Get-CimInstance -ClassName Win32_ComputerSystem -ErrorAction Stop

# Número de Série
    $bios = Get-CimInstance -ClassName Win32_BIOS -ErrorAction Stop

# Processador
    $cpu = Get-CimInstance -ClassName Win32_Processor -ErrorAction Stop

# Sistema Operacional
     $os = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction Stop
}

catch {
    Write-Error (
        "Não foi possível coletar as informações principais do computador. Detalhes: {0}" `
        -f $_.Exception.Message
    )

    exit 1
}

#================================================

#======================================
# Chave do Windows / Tipo de Chave

# Valores Fallback
$tipoChave      = 'Licença não identificada'
$statusLicenca  = 'Não identificado'
$chaveMascarada = 'Não disponível'

try {
# Procura de chave instalada
$produtosWindows = @(
    Get-CimInstance -ClassName SoftwareLicensingProduct `
        -Filter "ApplicationID = '55c92734-d682-4d71-983e-d6ec3f16059f' AND PartialProductKey IS NOT NULL" `
        -Property Description, LicenseStatus, PartialProductKey `
        -ErrorAction Stop
)

# Primeiro - Tentar encontrar uma licença ativa
$produtoWindows = $produtosWindows |
    Where-Object { $_.LicenseStatus -eq 1 } |
    Select-Object -First 1

# Se nenhuma licença ativa for encontrada, utilizará a primeira licença instalada para mostrar seu problema
if (-not $produtoWindows) {
    $produtoWindows = $produtosWindows |
        Select-Object -First 1
}

if ($produtoWindows) {
    # Identificar o canal da chave pelos códigos da descrição
    $tipoChave = switch -Regex ($produtoWindows.Description) {
        'VOLUME_KMSCLIENT' { 'Volume - KMS'; break }
        'VOLUME_KMS'       { 'Volume - KMS'; break }
        'VOLUME_MAK'       { 'Volume - MAK'; break }
        'OEM_DM'           { 'OEM - firmware/BIOS'; break }
        'OEM_SLP'          { 'OEM - fabricante'; break }
        'OEM_COA'          { 'OEM - certificado'; break }
        'RETAIL'           { 'Retail'; break }
        'TIMEBASED_EVAL'   { 'Avaliação'; break }
        default            { 'Canal não identificado' }
    }

    # Classificação do status da licença
    $statusLicenca = switch ($produtoWindows.LicenseStatus) {
        0 { 'Não licenciada' }
        1 { 'Licenciada' }
        2 { 'Período inicial de tolerância' }
        3 { 'Período adicional de tolerância' }
        4 { 'Licença não genuína' }
        5 { 'Modo de notificação' }
        6 { 'Tolerância estendida' }
        default { 'Status desconhecido' }
    }

    $chaveMascarada = "XXXXX-XXXXX-XXXXX-XXXXX-$($produtoWindows.PartialProductKey)"
    } 
}
catch {
    Write-Warning (
        "Não foi possível consultar o licenciamento do Windows. Detalhes: {0}" `
        -f $_.Exception.Message
    )
}
#======================================

#======================================
# IP e Status de Rede

# Valores Fallback
$rota                 = $null
$rede                 = $null
$adaptador            = $null
$ipPrincipal          = 'Não disponível'
$nomeAdaptador        = 'Não disponível'
$statusAdaptador      = 'Não disponível'
$velocidadeAdaptador  = 'Não disponível'
$enderecoIPv4         = 'Não disponível'
try {
    if ($redeModernaDisponivel) {
    
    # Parâmetros para procurar a rota principal
    $parametrosRota = @{
        AddressFamily      = 'IPv4'
        DestinationPrefix = '0.0.0.0/0'
        State              = 'Alive'
        ErrorAction        = 'Stop'
    }

    # Rota padrão utilizada pelo Windows
    $rota = Get-NetRoute @parametrosRota |
        Sort-Object @{
            Expression = {
                $_.RouteMetric + $_.InterfaceMetric
            }
        } |
        Select-Object -First 1

    if (-not $rota) {
        throw 'Nenhuma rota padrão IPv4 foi encontrada.'
    }

    # Utilização da mesma rota
    $rede = Get-NetIPConfiguration -InterfaceIndex $rota.InterfaceIndex -ErrorAction Stop
    $adaptador = Get-NetAdapter -InterfaceIndex $rota.InterfaceIndex -ErrorAction Stop

    $enderecoIPv4 = $rede.IPv4Address |
        Select-Object -First 1

    if ($enderecoIPv4) {
        $ipPrincipal = $enderecoIPv4.IPAddress
    }

    $nomeAdaptador       = $adaptador.Name
    $statusAdaptador     = $adaptador.Status
    $velocidadeAdaptador = $adaptador.LinkSpeed
}
    else {
        # Procura adaptadores com TCP/IP habilitado
    $parametrosConfiguracao = @{
        ClassName   = 'Win32_NetworkAdapterConfiguration'
        Filter      = 'IPEnabled = TRUE'
        ErrorAction = 'Stop'
    }

    $configuracoesIP = @(
        Get-CimInstance @parametrosConfiguracao
    )

    if ($configuracoesIP.Count -eq 0) {
        throw 'Nenhuma configuração de rede com IP habilitado foi encontrada.'
    }

    # Prefere adaptadores que possuem gateway padrão
    $configuracoesComGateway = @(
        $configuracoesIP |
            Where-Object {
                $_.DefaultIPGateway
            }
    )

    if ($configuracoesComGateway.Count -gt 0) {
        $configuracoesCandidatas = $configuracoesComGateway
    }
    else {
        $configuracoesCandidatas = $configuracoesIP
    }

    # Menor métrica normalmente indica a conexão preferida
    $criterioMetrica = @{
        Expression = {
            if ($null -eq $_.IPConnectionMetric) {
                [uint32]::MaxValue
            }
            else {
                [uint32]$_.IPConnectionMetric
            }
        }
    }

    $configuracaoSelecionada = $configuracoesCandidatas |
        Sort-Object -Property $criterioMetrica |
        Select-Object -First 1

    if ($null -eq $configuracaoSelecionada) {
        throw 'Não foi possível selecionar uma configuração de rede.'
    }
        # Relaciona a configuração de IP ao adaptador correspondente
    $indiceAdaptador = [uint32]$configuracaoSelecionada.Index

    $parametrosAdaptadorCim = @{
        ClassName   = 'Win32_NetworkAdapter'
        Filter      = "Index = $indiceAdaptador"
        ErrorAction = 'Stop'
    }

    $adaptadorCim = Get-CimInstance @parametrosAdaptadorCim |
        Select-Object -First 1

    if ($null -eq $adaptadorCim) {
        throw 'O adaptador correspondente não foi encontrado.'
    }

    # Separa somente endereços IPv4
    $enderecosIPv4 = @(
        $configuracaoSelecionada.IPAddress |
            Where-Object {
                $_ -match '^(?:\d{1,3}\.){3}\d{1,3}$'
            }
    )

    # Evita APIPA, loopback e endereço vazio
    $ipPrincipal = $enderecosIPv4 |
        Where-Object {
            $_ -notlike '169.254.*' -and
            $_ -notlike '127.*' -and
            $_ -ne '0.0.0.0'
        } |
        Select-Object -First 1

    if ([string]::IsNullOrWhiteSpace($ipPrincipal)) {
        $ipPrincipal = $enderecosIPv4 |
            Select-Object -First 1
    }

    if ([string]::IsNullOrWhiteSpace($ipPrincipal)) {
        $ipPrincipal = 'Não disponível'
    }

    # Nome amigável do adaptador
    $nomeAdaptador = [string]$adaptadorCim.NetConnectionID

    if ([string]::IsNullOrWhiteSpace($nomeAdaptador)) {
        $nomeAdaptador = [string]$adaptadorCim.Name
    }

    # Tradução do status CIM
    $statusPorCodigo = @{
        0  = 'Desconectado'
        1  = 'Conectando'
        2  = 'Conectado'
        3  = 'Desconectando'
        4  = 'Hardware ausente'
        5  = 'Hardware desabilitado'
        6  = 'Falha de hardware'
        7  = 'Mídia desconectada'
        8  = 'Autenticando'
        9  = 'Autenticação concluída'
        10 = 'Falha na autenticação'
        11 = 'Endereço inválido'
        12 = 'Credenciais necessárias'
    }

    if ($null -ne $adaptadorCim.NetConnectionStatus) {
        $codigoStatus = [int]$adaptadorCim.NetConnectionStatus

        if ($statusPorCodigo.ContainsKey($codigoStatus)) {
            $statusAdaptador = $statusPorCodigo[$codigoStatus]
        }
        else {
            $statusAdaptador = 'Desconhecido (código {0})' -f $codigoStatus
        }
    }

    # Speed é informado em bits por segundo
    if (
        $null -ne $adaptadorCim.Speed -and
        [double]$adaptadorCim.Speed -gt 0
    ) {
        $velocidadeEmBits = [double]$adaptadorCim.Speed

        if ($velocidadeEmBits -ge 1000000000) {
            $velocidadeAdaptador = '{0:0.##} Gbps' -f (
                $velocidadeEmBits / 1000000000
            )
        }
        elseif ($velocidadeEmBits -ge 1000000) {
            $velocidadeAdaptador = '{0:0.##} Mbps' -f (
                $velocidadeEmBits / 1000000
            )
        }
        elseif ($velocidadeEmBits -ge 1000) {
            $velocidadeAdaptador = '{0:0.##} Kbps' -f (
                $velocidadeEmBits / 1000
            )
        }
        else {
            $velocidadeAdaptador = '{0:0} bps' -f $velocidadeEmBits
             }
        }
     } 
    }
    catch {
    $mensagemErro = 'Não foi possível identificar a interface principal de rede. Detalhes: {0}' -f $_.Exception.Message
    Write-Warning $mensagemErro
 }
#======================================

#======================================
# Versão do Office

    # Valores fallback
    $office                 = 'Não identificado'
    $idsOffice              = 'Não disponível'
    $versaoOffice           = 'Não disponível'
    $arquiteturaOffice      = 'Não disponível'
    $tipoInstalacaoOffice   = 'Não identificado'

try {
    # Locais de registro dos programas
    $chavesDesinstalacao = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
    )

    $entradasInstaladas = foreach ($chave in $chavesDesinstalacao) {
        if (Test-Path -LiteralPath $chave) {
            $caminhoEntradas = Join-Path -Path $chave -ChildPath '*'

            Get-ItemProperty -Path $caminhoEntradas -ErrorAction SilentlyContinue
        }
    }

    # Não representantes dos programas
    $itensAuxiliares = @(
        'Language Pack'
        'Pacote de Idiomas'
        'Proofing'
        'MUI'
        'Update'
        'Atualização'
        'Components?'
        'Componentes?'
        'Shared'
        'Compartilhado'
        'Click-to-Run'
        'Clique para Executar'
        'Telemetry'
        'File Validation'
        'Database Engine'
        'Hotfix'
        'Service Pack'
    ) -join '|'

    # Procura de switchs e apps
    $produtosRegistro = @(
        $entradasInstaladas |
            Where-Object {
                $_.DisplayName -and
                $_.DisplayName -match '^Microsoft (365|Office|Project|Visio|Access|Excel|Outlook|PowerPoint|Publisher|Word|OneNote|Skype for Business)' -and
                $_.DisplayName -notmatch $itensAuxiliares
            } |
            Sort-Object DisplayName -Unique
    )

    # Removedor do código de idioma do final do nome
    $nomesOffice = @(
        $produtosRegistro |
            ForEach-Object {
                $_.DisplayName -replace '\s+-\s+[a-z]{2}-[a-z]{2}$', ''
            } |
            Sort-Object -Unique
    )

    # Verificar primeiro o Click-to-Run
    $caminhoClickToRun = 'HKLM:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration'

    if (Test-Path -LiteralPath $caminhoClickToRun) {
        $configuracaoOffice = Get-ItemProperty -LiteralPath $caminhoClickToRun -ErrorAction Stop

        if ($configuracaoOffice.ProductReleaseIds) {
            $idsProduto = @(
                $configuracaoOffice.ProductReleaseIds -split ',' |
                    ForEach-Object { $_.Trim() } |
                    Where-Object { $_ }
            )

            $idsOffice = $idsProduto -join '; '

            if ($nomesOffice.Count -gt 0) {
                $office = $nomesOffice -join '; '
            }
            else {
                $office = $idsOffice
            }

            if ($configuracaoOffice.VersionToReport) {
                $versaoOffice = $configuracaoOffice.VersionToReport
            }
            elseif ($configuracaoOffice.ClientVersionToReport) {
                $versaoOffice = $configuracaoOffice.ClientVersionToReport
            }

            if ($configuracaoOffice.Platform) {
                $arquiteturaOffice = $configuracaoOffice.Platform
            }

            $tipoInstalacaoOffice = 'Click-to-Run'
        }
    }

    # Fallback para negativo no Click-to-Run
    if (
        $tipoInstalacaoOffice -eq 'Não identificado' -and
        $nomesOffice.Count -gt 0
    ) {
        $office = $nomesOffice -join '; '

        $versoesRegistro = @(
            $produtosRegistro.DisplayVersion |
                Where-Object { $_ } |
                Sort-Object -Unique
        )

        if ($versoesRegistro.Count -gt 0) {
            $versaoOffice = $versoesRegistro -join '; '
        }

        $tipoInstalacaoOffice = 'Registro de desinstalação'
    }
}
catch {
    $mensagemErro = 'Não foi possível identificar os produtos Office. Detalhes: {0}' -f $_.Exception.Message
    Write-Warning $mensagemErro
}

#=====================================
 
#=====================================
# ID do AnyDesk

# Valores fallback
$anydesk = 'Não disponível'

try {
    # AnyDesk instalado como serviço ou somente para o usuário
    $caminhosAnyDesk = @(
        (Join-Path -Path $pastaDadosComuns -ChildPath 'AnyDesk\system.conf')
        (Join-Path -Path $pastaDadosRoaming -ChildPath 'AnyDesk\system.conf')
    )

    $caminhoAnyDesk = $caminhosAnyDesk |
        Where-Object {
            Test-Path -LiteralPath $_ -PathType Leaf
        } |
        Select-Object -First 1

    if ($caminhoAnyDesk) {
        $anydeskLine = Get-Content -LiteralPath $caminhoAnyDesk -ErrorAction Stop |
            Select-String -Pattern '^ad\.anynet\.id=' |
            Select-Object -First 1

        if ($anydeskLine) {
            $partesAnyDesk = $anydeskLine.Line -split '=', 2

            if ($partesAnyDesk.Count -eq 2) {
                $anydesk = $partesAnyDesk[1].Trim()
            }
        }
    }
}
catch {
    $mensagemErro = 'Não foi possível consultar o AnyDesk. Detalhes: {0}' -f $_.Exception.Message
    Write-Warning $mensagemErro
}
#======================================

#===============================================
# LISTA DE ITENS

Write-Host "Nome do computador : $($pc.Name)"
Write-Host "Fabricante         : $($pc.Manufacturer)"
Write-Host "Modelo             : $($pc.Model)"
Write-Host "Numero de Serie    : $($bios.SerialNumber)"
Write-Host "Processador        : $($cpu.Name)"
Write-Host "RAM (GB)           : $([Math]::Round($pc.TotalPhysicalMemory/1GB,2))"
Write-Host "Sistema Operacional: $($os.Caption)"
Write-Host "Tipo de Chave      : $tipoChave"
Write-Host "Status da Licenca  : $statusLicenca"
Write-Host "Chave do Windows   : $chaveMascarada"
Write-Host "Versao             : $($os.Version)"
Write-Host "Interface de Rede  : $nomeAdaptador"
Write-Host "IP                 : $ipPrincipal"
Write-Host "Status da Rede     : $statusAdaptador"
Write-Host "Velocidade da Rede : $velocidadeAdaptador"
Write-Host "Produtos Office    : $office"
Write-Host "IDs Office         : $idsOffice"
Write-Host "Versao Office      : $versaoOffice"
Write-Host "Arquitetura Office : $arquiteturaOffice"
Write-Host "Instalacao Office  : $tipoInstalacaoOffice"
Write-Host "AnyDesk            : $anydesk"
#================================================

#================================================
# Objeto Final

$inventario = [PSCustomObject]@{
    Nome                     = $pc.Name
    Fabricante               = $pc.Manufacturer
    Modelo                   = $pc.Model
    Numero_de_Serie          = $bios.SerialNumber
    Processador              = $cpu.Name
    RAM_GB                   = [Math]::Round($pc.TotalPhysicalMemory / 1GB, 2)
    SO                       = $os.Caption
    Versao_SO                = $os.Version
    Tipo_de_Chave            = $tipoChave
    Status_da_Licenca        = $statusLicenca
    Chave_Windows            = $chaveMascarada
    Interface_de_Rede        = $nomeAdaptador
    IP                       = $ipPrincipal
    Status_da_Rede           = $statusAdaptador
    Velocidade_da_Rede       = $velocidadeAdaptador
    Produtos_Office          = $office
    IDs_Office               = $idsOffice
    Versao_Office            = $versaoOffice
    Arquitetura_Office       = $arquiteturaOffice
    Tipo_Instalacao_Office   = $tipoInstalacaoOffice
    AnyDesk                  = $anydesk
    DataColeta               = Get-Date -Format 'yyyy-MM-dd HH:mm'
}
#================================================

#================================================
# Exportação CSV

try {
    $pasta = $PastaSaida
    $caminhoCSV = Join-Path -Path $pasta -ChildPath 'inventario.csv'

    # Criar a pasta
    if (-not (Test-Path -LiteralPath $pasta -PathType Container)) {
        New-Item -ItemType Directory -Path $pasta -ErrorAction Stop |
            Out-Null
    }

    # Cabeçalho com o nome do objeto atual
    $cabecalhoEsperado = (
        $inventario |
            ConvertTo-Csv -NoTypeInformation
    )[0]

    # Verifica se o CSV existente utiliza a mesma estrutura
    if (Test-Path -LiteralPath $caminhoCSV -PathType Leaf) {
        $cabecalhoAtual = Get-Content -LiteralPath $caminhoCSV -TotalCount 1 -ErrorAction Stop

        if ($cabecalhoAtual -ne $cabecalhoEsperado) {
            $dataBackup = Get-Date -Format 'yyyyMMdd-HHmmssfff'
            $nomeBackup = 'inventario-backup-{0}.csv' -f $dataBackup
            $caminhoBackup = Join-Path -Path $pasta -ChildPath $nomeBackup

            Move-Item -LiteralPath $caminhoCSV -Destination $caminhoBackup -ErrorAction Stop

            Write-Warning "A estrutura do inventário mudou. O CSV anterior foi preservado em: $caminhoBackup"
        }
    }

    # Parâmetros da Exportação
    $parametrosCSV = @{
        LiteralPath       = $caminhoCSV
        NoTypeInformation = $true
        Encoding          = 'UTF8'
        ErrorAction       = 'Stop'
    }

    # Acrescentar linha só com existência de CSV
    if (Test-Path -LiteralPath $caminhoCSV -PathType Leaf) {
        $parametrosCSV.Append = $true
    }

    $inventario |
        Export-Csv @parametrosCSV

        Write-Host ""
        Write-Host "Inventario salvo em: $caminhoCSV"
}
catch {
    $mensagemErro = 'Não foi possível salvar o inventário em CSV. Detalhes: {0}' -f $_.Exception.Message
    Write-Error $mensagemErro
    exit 1
}

if ($Pausar) {
    [void](Read-Host 'Pressione Enter para encerrar')
}

exit 0
#================================================