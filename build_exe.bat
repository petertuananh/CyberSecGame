@echo off
chcp 65001 >nul
echo ========================================================
echo   CYBERSEC PASSWORD GUARDIAN - BUILD SCRIPT
echo ========================================================
echo.
echo [1/3] Cài đặt dependencies (nếu chưa có)...
call npm.cmd install

echo.
echo [2/3] Đang biên dịch file CyberSecGame.exe (Native Windows GUI Launcher)...
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /win32icon:icon.ico /out:CyberSecGame.exe /r:System.dll,System.Windows.Forms.dll,System.Drawing.dll CyberSecLauncher.cs

echo.
echo [3/3] Đang đóng gói bản Desktop Standalone với Electron Packager...
call npm.cmd run dist

echo.
echo Đang nén file zip phân phối...
powershell -Command "Compress-Archive -Path 'dist\CyberSecGame-win32-x64\*' -DestinationPath 'dist\CyberSecGame-Windows-x64.zip' -Force"

echo.
echo ========================================================
echo [HOÀN TẤT!]
echo - File chạy nhanh: CyberSecGame.exe (ngay tại thư mục gốc)
echo - Bản đóng gói độc lập: dist\CyberSecGame-win32-x64\CyberSecGame.exe
echo - File ZIP để gửi tặng: dist\CyberSecGame-Windows-x64.zip
echo ========================================================
pause
