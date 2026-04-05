import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart2, 
  Truck, 
  Settings,
  Scan,
  KeyRound,
  User,
  Check
} from 'lucide-react';
import Scanner from './components/Scanner';
import CurrentSession from './components/CurrentSession';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import DashboardView from './components/DashboardView';
import { ScanRecord } from './types';
import { playBeep, playTing } from './utils/audio';
import { db } from './services/firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc } from 'firebase/firestore';

type ViewState = 'scanner' | 'session' | 'history' | 'settings' | 'dashboard';

interface Toast {
  show: boolean;
  code: string;
  duration: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('scanner');
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [toast, setToast] = useState<Toast>({ show: false, code: '', duration: '' });
  
  // Custom Auth State
  const [isAuthenticatedLocal, setIsAuthenticatedLocal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    const savedPasscode = localStorage.getItem('app_passcode');
    const savedName = localStorage.getItem('employee_name');
    if (savedPasscode === 'batbat113' && savedName) {
      setEmployeeName(savedName);
      setIsAuthenticatedLocal(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticatedLocal) return;

    const q = query(collection(db, 'scans'), orderBy('scanTime', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: ScanRecord[] = [];
      snapshot.forEach((doc) => {
        records.push(doc.data() as ScanRecord);
      });
      setScanHistory(records);
    }, (error) => {
      console.error("Firestore Error: ", error);
    });

    return () => unsubscribe();
  }, [isAuthenticatedLocal]);

