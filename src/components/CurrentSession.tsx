import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, History, Package, Check, Clock, Zap } from 'lucide-react';
import { ScanRecord } from '../types';

interface CurrentSessionProps {
  scannedCode: string;
  onBack: () => void;
  onFinish: (record: ScanRecord) => void;
  onHistory: () => void;
}

export default function CurrentSession({ scannedCode, onBack, onFinish, onHistory }: CurrentSessionProps) {
  const [scanTime] = useState<number>(Date.now());
  const timeoutMinutes = parseInt(localStorage.getItem('session_timeout_minutes') || '10', 10);
  const [timeLeft, setTimeLeft] = useState<number>(timeoutMinutes * 60);
  const onFinishRef = useRef(onFinish);
  const scannedCodeRef = useRef(scannedCode);
  const scanTimeRef = useRef(scanTime);

  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);
  useEffect(() => { scannedCodeRef.current = scannedCode; }, [scannedCode]);
  useEffect(() => { scanTimeRef.current = scanTime; }, [scanTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); handleFinish(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFinish = useCallback((autoFinished: boolean = false) => {
    const record: ScanRecord = {
      id: crypto.randomUUID(), code: scannedCodeRef.current,
      scanTime: scanTimeRef.current, finishTime: Date.now(), autoFinished
    };
    onFinishRef.current(record);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isUrgent = timeLeft <= 60;
  const progress = ((timeoutMinutes * 60 - timeLeft) / (timeoutMinutes * 60)) * 100;

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-slate-50 dark:bg-slate-900 flex items-center justify-between px-4 h-16 shrink-0 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 active:scale-90 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-lg text-slate-900 dark:text-white">Đang Đóng Gói</h1>
        </div>
        <button onClick={onHistory} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 active:scale-90 transition-transform">
          <History size={20} />
        </button>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ touchAction: 'pan-y' }}>
        <div className="p-5 flex flex-col gap-4">

          {/* Order info */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-bold text-red-500 tracking-widest uppercase mb-1">Phiên Hiện Tại</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mb-3">Đơn Hàng</p>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/60 rounded-xl px-3 py-2.5">
              <Package size={15} className="text-blue-500 shrink-0" />
              <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200 break-all">{scannedCode}</span>
            </div>
          </div>

          {/* Status + Timer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-2">Trạng Thái</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0"></div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Đang xử lý</span>
              </div>
            </div>
            <div className={`rounded-2xl p-4 shadow-sm border ${isUrgent ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-700'}`}>
              <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-2">Còn Lại</p>
              <div className={`flex items-center gap-1.5 ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                <Clock size={16} className={isUrgent ? 'animate-pulse' : ''} />
                <span className="text-xl font-black tabular-nums">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiến độ thời gian</span>
              <span className="text-[10px] font-bold text-slate-500">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : progress > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Instruction card */}
          <div className="relative rounded-2xl overflow-hidden shadow-lg shadow-blue-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700"></div>
            <div className="relative p-5 flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-1">
                <Package size={28} className="text-white" />
              </div>
              <p className="text-white font-extrabold text-base tracking-tight">📦 Đặt đơn vào thùng</p>
              <p className="text-blue-100 text-sm leading-relaxed">
                Nhấn <span className="bg-white/20 text-white font-bold px-1.5 py-0.5 rounded-md">"Kết Thúc"</span> khi đóng gói xong
              </p>
              <div className="flex items-center gap-1.5 mt-1 bg-white/10 rounded-full px-3 py-1">
                <Zap size={11} className="text-amber-300" />
                <p className="text-blue-200 text-[11px]">Tự động kết thúc sau {timeoutMinutes} phút</p>
              </div>
            </div>
          </div>

          {/* Finish button — elevated, well above nav bar */}
          <div className="mt-2 mb-6">
            <button
              onClick={() => handleFinish(false)}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl py-5 font-extrabold text-base flex items-center justify-center gap-2.5 shadow-xl shadow-blue-600/40 active:scale-95 transition-all duration-150"
            >
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Check size={16} strokeWidth={3} />
              </div>
              Kết Thúc Đóng Gói
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-2.5">Nhấn để lưu và hoàn thành phiên đóng gói</p>
          </div>

        </div>
      </div>
    </div>
  );
}
