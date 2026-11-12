; =====================================================================
; Script Inno Setup - Trình Cài Đặt Vệ Binh Mật Khẩu
; Đồng hành: Trường THCS Nguyễn Bỉnh Khiêm × SoftLab
; =====================================================================

#define MyAppName "Vệ Binh Mật Khẩu"
#define MyAppEnglishName "CyberSec Password Guardian"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Trường THCS Nguyễn Bỉnh Khiêm × SoftLab"
#define MyAppExeName "CyberSecGame.exe"

[Setup]
AppId={{571E3DCC-059E-4F65-9CBE-CBA424246904}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\CyberSecPasswordGuardian
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=dist
OutputBaseFilename=CyberSecGame_Setup
SetupIconFile=icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DisableDirPage=no
DisableProgramGroupPage=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
english.CreateDesktopIcon=Tạo biểu tượng ngoài màn hình Desktop (Desktop Shortcut)
english.LaunchProgram=Khởi chạy Vệ Binh Mật Khẩu ngay

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "Tùy chọn bổ sung:"

[Files]
Source: "dist\CyberSecGame-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\resources\app\icon.ico"
Name: "{group}\Gỡ cài đặt {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; IconFilename: "{app}\resources\app\icon.ico"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram}"; Flags: nowait postinstall skipifsilent
