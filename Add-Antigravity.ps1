# AntiQuotar - Add Antigravity Account (PowerShell version)
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " AntiQuotar - KHOI CHAY DANG NHAP TAI KHOAN GOOGLE (PS)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vui long dang nhap tren trang web Google sap duoc mo ra..." -ForegroundColor Yellow
Write-Host ""

# Run the authentication login command
npx -y antigravity-usage@latest login

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " Dang nhap hoan tat!" -ForegroundColor Green
Write-Host " Tai khoan moi se duoc tu dong dong bo vao Web CMS sau 5 giay." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

Read-Host "Nhan Enter de thoat"
