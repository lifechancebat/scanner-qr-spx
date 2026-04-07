import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BarChart2, Truck, Settings, Scan, KeyRound, User, Check, AlertTriangle, RotateCcw } from 'lucide-react';
import Scanner from './components/Scanner';
import CurrentSession from './components/CurrentSession';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import DashboardView from './components/DashboardView';
import { ScanRecord } from './types';
import { playBeep, playTing, playError } from './utils/audio';
import { db } from './services/firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { isToday } from 'date-fns';

type ViewState = 'scanner' | 'session' | 'history' | 'settings' | 'dashboard';
interface Toast { show: boolean; type: 'success' | 'error'; title: string; message: string; }

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('scanner');
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [toast, setToast] = useState<Toast>({ show: false, type: 'success', title: '', message: '' });
  const [quickMode, setQuickMode] = useState(() => localStorage.getItem('quick_mode') === 'true');
  const [resumeSignal, setResumeSignal] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const [undoRecord, setUndoRecord] = useState<ScanRecord | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Auth — không lưu plaintext password trong localStorage
  const [isAuthenticatedLocal, setIsAuthenticatedLocal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('dark_mode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('dark_mode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => setDarkMode(prev => !prev), []);

  // O(1) duplicate check
  const scannedCodesSet = useMemo(() => new Set(scanHistory.map(r => r.code)), [scanHistory]);

  const todayCount = useMemo(() => scanHistory.filter(r => isToday(r.finishTime)).length, [scanHistory]);

  const activeUsers = useMemo(() => {
    const byUser = new Map<string, { count: number; lastScan: number }>();
    scanHistory.forEach(r => {
      if (isToday(r.finishTime) && r.scannedBy) {
        const prev = byUser.get(r.scannedBy);
        byUser.set(r.scannedBy, {
          count: (prev?.count || 0) + 1,
          lastScan: Math.max(prev?.lastScan || 0, r.finishTime)
        });
      }
    });
    return Array.from(byUser.entries()).map(([name, d]) => ({
      name, count: d.count,
      isRecent: Date.now() - d.lastScan < 5 * 60 * 1000
    }));
  }, [scanHistory]);

  const showToast = useCallback((type: Toast['type'], title: string, message: string, ms = 3000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ show: true, type, title, message });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), ms);
  }, []);

  const toggleQuickMode = useCallback(() => {
    setQuickMode(prev => { const next = !prev; localStorage.setItem('quick_mode', String(next)); return next; });
  }, []);

  // Auth check — chỉ lưu session flag, không lưu password
  useEffect(() => {
    const authed = localStorage.getItem('spx_authenticated');
    const n = localStorage.getItem('employee_name');
    if (authed === 'true' && n) { setEmployeeName(n); setIsAuthenticatedLocal(true); }
  }, []);

  useEffect(() => {
    if (!isAuthenticatedLocal) return;
    const q = query(collection(db, 'scans'), orderBy('scanTime', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const records: ScanRecord[] = [];
      snap.forEach(d => records.push(d.data() as ScanRecord));
      setScanHistory(records);
    }, (e) => console.error("Firestore Error:", e));
    return () => unsub();
  }, [isAuthenticatedLocal]);

  const handleLogin = () => {
    if (passcode === 'batbat113' && employeeName.trim()) {
      localStorage.setItem('spx_authenticated', 'true');
      localStorage.setItem('employee_name', employeeName.trim());
      setIsAuthenticatedLocal(true);
      setLoginError(false);
    } else { setLoginError(true); }
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('spx_authenticated');
    localStorage.removeItem('employee_name');
    setIsAuthenticatedLocal(false);
    setEmployeeName('');
    setPasscode('');
    setCurrentView('scanner');
  }, []);

  const handleScan = useCallback((code: string) => {
    navigator.vibrate?.(200);
    if (scannedCodesSet.has(code)) {
      playError();
      navigator.vibrate?.([100, 100, 100]);
      showToast('error', 'Đơn đã quét rồi!', code);
      setResumeSignal(k => k + 1);
      return;
    }
    playBeep();
    if (quickMode) {
      const record: ScanRecord = {
        id: crypto.randomUUID(), code,
        scanTime: Date.now(), finishTime: Date.now(),
        autoFinished: false,
        scannedBy: employeeName || 'Nhân viên',
        scannedByUid: 'shared-device'
      };
      setDoc(doc(db, 'scans', record.id), record).then(() => {
        playTing();
        navigator.vibrate?.([100, 50, 100]);
        showToast('success', 'Đã lưu!', code, 2000);
        setUndoRecord(record);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => setUndoRecord(null), 8000);
      }).catch((e) => {
        console.error('Quick mode save failed', e);
        showToast('error', 'Lỗi lưu!', `Không thể lưu đơn ${code}. Kiểm tra kết nối.`, 5000);
      });
      setResumeSignal(k => k + 1);
    } else {
      setCurrentCode(code);
      setCurrentView('session');
    }
  }, [scannedCodesSet, quickMode, employeeName, showToast]);

  const handleFinishSession = async (record: ScanRecord) => {
    playTing();
    navigator.vibrate?.([100, 50, 100]);
    if (!isAuthenticatedLocal) return;
    const finalRecord: ScanRecord = {
      ...record,
      scannedBy: employeeName || 'Nhân viên',
      scannedByUid: 'shared-device'
    };
    try { await setDoc(doc(db, 'scans', finalRecord.id), finalRecord); }
    catch (e) { console.error("Save failed", e); }
    const dur = Math.round((finalRecord.finishTime - finalRecord.scanTime) / 1000);
    const m = Math.floor(dur / 60), s = dur % 60;
    showToast('success', 'Đã lưu!', `${finalRecord.code} • ${m > 0 ? `${m}p ${s}s` : `${s}s`}`);
    setUndoRecord(finalRecord);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoRecord(null), 8000);
    setCurrentCode(null);
    setCurrentView('scanner');
  };

  const handleDeleteScan = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'scans', id));
      showToast('success', 'Đã xóa!', 'Đơn hàng đã được xóa khỏi lịch sử.');
    } catch (e) {
      console.error("Delete failed", e);
      showToast('error', 'Lỗi!', 'Không thể xóa đơn hàng.');
    }
  }, [showToast]);

  const handleUpdateNote = useCallback(async (id: string, notes: string) => {
    try {
      await updateDoc(doc(db, 'scans', id), { notes });
    } catch (e) {
      console.error("Update note failed", e);
      showToast('error', 'Lỗi!', 'Không thể lưu ghi chú.');
    }
  }, [showToast]);

  const handleUndo = useCallback(async () => {
    if (!undoRecord) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoRecord(null);
    await handleDeleteScan(undoRecord.id);
    showToast('success', 'Đã hoàn tác!', `Đã xóa đơn ${undoRecord.code}`, 2000);
  }, [undoRecord, handleDeleteScan, showToast]);

  if (!isAuthenticatedLocal) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex justify-center font-sans text-slate-900 dark:text-slate-100">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 h-screen relative overflow-hidden shadow-2xl flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <Scan size={40} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Quét Đơn Hàng</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">Nhập tên và mã truy cập kho để bắt đầu.</p>
          <div className="w-full space-y-4 mb-6">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="Tên nhân viên (VD: Tuấn)" value={employeeName}
                onChange={e => setEmployeeName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="password" placeholder="Mã truy cập" value={passcode}
                onChange={e => setPasscode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          {loginError && <p className="text-red-500 text-sm font-medium mb-4">Sai mã hoặc chưa nhập tên!</p>}
          <button onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
            Vào Ứng Dụng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex justify-center font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-screen relative overflow-hidden shadow-2xl flex flex-col">

        <Scanner onScan={handleScan} onHistory={() => setCurrentView('history')}
          isActive={currentView === 'scanner'} resumeSignal={resumeSignal}
          todayCount={todayCount} quickMode={quickMode}
          onToggleQuickMode={toggleQuickMode} activeUsers={activeUsers} />

        {currentView === 'dashboard' && (
          <div className="absolute inset-0 z-20 flex flex-col bg-slate-50 dark:bg-slate-900">
            <DashboardView history={scanHistory} onBack={() => setCurrentView('scanner')} />
          </div>
        )}
        {currentCode && (
          <div className={`absolute inset-0 z-20 flex flex-col bg-slate-50 dark:bg-slate-900${currentView === 'session' ? '' : ' hidden'}`}>
            <CurrentSession scannedCode={currentCode} onBack={() => setCurrentView('scanner')}
              onFinish={handleFinishSession} onHistory={() => setCurrentView('history')} />
          </div>
        )}
        {currentView === 'history' && (
          <div className="absolute inset-0 z-20 flex flex-col bg-slate-50 dark:bg-slate-900">
            <HistoryView history={scanHistory} onBack={() => setCurrentView('scanner')} onDelete={handleDeleteScan} onUpdateNote={handleUpdateNote} />
          </div>
        )}
        {currentView === 'settings' && (
          <div className="absolute inset-0 z-20 flex flex-col bg-slate-50 dark:bg-slate-900">
            <SettingsView onBack={() => setCurrentView('scanner')} darkMode={darkMode} onToggleDarkMode={toggleDarkMode} onLogout={handleLogout} />
          </div>
        )}

        {toast.show && (
          <div className="absolute top-5 left-4 right-4 z-[60] animate-[slideDown_0.3s_ease-out]">
            <div className={`rounded-2xl px-5 py-4 shadow-xl flex items-center gap-3 ${toast.type === 'success' ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-red-500 text-white shadow-red-500/30'}`}>
              <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                {toast.type === 'success' ? <Check size={22} strokeWidth={3} /> : <AlertTriangle size={22} strokeWidth={2.5} />}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="font-bold text-sm">{toast.title}</p>
                <p className={`text-xs truncate mt-0.5 ${toast.type === 'success' ? 'text-green-100' : 'text-red-100'}`}>{toast.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Undo banner — hiện 8 giây sau khi lưu đơn */}
        {undoRecord && (
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+72px)] left-4 right-4 z-[55] animate-[slideDown_0.25s_ease-out]">
            <div className="bg-slate-800 dark:bg-slate-700 rounded-2xl px-4 py-3 shadow-2xl flex items-center justify-between gap-3 border border-slate-600">
              <div className="overflow-hidden">
                <p className="text-xs text-slate-400">Vừa lưu xong</p>
                <p className="text-sm font-bold text-white truncate">{undoRecord.code}</p>
              </div>
              <button
                onClick={handleUndo}
                className="flex items-center gap-1.5 text-amber-400 font-bold text-sm bg-amber-400/10 hover:bg-amber-400/20 px-3 py-2 rounded-xl active:scale-95 transition-all shrink-0"
              >
                <RotateCcw size={14} />
                Hoàn Tác
              </button>
            </div>
          </div>
        )}

        <nav className="absolute bottom-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 flex justify-around items-center px-2 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2">
          {([
            { view: 'dashboard' as ViewState, icon: BarChart2, label: 'Thống Kê' },
            { view: 'scanner' as ViewState, icon: Scan, label: 'Quét' },
            { view: 'history' as ViewState, icon: Truck, label: 'Lịch Sử' },
            { view: 'settings' as ViewState, icon: Settings, label: 'Cài Đặt' },
          ]).map(({ view, icon: Icon, label }) => (
            <button key={view}
              onClick={() => {
                if (view === 'scanner' && currentCode) setCurrentView('session');
                else setCurrentView(view);
              }}
              className={`flex flex-col items-center justify-center rounded-2xl px-4 py-2 active:scale-95 transition-all duration-200 ${
                (currentView === view || (view === 'scanner' && currentView === 'session'))
                  ? 'text-blue-600' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
              }`}>
              <div className={`p-1.5 rounded-xl mb-1 ${
                (currentView === view || (view === 'scanner' && currentView === 'session'))
                  ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-transparent'
              }`}>
                <Icon size={22} strokeWidth={(currentView === view || (view === 'scanner' && currentView === 'session')) ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] uppercase tracking-wider ${
                (currentView === view || (view === 'scanner' && currentView === 'session')) ? 'font-bold' : 'font-semibold'
              }`}>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
