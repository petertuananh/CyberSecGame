using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace CyberSecGame
{
    static class Program
    {
        private const int Port = 3000;
        private static readonly string AppUrl = "http://localhost:" + Port;

        [STAThread]
        static void Main()
        {
            // Sử dụng Mutex hệ thống để chống spam khi người dùng nhấp đúp nhiều lần
            bool createdNew;
            using (Mutex mutex = new Mutex(true, "Global\\CyberSecPasswordGuardian_Launcher_Mutex", out createdNew))
            {
                if (!createdNew)
                {
                    // Ứng dụng đã được khởi chạy, thoát tiến trình phụ này ngay lập tức
                    return;
                }

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                string baseDir = AppDomain.CurrentDomain.BaseDirectory;

                // 1. Kiểm tra nếu có bản phân phối Electron đóng gói trong dist
                string packagedExe = Path.Combine(baseDir, "dist", "CyberSecGame-win32-x64", "CyberSecGame.exe");
                if (File.Exists(packagedExe))
                {
                    try
                    {
                        var psi = new ProcessStartInfo
                        {
                            FileName = packagedExe,
                            WorkingDirectory = Path.GetDirectoryName(packagedExe),
                            UseShellExecute = true
                        };
                        Process.Start(psi);
                        return;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine("Packaged exe error: " + ex.Message);
                    }
                }

                // 2. Khởi động Server Node.js nếu chưa chạy
                EnsureServerRunning(baseDir);

                // 3. Thử mở cửa sổ riêng biệt bằng Electron
                bool openedDedicated = TryOpenElectronWindow(baseDir);

                // 4. Nếu không mở được cửa sổ riêng biệt -> Hỏi người dùng mở trên trình duyệt
                if (!openedDedicated)
                {
                    DialogResult result = MessageBox.Show(
                        "Không thể mở cửa sổ ứng dụng riêng biệt.\n\nBạn có muốn tiếp tục trải nghiệm trò chơi trên trình duyệt web mặc định của máy tính không?",
                        "Vệ Binh Mật Khẩu - CyberSec Password Guardian",
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Question
                    );

                    if (result == DialogResult.Yes)
                    {
                        OpenInBrowser(AppUrl);
                    }
                }
            }
        }

        static bool IsServerReady()
        {
            try
            {
                var req = (HttpWebRequest)WebRequest.Create(AppUrl);
                req.Timeout = 800;
                using (var res = (HttpWebResponse)req.GetResponse())
                {
                    return (int)res.StatusCode >= 200 && (int)res.StatusCode < 400;
                }
            }
            catch
            {
                return false;
            }
        }

        static void EnsureServerRunning(string baseDir)
        {
            if (IsServerReady()) return;

            string serverScript = Path.Combine(baseDir, "server.js");
            if (File.Exists(serverScript))
            {
                try
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = "node.exe",
                        Arguments = "\"" + serverScript + "\"",
                        WorkingDirectory = baseDir,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        CreateNoWindow = true,
                        UseShellExecute = false
                    };
                    Process.Start(psi);
                }
                catch
                {
                    try
                    {
                        Process.Start(new ProcessStartInfo
                        {
                            FileName = "cmd.exe",
                            Arguments = "/c node \"" + serverScript + "\"",
                            WorkingDirectory = baseDir,
                            WindowStyle = ProcessWindowStyle.Hidden,
                            CreateNoWindow = true,
                            UseShellExecute = false
                        });
                    }
                    catch {}
                }

                for (int i = 0; i < 20; i++)
                {
                    Thread.Sleep(250);
                    if (IsServerReady()) break;
                }
            }
        }

        static bool TryOpenElectronWindow(string baseDir)
        {
            // Thử electron.exe trong node_modules
            string electronLocal = Path.Combine(baseDir, "node_modules", "electron", "dist", "electron.exe");
            if (File.Exists(electronLocal))
            {
                try
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = electronLocal,
                        Arguments = "\"" + baseDir + "\"",
                        WorkingDirectory = baseDir,
                        UseShellExecute = false
                    };
                    if (psi.EnvironmentVariables.ContainsKey("ELECTRON_RUN_AS_NODE"))
                    {
                        psi.EnvironmentVariables.Remove("ELECTRON_RUN_AS_NODE");
                    }
                    var p = Process.Start(psi);
                    if (p != null) return true;
                }
                catch {}
            }

            // Thử npx electron
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/c npx electron \"" + baseDir + "\"",
                    WorkingDirectory = baseDir,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                if (psi.EnvironmentVariables.ContainsKey("ELECTRON_RUN_AS_NODE"))
                {
                    psi.EnvironmentVariables.Remove("ELECTRON_RUN_AS_NODE");
                }
                var p = Process.Start(psi);
                if (p != null) return true;
            }
            catch {}

            return false;
        }

        static void OpenInBrowser(string url)
        {
            try
            {
                string[] browserPaths = new string[]
                {
                    @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                    @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                    @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                    @"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
                };

                foreach (var bPath in browserPaths)
                {
                    if (File.Exists(bPath))
                    {
                        Process.Start(new ProcessStartInfo
                        {
                            FileName = bPath,
                            Arguments = "--app=" + url,
                            UseShellExecute = true
                        });
                        return;
                    }
                }

                Process.Start(new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                MessageBox.Show("Lỗi khi mở trình duyệt: " + ex.Message, "Thông Báo", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
