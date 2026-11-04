$ErrorActionPreference = 'Stop'
$machine = Get-CimInstance Win32_ComputerSystem
$cpu = Get-CimInstance Win32_Processor
$gpu = Get-CimInstance Win32_VideoController
$ramGB = [math]::Round($machine.TotalPhysicalMemory / 1GB, 1)
$model = if ($ramGB -ge 12) { 'qwen3:4b' } else { 'qwen3:1.7b' }
[ordered]@{
    OS = [Environment]::OSVersion.VersionString
    CPU = $cpu.Name
    RAM_GB = $ramGB
    GPU = @($gpu | Select-Object Name, AdapterRAM)
    OllamaModel = $model
    WhisperModel = if ($ramGB -ge 12) { 'small' } else { 'base' }
    Compute = 'CPU int8; CUDA requires a separately verified compatible GPU'
} | ConvertTo-Json -Depth 4
