import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, History, Package, Check, Clock } from 'lucide-react';
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

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-y-auto pb-24 flex flex-col">
      <header className="bg-slate-50 dark:bg-slate-900 flex items-center justify-between px-4 h-16 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-blue-600 active:scale-95 transition-transform">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-bold text-lg text-slate-900 dark:text-white">Đang Đóng Gói</h1>
        </div>
        <button onClick={onHistory} className="text-blue-600 active:scale-95 transition-transform">
          <History size={24} />
        </button>
      </header>

      <div className="p-6 flex-1 flex flex-col gap-6">
        <div>
          <p className="text-xs font-bold text-red-700 dark:text-red-400 tracking-wider uppercase mb-1">Phiên Hiện Tại</p>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-1">Đơn Hàng</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 break-all font-mono bg-slate-200 dark:bg-slate-700 p-2 rounded-lg mt-2 inline-block">
            {scannedCode}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border-l-4 border-transparent">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">Trạng Thái</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">Đang xử lý</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border-l-4 border-amber-500">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">Thời Gian Còn Lại</p>
            <div className="flex items-center gap-2 mt-2 text-amber-600 dark:text-amber-400">
              <Clock size={20} />
              <span className="text-2xl font-black">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-600 dark:bg-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center mt-4 border-2 border-blue-400 dark:border-blue-300 shadow-lg shadow-blue-500/30">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Package size={36} className="text-white" />
          </div>
          <p className="text-center text-white font-bold text-lg leading-snug">
            📦 Đặt đơn vào thùng
          </p>
          <p className="text-center text-blue-100 font-medium text-sm mt-2">
            Nhấn <span className="text-white font-bold">"Kết Thúc"</span> khi đóng gói xong
          </p>
          <p className="text-center text-blue-200 text-xs mt-2">
            Tự động kết thúc sau {timeoutMinutes} phút
          </p>
        </div>

        <div className="mt-auto pt-6">
          <button onClick={() => handleFinish(false)}
            className="w-full bg-[#0066FF] hover:bg-blue-700 text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
            <Check size={20} />
            Kết Thúc Đóng Gói
          </button>
        </div>
      </div>
    </div>
  );
}
