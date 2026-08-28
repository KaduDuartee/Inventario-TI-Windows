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

try {
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

$anydesk = $null
if (Test-Path "C:\ProgramData\AnyDesk\system.conf") {
    $config = Get-Content "C:\ProgramData\AnyDesk\system.conf"
    $anydeskLine = $config | Select-String "ad.anynet.id"
    if ($anydeskLine) { $anydesk = ($anydeskLine.Line -split "=")[1].Trim() }
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

$caminhoCSV = 'C:\Inventario\inventario.csv'
$pasta = Split-Path -Parent $caminhoCSV

try {
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
}

#================================================


Pause