# Register-Protocol.ps1 — Registry installer for antigravity:// URL protocol
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BatPath = Join-Path $ScriptDir "Add-Antigravity.bat"

$RegistryPath = "HKCU:\Software\Classes\antigravity"
if (!(Test-Path $RegistryPath)) {
    New-Item -Path $RegistryPath -Force | Out-Null
}
Set-ItemProperty -Path $RegistryPath -Name "(Default)" -Value "URL:Antigravity Protocol" -Force
Set-ItemProperty -Path $RegistryPath -Name "URL Protocol" -Value "" -Force

$CommandPath = "$RegistryPath\shell\open\command"
if (!(Test-Path $CommandPath)) {
    New-Item -Path $CommandPath -Force | Out-Null
}

Set-ItemProperty -Path $CommandPath -Name "(Default)" -Value "cmd.exe /c `"$BatPath`"" -Force

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Da dang ky giao thuc 'antigravity://' thanh cong!" -ForegroundColor Green
Write-Host " Ke tu gio khi click cac lien ket dang antigravity:// tren Web CMS," -ForegroundColor Gray
Write-Host " Windows se tu dong mo terminal va chay login cho ban." -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Nhan Enter de thoat"
