import { useState, useEffect } from 'react';
import { ArrowLeft, Key, CheckCircle2, Plus, Trash2, Eye, EyeOff, Moon, Sun, Download, LogOut, Smartphone } from 'lucide-react';

interface SettingsViewProps {
  onBack: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

export default function SettingsView({ onBack, darkMode, onToggleDarkMode, onLogout }: SettingsViewProps) {
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [newKey, setNewKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const keysStr = localStorage.getItem('gemini_api_keys');
    if (keysStr) {
      try {
        const parsed = JSON.parse(keysStr);
        if (Array.isArray(parsed)) setApiKeys(parsed);
        else setApiKeys(keysStr.split('\n').filter(k => k.trim() !== ''));
      } catch {
        setApiKeys(keysStr.split('\n').filter(k => k.trim() !== ''));
      }
    }
  }, []);

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

  const handleSave = (keysToSave: string[]) => {
    localStorage.setItem('gemini_api_keys', JSON.stringify(keysToSave));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAddKey = () => {
    if (!newKey.trim()) return;
    const updatedKeys = [...apiKeys, newKey.trim()];
    setApiKeys(updatedKeys);
    setNewKey('');
    setShowNewKey(false);
    handleSave(updatedKeys);
  };

  const handleRemoveKey = (index: number) => {
    const updatedKeys = apiKeys.filter((_, i) => i !== index);
    setApiKeys(updatedKeys);
    handleSave(updatedKeys);
  };

  const maskKey = (key: string) => {
    if (key.length <= 10) return '********';
    return `${key.substring(0, 6)}••••••••${key.substring(key.length - 4)}`;
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-y-auto pb-24 flex flex-col">
      <header className="bg-slate-50 dark:bg-slate-900 flex items-center gap-4 px-4 h-16 shrink-0">
        <button onClick={onBack} className="text-blue-600 active:scale-95 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg text-slate-900 dark:text-white">Cài Đặt</h1>
      </header>

      <div className="p-6 flex-1 flex flex-col gap-6">
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

        {/* API Keys */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Key className="text-blue-600" size={20} />
              <h2 className="font-bold text-slate-900 dark:text-white">API Key Gemini</h2>
            </div>
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full">
              {apiKeys.length} keys
            </span>
          </div>
          
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
            Hệ thống tự động chuyển key nếu bị giới hạn.
          </p>

          <div className="mb-6">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">Thêm Key Mới</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type={showNewKey ? "text" : "password"} value={newKey}
                  onChange={(e) => setNewKey(e.target.value)} placeholder="Nhập API Key..."
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl py-3 pl-4 pr-10 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                <button onClick={() => setShowNewKey(!showNewKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                  {showNewKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button onClick={handleAddKey} disabled={!newKey.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-xl px-4 flex items-center justify-center active:scale-95 transition-all">
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">Danh Sách Key</label>
            {apiKeys.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 border-dashed">
                <p className="text-sm text-slate-400">Chưa có API Key nào.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {apiKeys.map((key, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-xl p-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                        {index + 1}
                      </div>
                      <span className="font-mono text-sm text-slate-600 dark:text-slate-300 truncate">{maskKey(key)}</span>
                    </div>
                    <button onClick={() => handleRemoveKey(index)}
                      className="text-red-400 hover:text-red-600 p-2 active:scale-90 transition-transform shrink-0">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {saved && (
            <div className="mt-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-xl text-sm flex items-center justify-center gap-2 font-medium">
              <CheckCircle2 size={18} />
              Đã cập nhật!
            </div>
          )}
        </div>

        {/* Logout */}
        <button onClick={onLogout}
          className="w-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl py-4 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-red-100 dark:border-red-800">
          <LogOut size={20} />
          Đăng Xuất
        </button>
      </div>
    </div>
  );
}
