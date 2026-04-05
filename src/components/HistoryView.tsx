import { useState } from 'react';
import { ArrowLeft, Search, Package, Clock, Calendar, Sparkles, User, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ScanRecord } from '../types';
import { analyzePackingPerformance } from '../services/ai';

interface HistoryViewProps {
  history: ScanRecord[];
  onBack: () => void;
}

export default function HistoryView({ history, onBack }: HistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

    const filteredHistory = history.filter(record => {
      const term = searchTerm.toLowerCase();
      return (
        record.code.toLowerCase().includes(term) ||
        record.scannedBy?.toLowerCase().includes(term)
      );
    });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const insight = await analyzePackingPerformance(history);
    setAiInsight(insight);
    setIsAnalyzing(false);
  };

  const exportToCSV = () => {
    if (history.length === 0) return;
    
    const headers = ['Mã Vận Đơn', 'Người Quét', 'Bắt Đầu', 'Kết Thúc', 'Thời Gian Đóng Gói (giây)', 'Tự Động Kết Thúc'];
    
    const rows = history.map(record => {
      const duration = Math.round((record.finishTime - record.scanTime) / 1000);
      const scannedBy = record.scannedBy || '';
      
      // Escape quotes and wrap in quotes to handle commas in text
      const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;
      
      return [
        escapeCSV(record.code),
        escapeCSV(scannedBy),
        escapeCSV(format(record.scanTime, 'yyyy-MM-dd HH:mm:ss')),
        escapeCSV(format(record.finishTime, 'yyyy-MM-dd HH:mm:ss')),
        duration,
        record.autoFinished ? 'Có' : 'Không'
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    // Add BOM for UTF-8 Excel compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lich-su-dong-goi-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto pb-24 flex flex-col">
      <header className="bg-slate-50 flex items-center justify-between px-4 h-16 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-blue-600 active:scale-95 transition-transform">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-bold text-lg text-slate-900">Lịch Sử Đóng Gói</h1>
        </div>
        <button onClick={exportToCSV} className="text-blue-600 active:scale-95 transition-transform" title="Xuất CSV">
          <Download size={24} />
        </button>
      </header>

      <div className="p-6 flex-1 flex flex-col gap-6">
        
        {/* AI Insights Section */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-purple-900 flex items-center gap-2">
              <Sparkles size={18} className="text-purple-600" />
              Trợ lý AI Quản lý Kho
            </h3>
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || history.length === 0}
              className="text-xs font-bold bg-purple-600 text-white px-3 py-1.5 rounded-lg active:scale-95 transition-transform disabled:opacity-50"
            >
              {isAnalyzing ? "Đang phân tích..." : "Phân tích hiệu suất"}
            </button>
          </div>
          {aiInsight ? (
            <p className="text-sm text-purple-800 leading-relaxed bg-white/60 p-3 rounded-xl">
              {aiInsight}
            </p>
          ) : (
            <p className="text-xs text-purple-600/80">
              Nhấn nút để AI phân tích tốc độ đóng gói và đưa ra lời khuyên tối ưu cho bạn.
            </p>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Tìm mã vận đơn, tên, SĐT..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white rounded-xl py-3 pl-10 pr-4 text-sm shadow-sm border-none focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-col gap-4">
          {filteredHistory.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">
              <Package size={48} className="mx-auto mb-4 opacity-20" />
              <p>Chưa có dữ liệu hoặc không tìm thấy kết quả.</p>
            </div>
          ) : (
            filteredHistory.map((record) => {
              const duration = Math.round((record.finishTime - record.scanTime) / 1000);
              const minutes = Math.floor(duration / 60);
              const seconds = duration % 60;
              
              return (
                <div key={record.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                        <Package size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-slate-900 truncate">{record.code}</h4>
                        <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                          <Calendar size={12} />
                          <span>{format(record.scanTime, 'dd/MM/yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    {record.autoFinished && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded uppercase tracking-wider whitespace-nowrap">
                        Tự động KT
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-1 pt-3 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bắt đầu quét</p>
                      <p className="text-sm font-medium text-slate-700">{format(record.scanTime, 'HH:mm:ss')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hoàn thành</p>
                      <p className="text-sm font-medium text-slate-700">{format(record.finishTime, 'HH:mm:ss')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 p-2 rounded-lg">
                    <Clock size={14} className="text-blue-500" />
                    <span>Thời gian đóng gói: {minutes}p {seconds}s</span>
                  </div>
                  
                  {record.scannedBy && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                      <User size={12} />
                      <span>Người quét: {record.scannedBy}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
