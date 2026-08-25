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

# Tipo de Chave
$licenca = cscript.exe C:\Windows\System32\slmgr.vbs /dli
$descricao = $licenca | Select-String "Descri"
$tipoChave = (($descricao.Line -split ":")[1]).Trim()

# Chave do Windows 
$produtoWindows = Get-CimInstance -ClassName SoftwareLicensingProduct |
    Where-Object {
        $_.ApplicationID -eq '55c92734-d682-4d71-983e-d6ec3f16059f' -and
        $_.PartialProductKey -and
        $_.LicenseStatus -eq 1
    } |
    Select-Object -First 1

$tipoChave = if ($produtoWindows) {
    $produtoWindows.Description
} else {
    'Licença não identificada'
}

$chaveMascarada = if ($produtoWindows.PartialProductKey) {
    "XXXXX-XXXXX-XXXXX-XXXXX-$($produtoWindows.PartialProductKey)"
} else {
    'Não disponível'
}

# Status da Rede
$adaptador = Get-NetAdapter |
Where-Object {
    $_.Status -eq "Up" -and

    $_.LinkSpeed -ne "0 bps"
    }

# IP 
$rota = Get-NetRoute -DestinationPrefix "0.0.0.0/0" |
    Sort-Object RouteMetric | Select-Object -First 1

$rede = Get-NetIPConfiguration |
    Where-Object {
        $_.InterfaceIndex -eq $rota.InterfaceIndex
    }

# Versão do Office
$office = Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*, `
    HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like "*Microsoft 365*" -or $_.DisplayName -like "*Office*" } |
    Select-Object -First 1 -ExpandProperty DisplayName

#ID do AnyDesk
$anydesk = $null
if (Test-Path "C:\ProgramData\AnyDesk\system.conf") {
    $config = Get-Content "C:\ProgramData\AnyDesk\system.conf"
    $anydeskLine = $config | Select-String "ad.anynet.id"
    if ($anydeskLine) { $anydesk = ($anydeskLine.Line -split "=")[1].Trim() }
}
    

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

Pause