  const handleLogin = () => {
    if (passcode === 'batbat113' && employeeName.trim()) {
      localStorage.setItem('app_passcode', 'batbat113');
      localStorage.setItem('employee_name', employeeName.trim());
      setIsAuthenticatedLocal(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleScan = useCallback((code: string) => {
    playBeep();
    setCurrentCode(code);
    setCurrentView('session');
  }, []);

  const handleFinishSession = async (record: ScanRecord) => {
    playTing();
    if (!isAuthenticatedLocal) return;
    
    const finalRecord: ScanRecord = { 
      ...record, 
      scannedBy: employeeName || 'Nhân viên',
      scannedByUid: 'shared-device'
    };
    
    try {
      await setDoc(doc(db, 'scans', finalRecord.id), finalRecord);
    } catch (e) {
      console.error("Failed to save record to Firestore", e);
    }
    
    // Tính thời gian cho toast
    const durationSec = Math.round((finalRecord.finishTime - finalRecord.scanTime) / 1000);
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const durationStr = mins > 0 ? `${mins}p ${secs}s` : `${secs}s`;
    
    // Toast + quay về scanner ngay lập tức (bỏ màn hoàn thành)
    setToast({ show: true, code: finalRecord.code, duration: durationStr });
    setCurrentView('scanner'); // ← Camera resume ngay, quét tiếp!
    
    setTimeout(() => {
      setToast({ show: false, code: '', duration: '' });
    }, 3000);
  };

  if (!isAuthenticatedLocal) {
    return (
      <div className="min-h-screen bg-slate-100 flex justify-center font-sans text-slate-900">
        <div className="w-full max-w-md bg-white h-screen relative overflow-hidden shadow-2xl flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <Scan size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Quét Đơn Hàng</h1>
          <p className="text-slate-500 mb-8 text-sm">Nhập tên của bạn và mã truy cập kho để bắt đầu quét. Dữ liệu sẽ được đồng bộ chung.</p>
          
          <div className="w-full space-y-4 mb-6">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Tên nhân viên (VD: Tuấn)" 
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="password" 
                placeholder="Mã truy cập" 
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {loginError && (
            <p className="text-red-500 text-sm font-medium mb-4">Mã truy cập không đúng hoặc chưa nhập tên!</p>
          )}

          <button 
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            Vào Ứng Dụng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center font-sans text-slate-900 selection:bg-blue-200">
      {/* Mobile Container */}
      <div className="w-full max-w-md bg-white h-screen relative overflow-hidden shadow-2xl flex flex-col">
        
        {/* Scanner LUÔN MOUNTED — camera giữ sống, chỉ pause/resume */}
        <Scanner 
          onScan={handleScan} 
          onHistory={() => setCurrentView('history')}
          isActive={currentView === 'scanner'}
        />

        {/* Các view khác hiển thị ĐÈ LÊN scanner */}
        {currentView === 'dashboard' && (
          <div className="absolute inset-0 z-20 flex flex-col bg-slate-50">
            <DashboardView 
              history={scanHistory}
              onBack={() => setCurrentView('scanner')} 
            />
          </div>
        )}
        
        {currentView === 'session' && currentCode && (
          <div className="absolute inset-0 z-20 flex flex-col bg-slate-50">
            <CurrentSession 
              scannedCode={currentCode}
              onBack={() => setCurrentView('scanner')} 
              onFinish={handleFinishSession} 
              onHistory={() => setCurrentView('history')}
            />
          </div>
        )}

        {currentView === 'history' && (
          <div className="absolute inset-0 z-20 flex flex-col bg-slate-50">
            <HistoryView 
              history={scanHistory}
              onBack={() => setCurrentView('scanner')} 
            />
          </div>
        )}

        {currentView === 'settings' && (
          <div className="absolute inset-0 z-20 flex flex-col bg-slate-50">
            <SettingsView 
              onBack={() => setCurrentView('scanner')} 
            />
          </div>
        )}

        {/* Success Toast — hiện sau khi quét xong đơn */}
        {toast.show && (
          <div className="absolute top-5 left-4 right-4 z-[60] animate-[slideDown_0.3s_ease-out]">
            <div className="bg-green-500 text-white rounded-2xl px-5 py-4 shadow-xl shadow-green-500/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                <Check size={22} strokeWidth={3} />
              </div>
              <div className="overflow-hidden flex-1">
                <p className="font-bold text-sm">Đã lưu thành công!</p>
                <p className="text-green-100 text-xs truncate mt-0.5">{toast.code} • {toast.duration}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar */}
        <nav className="absolute bottom-0 w-full z-50 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center px-2 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center justify-center rounded-2xl px-4 py-2 active:scale-95 transition-all duration-200 ${currentView === 'dashboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className={`p-1.5 rounded-xl mb-1 ${currentView === 'dashboard' ? 'bg-blue-50' : 'bg-transparent'}`}>
              <BarChart2 size={22} strokeWidth={currentView === 'dashboard' ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] uppercase tracking-wider ${currentView === 'dashboard' ? 'font-bold' : 'font-semibold'}`}>Thống Kê</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('scanner')}
            className={`flex flex-col items-center justify-center rounded-2xl px-4 py-2 active:scale-95 transition-all duration-200 ${currentView === 'scanner' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className={`p-1.5 rounded-xl mb-1 ${currentView === 'scanner' ? 'bg-blue-50' : 'bg-transparent'}`}>
              <Scan size={22} strokeWidth={currentView === 'scanner' ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] uppercase tracking-wider ${currentView === 'scanner' ? 'font-bold' : 'font-semibold'}`}>Quét</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('history')}
            className={`flex flex-col items-center justify-center rounded-2xl px-4 py-2 active:scale-95 transition-all duration-200 ${currentView === 'history' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className={`p-1.5 rounded-xl mb-1 ${currentView === 'history' ? 'bg-blue-50' : 'bg-transparent'}`}>
              <Truck size={22} strokeWidth={currentView === 'history' ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] uppercase tracking-wider ${currentView === 'history' ? 'font-bold' : 'font-semibold'}`}>Lịch Sử</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('settings')}
            className={`flex flex-col items-center justify-center rounded-2xl px-4 py-2 active:scale-95 transition-all duration-200 ${currentView === 'settings' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className={`p-1.5 rounded-xl mb-1 ${currentView === 'settings' ? 'bg-blue-50' : 'bg-transparent'}`}>
              <Settings size={22} strokeWidth={currentView === 'settings' ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] uppercase tracking-wider ${currentView === 'settings' ? 'font-bold' : 'font-semibold'}`}>Cài Đặt</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
