
import { ArrowLeft, History, Check, Timer, Package, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ScanRecord } from '../types';

interface SessionCompleteProps {
  record: ScanRecord | null;
  onBack: () => void;
  onNewSession: () => void;
  onHistory: () => void;
}

export default function SessionComplete({ record, onBack, onNewSession, onHistory }: SessionCompleteProps) {
  if (!record) return null;

  const duration = Math.round((record.finishTime - record.scanTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto pb-24 flex flex-col">
      <header className="bg-slate-50 flex items-center justify-between px-4 h-16 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-blue-600 active:scale-95 transition-transform">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-bold text-lg text-slate-900">Hoàn Thành</h1>
        </div>
        <button onClick={onHistory} className="text-blue-600 active:scale-95 transition-transform">
          <History size={24} />
        </button>
      </header>

      <div className="p-6 flex-1 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-blue-300/40 flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#0066FF] flex items-center justify-center text-white shadow-lg">
            <Check size={32} strokeWidth={3} />
          </div>
        </div>

        <h2 className="text-3xl font-black text-slate-900 mb-2">Đã Đóng Gói!</h2>
        <p className="text-slate-600 mb-8">Đơn hàng đã được ghi nhận thành công.</p>

        <div className="w-full bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center mb-4 relative overflow-hidden">
          <p className="text-xs font-bold text-blue-700 tracking-wider uppercase mb-2">Mã Đơn Hàng</p>
          <p className="text-lg font-mono font-bold text-slate-900 break-all">{record.code}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full mb-8">
          <div className="bg-slate-200/50 rounded-2xl p-4 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-700 mb-2 shadow-sm">
              <Timer size={20} />
            </div>
            <p className="text-[10px] font-bold text-slate-600 tracking-wider uppercase mb-1">Thời Gian</p>
            <p className="text-xl font-black text-slate-900">{minutes}p {seconds}s</p>
          </div>
          
          <div className="bg-slate-200/50 rounded-2xl p-4 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-700 mb-2 shadow-sm">
              <Package size={20} />
            </div>
            <p className="text-[10px] font-bold text-slate-600 tracking-wider uppercase mb-1">Trạng Thái</p>
            <p className="text-sm font-bold text-slate-900 text-center">
              {record.autoFinished ? 'Tự động KT' : 'Thủ công'}
            </p>
          </div>
        </div>

        <div className="w-full text-left mb-4">
          <p className="text-sm font-bold text-slate-700 tracking-wider uppercase">Chi Tiết Thời Gian</p>
        </div>

        <div className="w-full flex flex-col gap-3 mb-8">
          <div className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
            <span className="text-sm font-medium text-slate-600">Bắt đầu quét</span>
            <span className="text-sm font-bold text-slate-900">{format(record.scanTime, 'HH:mm:ss - dd/MM/yyyy')}</span>
          </div>
          <div className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
            <span className="text-sm font-medium text-slate-600">Kết thúc</span>
            <span className="text-sm font-bold text-slate-900">{format(record.finishTime, 'HH:mm:ss - dd/MM/yyyy')}</span>
          </div>
        </div>

        <button 
          onClick={onNewSession}
          className="w-full bg-[#0066FF] hover:bg-blue-700 text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all mb-3"
        >
          <Plus size={20} />
          Quét Đơn Mới
        </button>
      </div>
    </div>
  );
}
