import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Moon, Sun, Download, LogOut, Smartphone, Camera, Save, ChevronDown } from 'lucide-react';
import { CameraConfig } from '../types';

interface SettingsViewProps {
  onBack: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

export default function SettingsView({ onBack, darkMode, onToggleDarkMode, onLogout }: SettingsViewProps) {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showCamPass, setShowCamPass] = useState(false);
  const [camSaved, setCamSaved] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState<number>(() => {
    return parseInt(localStorage.getItem('session_timeout_minutes') || '10', 10);
  });
  const [cameraConfig, setCameraConfig] = useState<CameraConfig>(() => {
    const saved = localStorage.getItem('dahua_camera_config');
    return saved ? JSON.parse(saved) : { ip: '', port: '554', username: 'admin', password: '', urlFormat: '1' } as CameraConfig;
  });

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') setIsInstalled(true);
    setInstallPrompt(null);
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden">
      <header className="bg-slate-50 dark:bg-slate-900 flex items-center gap-4 px-4 h-16 shrink-0 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="text-blue-600 active:scale-95 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg text-slate-900 dark:text-white">Cài Đặt</h1>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ touchAction: 'pan-y' }}>
        <div className="p-6 flex flex-col gap-6 pb-24">
          {/* PWA Install */}
          {!isInstalled && (
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 shadow-lg text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="font-bold">Cài Đặt Ứng Dụng</h3>
                  <p className="text-blue-100 text-xs">Thêm vào màn hình chính để truy cập nhanh</p>
                </div>
              </div>
              <button onClick={handleInstall} disabled={!installPrompt}
                className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                <Download size={16} />
                {installPrompt ? 'Cài Đặt Ngay' : 'Mở trên trình duyệt để cài đặt'}
              </button>
            </div>
          )}
          {isInstalled && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 flex items-center gap-3 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="text-green-600 shrink-0" size={20} />
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Ứng dụng đã được cài đặt.</p>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center">
                  {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Chế Độ Tối</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{darkMode ? 'Đang bật' : 'Đang tắt'}</p>
                </div>
              </div>
              <button onClick={onToggleDarkMode}
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${darkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${darkMode ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Session Timeout */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 flex items-center justify-center">
                  <ChevronDown size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Thời Gian Tự Kết Thúc</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tự hoàn thành phiên sau</p>
                </div>
              </div>
              <select
                value={sessionTimeout}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  setSessionTimeout(val);
                  localStorage.setItem('session_timeout_minutes', String(val));
                }}
                className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl px-3 py-2 text-sm outline-none border border-slate-200 dark:border-slate-600"
              >
                <option value={5}>5 phút</option>
                <option value={10}>10 phút</option>
                <option value={15}>15 phút</option>
                <option value={20}>20 phút</option>
              </select>
            </div>
          </div>

          {/* Dahua Camera Config */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Camera className="text-teal-600" size={20} />
              <h2 className="font-bold text-slate-900 dark:text-white">Camera Dahua</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Cấu hình để xem lại video đóng hàng qua VLC.
            </p>

            <div className="flex flex-col gap-3">
              {/* IP + Port */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Địa chỉ IP</label>
                  <input
                    type="text" placeholder="192.168.1.108"
                    value={cameraConfig.ip}
                    onChange={e => setCameraConfig(p => ({ ...p, ip: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 px-3 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                  />
                </div>
                <div className="w-20">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Port</label>
                  <input
                    type="text" placeholder="554"
                    value={cameraConfig.port}
                    onChange={e => setCameraConfig(p => ({ ...p, port: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 px-3 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Tên đăng nhập</label>
                <input
                  type="text" placeholder="admin"
                  value={cameraConfig.username}
                  onChange={e => setCameraConfig(p => ({ ...p, username: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 px-3 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Mật khẩu</label>
                <div className="relative">
                  <input
                    type={showCamPass ? 'text' : 'password'} placeholder="Nhập mật khẩu camera"
                    value={cameraConfig.password}
                    onChange={e => setCameraConfig(p => ({ ...p, password: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 pl-3 pr-10 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                  />
                  <button onClick={() => setShowCamPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                    {showCamPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Tablet Server URL */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block flex items-center justify-between">
                  <span>📱 Địa chỉ Tablet Scanner</span>
                  <span className="text-[9px] text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">Tùy chọn</span>
                </label>
                <input
                  type="text" placeholder="http://192.168.1.x:8181"
                  value={cameraConfig.tabletUrl || ''}
                  onChange={e => setCameraConfig(p => ({ ...p, tabletUrl: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 px-3 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  IP của tablet trong mạng WiFi (VD: http://192.168.1.50:8181) → bật nút ⬇ Tải video trực tiếp về iPhone.
                </p>
              </div>

              {/* Tool PC Server */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block flex items-center justify-between">
                  <span>Địa chỉ Tool Downloader (Trên PC)</span>
                  <span className="text-[9px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">Tùy chọn</span>
                </label>
                <input
                  type="text" placeholder="http://192.168.1.15:3456"
                  value={cameraConfig.toolUrl || ''}
                  onChange={e => setCameraConfig(p => ({ ...p, toolUrl: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 px-3 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Điền IP của Tool trên PC (VD: http://192.168.1.15:3456) để bật nút tự động tải file MP4 trên đơn.
                </p>
              </div>

              {/* Info box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                  👉 Khuyên dùng <strong>VLC for Mobile</strong> rồi bấm nút "Ghi màn hình" iPhone cho nhanh.<br/>
                  👉 Tính năng Tải File MP4 yêu cầu máy tính (PC) phải luôn mở Tool.
                </p>
              </div>

              {/* Save Button */}
              <button
                onClick={() => {
                  localStorage.setItem('dahua_camera_config', JSON.stringify(cameraConfig));
                  setCamSaved(true);
                  setTimeout(() => setCamSaved(false), 3000);
                }}
                disabled={!cameraConfig.ip || !cameraConfig.password}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Save size={16} />
                Lưu Cấu Hình Camera
              </button>

              {camSaved && (
                <div className="bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 p-3 rounded-xl text-sm flex items-center justify-center gap-2 font-medium">
                  <CheckCircle2 size={18} />
                  Đã lưu! Vào Lịch Sử → Xem Video (VLC).
                </div>
              )}

              {/* Test VLC Connection */}
              {cameraConfig.ip && cameraConfig.password && (
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 mt-1">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">🔗 Test kết nối VLC</p>
                  <a
                    href={`vlc://rtsp://${cameraConfig.username}:${cameraConfig.password}@${cameraConfig.ip}:${cameraConfig.port || '554'}/cam/realmonitor?channel=1&subtype=0`}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-all"
                  >
                    ▶️ Test Live Stream (VLC)
                  </a>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                    Nếu VLC hiện hình camera → kết nối OK ✅
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Logout */}
          <button onClick={onLogout}
            className="w-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl py-4 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-red-100 dark:border-red-800">
            <LogOut size={20} />
            Đăng Xuất
          </button>
        </div>
      </div>
    </div>
  );
}
