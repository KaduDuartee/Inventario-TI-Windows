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

$office = Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*, `
    HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like "*Microsoft 365*" -or $_.DisplayName -like "*Office*" } |
    Select-Object -First 1 -ExpandProperty DisplayName

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
Write-Host "Versao Office      : $office"        
Write-Host "AnyDesk            : $anydesk"
#================================================

#================================================
# Objeto Final

$inventario = [PSCustomObject]@{
    Nome             = $pc.Name
    Fabricante       = $pc.Manufacturer
    Modelo           = $pc.Model
    Numero_de_Serie  = $bios.SerialNumber
    Processador      = $cpu.Name
    RAM_GB           = [Math]::Round($pc.TotalPhysicalMemory / 1GB, 2)
    SO               = $os.Caption
    Tipo_de_Chave    = $tipoChave
    Chave_Windows    = $chaveMascarada
    IP               = $ipPrincipal
    Versao_Office    = $office
    AnyDesk          = $anydesk
    DataColeta       = Get-Date -Format 'yyyy-MM-dd HH:mm'
}
#================================================

#================================================
# Exportação CSV

$caminhoCSV = "C:\Inventario\inventario.csv"

# Garante que a pasta existe
$pasta = Split-Path $caminhoCSV
if (-not (Test-Path $pasta)) {
    New-Item -ItemType Directory -Path $pasta | Out-Null
}

# Exporta (acrescenta ao arquivo se ele já existir)
$inventario | Export-Csv -Path $caminhoCSV -Append -NoTypeInformation -Encoding UTF8

Write-Host ""
Write-Host "Inventario salvo em: $caminhoCSV"
#================================================


Pause