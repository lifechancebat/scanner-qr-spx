import { useState, useEffect } from 'react';
import { ArrowLeft, Key, CheckCircle2, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

interface SettingsViewProps {
  onBack: () => void;
}

export default function SettingsView({ onBack }: SettingsViewProps) {
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [newKey, setNewKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);

  useEffect(() => {
    const keysStr = localStorage.getItem('gemini_api_keys');
    if (keysStr) {
      // Handle both old format (newline separated string) and new format (JSON array)
      try {
        const parsed = JSON.parse(keysStr);
        if (Array.isArray(parsed)) {
          setApiKeys(parsed);
        } else {
          setApiKeys(keysStr.split('\n').filter(k => k.trim() !== ''));
        }
      } catch (e) {
        setApiKeys(keysStr.split('\n').filter(k => k.trim() !== ''));
      }
    }
  }, []);

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
    return `${key.substring(0, 6)}••••••••••••••••${key.substring(key.length - 4)}`;
  };

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto pb-24 flex flex-col">
      <header className="bg-slate-50 flex items-center gap-4 px-4 h-16 shrink-0">
        <button onClick={onBack} className="text-blue-600 active:scale-95 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg text-slate-900">Cài Đặt</h1>
      </header>

      <div className="p-6 flex-1 flex flex-col gap-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Key className="text-blue-600" size={20} />
              <h2 className="font-bold text-slate-900">API Key Gemini</h2>
            </div>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {apiKeys.length} keys đã lưu
            </span>
          </div>
          
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Hệ thống sẽ tự động chuyển sang key tiếp theo nếu key hiện tại bị giới hạn (Limit/Quota).
          </p>

          {/* Add New Key */}
          <div className="mb-6">
            <label className="text-xs font-bold text-slate-700 mb-2 block">Thêm Key Mới</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showNewKey ? "text" : "password"}
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Nhập API Key..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-10 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button 
                  onClick={() => setShowNewKey(!showNewKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                >
                  {showNewKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                onClick={handleAddKey}
                disabled={!newKey.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl px-4 flex items-center justify-center active:scale-95 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* List of Keys */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-2 block">Danh Sách Key Đã Lưu</label>
            {apiKeys.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                <p className="text-sm text-slate-400">Chưa có API Key nào được lưu.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {apiKeys.map((key, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {index + 1}
                      </div>
                      <span className="font-mono text-sm text-slate-600 truncate">
                        {maskKey(key)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveKey(index)}
                      className="text-red-400 hover:text-red-600 p-2 active:scale-90 transition-transform shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {saved && (
            <div className="mt-4 bg-green-50 text-green-700 p-3 rounded-xl text-sm flex items-center justify-center gap-2 font-medium animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 size={18} />
              Đã cập nhật danh sách Key
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
