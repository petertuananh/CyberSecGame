@echo off
chcp 65001 >nul
echo ========================================================
echo   CYBERSEC PASSWORD GUARDIAN - BUILD SCRIPT
echo ========================================================
echo.
echo [1/4] Cài đặt dependencies (nếu chưa có)...
call npm.cmd install

echo.
echo [2/4] Đang biên dịch file CyberSecGame.exe (Native Windows GUI Launcher)...
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /win32icon:icon.ico /out:CyberSecGame.exe /r:System.dll,System.Windows.Forms.dll,System.Drawing.dll CyberSecLauncher.cs

echo.
echo [3/4] Đang đóng gói bản Desktop Standalone với Electron Packager...
call npm.cmd run dist

echo.
echo Đang nén file zip phân phối...
powershell -Command "Compress-Archive -Path 'dist\CyberSecGame-win32-x64\*' -DestinationPath 'dist\CyberSecGame-Windows-x64.zip' -Force"

echo.
echo [4/4] Đang tạo Bộ Cài Đặt Windows (Setup Installer)...
if exist "C:\Users\peter\AppData\Local\Programs\Inno Setup 6\ISCC.exe" (
    "C:\Users\peter\AppData\Local\Programs\Inno Setup 6\ISCC.exe" installer.iss
) else (
    echo [Lưu ý] Không tìm thấy ISCC.exe, bỏ qua bước build Setup Installer.
)

echo.
echo ========================================================
echo [HOÀN TẤT!]
echo - Bộ cài đặt Windows:   dist\CyberSecGame_Setup.exe
echo - File chạy nhanh:       CyberSecGame.exe (ngay tại thư mục gốc)
echo - Bản đóng gói độc lập: dist\CyberSecGame-win32-x64\CyberSecGame.exe
echo - File ZIP để gửi tặng: dist\CyberSecGame-Windows-x64.zip
echo ========================================================
pause
