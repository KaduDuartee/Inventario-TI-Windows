Clear-Host

Write-Host "===================================="
Write-Host " INVENTÁRIO TI - TESTE 02"
Write-Host "===================================="
Write-Host ""

# Variáveis

# Info Desktop
$pc = Get-CimInstance Win32_ComputerSystem

# Número de Série
$bios = Get-CimInstance Win32_BIOS

# Processador
$cpu = Get-CimInstance Win32_Processor

# Sistema Operacional
$os = Get-CimInstance Win32_OperatingSystem

#======================================
# Chave do Windows / Tipo de Chave

# Procura de chave instalada
$produtosWindows = @(
    Get-CimInstance -ClassName SoftwareLicensingProduct |
        Where-Object {
            $_.ApplicationID -eq '55c92734-d682-4d71-983e-d6ec3f16059f' -and
            $_.PartialProductKey
        }
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
else {
    $tipoChave      = 'Licença não identificada'
    $statusLicenca  = 'Não identificado'
    $chaveMascarada = 'Não disponível'
}
#======================================

#======================================
# Status da Rede
$adaptador = Get-NetAdapter |
Where-Object {
    $_.Status -eq "Up" -and

    $_.LinkSpeed -ne "0 bps"
    }
#======================================

#======================================
# IP 
$rota = Get-NetRoute -DestinationPrefix "0.0.0.0/0" |
    Sort-Object RouteMetric | Select-Object -First 1

$rede = Get-NetIPConfiguration |
    Where-Object {
        $_.InterfaceIndex -eq $rota.InterfaceIndex
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
#ID do AnyDesk
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
Write-Host "Chave do Windows   : $chaveMascarada"
Write-Host "Versao             : $($os.Version)"
Write-Host "IP                 : $($rede.IPv4Address.IPAddress)"
Write-Host "Status             : $($adaptador.Status)"
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
    IP               = $rede.IPv4Address.IPAddress
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