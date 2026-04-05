import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  Truck, 
  Settings,
  Scan,
  KeyRound,
  User
} from 'lucide-react';
import Scanner from './components/Scanner';
import CurrentSession from './components/CurrentSession';
import SessionComplete from './components/SessionComplete';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import DashboardView from './components/DashboardView';
import { ScanRecord } from './types';
import { playBeep, playTing } from './utils/audio';
import { db } from './services/firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc, updateDoc } from 'firebase/firestore';

type ViewState = 'scanner' | 'session' | 'complete' | 'history' | 'settings' | 'dashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('scanner');
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [lastRecord, setLastRecord] = useState<ScanRecord | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  
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

  const handleScan = (code: string) => {
    playBeep();
    setCurrentCode(code);
    setCurrentView('session');
  };

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
    
    setLastRecord(finalRecord);
    setCurrentView('complete');
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
        
        {currentView === 'dashboard' && (
          <DashboardView 
            history={scanHistory}
            onBack={() => setCurrentView('scanner')} 
          />
        )}

        {currentView === 'scanner' && (
          <Scanner 
            onScan={handleScan} 
            onHistory={() => setCurrentView('history')} 
          />
        )}
        
        {currentView === 'session' && currentCode && (
          <CurrentSession 
            scannedCode={currentCode}
            onBack={() => setCurrentView('scanner')} 
            onFinish={handleFinishSession} 
            onHistory={() => setCurrentView('history')}
          />
        )}

        {currentView === 'complete' && (
          <SessionComplete 
            record={lastRecord}
            onBack={() => setCurrentView('history')} 
            onNewSession={() => setCurrentView('scanner')} 
            onHistory={() => setCurrentView('history')}
          />
        )}

        {currentView === 'history' && (
          <HistoryView 
            history={scanHistory}
            onBack={() => setCurrentView('scanner')} 
          />
        )}

        {currentView === 'settings' && (
          <SettingsView 
            onBack={() => setCurrentView('scanner')} 
          />
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
