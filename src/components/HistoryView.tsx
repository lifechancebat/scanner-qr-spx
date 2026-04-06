import { useState } from 'react';
import { ArrowLeft, Search, Package, Clock, Calendar, Sparkles, User, Download, Trash2, X, Play, Copy, Video, AlertCircle } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ScanRecord } from '../types';
import { analyzePackingPerformance } from '../services/ai';

interface HistoryViewProps {
  history: ScanRecord[];
  onBack: () => void;
  onDelete: (id: string) => void;
}

interface CameraConfig {
  ip: string; port: string; username: string; password: string; urlFormat: '1' | '2' | '3';
}

// Chuyển timestamp (ms) → UTC string format Dahua: YYYY_MM_DD_HH_MM_SS
const toRtspTime = (ts: number): string => {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}_${p(d.getUTCMonth()+1)}_${p(d.getUTCDate())}_${p(d.getUTCHours())}_${p(d.getUTCMinutes())}_${p(d.getUTCSeconds())}`;
};

const buildVlcUrl = (cfg: CameraConfig, startTs: number, endTs: number): { vlc: string; rtsp: string } => {
  const start = toRtspTime(startTs);
  const end   = toRtspTime(endTs);
  const port = cfg.port || '554';
  const auth  = `rtsp://${cfg.username}:${cfg.password}@${cfg.ip}:${port}`;
  
  let path: string;
  switch (cfg.urlFormat) {
    case '2':
      // Hikvision-style (một số Dahua mới cũng hỗ trợ)
      path = `/Streaming/tracks/101?starttime=${start}&endtime=${end}`;
      break;
    case '3':
      // Live stream test (không playback, chỉ xem trực tiếp)
      path = `/cam/realmonitor?channel=1&subtype=0`;
      break;
    default:
      // Format 1: Dahua chuẩn - playback từ SD card
      path = `/cam/playback?channel=1&starttime=${start}&endtime=${end}`;
      break;
  }
  
  const rtsp = auth + path;
  return { vlc: `vlc://${rtsp}`, rtsp };
};

export default function HistoryView({ history, onBack, onDelete }: HistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const cameraConfig: CameraConfig | null = (() => {
    try {
      const s = localStorage.getItem('dahua_camera_config');
      if (!s) return null;
      const c = JSON.parse(s) as CameraConfig;
      return c.ip && c.password ? c : null;
    } catch { return null; }
  })();

  const filteredHistory = history.filter(record => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = record.code.toLowerCase().includes(term) || record.scannedBy?.toLowerCase().includes(term);
    
    if (selectedDate) {
      const filterDate = new Date(selectedDate);
      return matchesSearch && isSameDay(record.finishTime, filterDate);
    }
    return matchesSearch;
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const insight = await analyzePackingPerformance(history);
    setAiInsight(insight);
    setIsAnalyzing(false);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setConfirmDeleteId(null);
  };

  const exportToCSV = () => {
    if (history.length === 0) return;
    const headers = ['Mã Vận Đơn', 'Người Quét', 'Bắt Đầu', 'Kết Thúc', 'Thời Gian (giây)', 'Tự Động KT'];
    const rows = history.map(record => {
      const duration = Math.round((record.finishTime - record.scanTime) / 1000);
      const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;
      return [
        escapeCSV(record.code), escapeCSV(record.scannedBy || ''),
        escapeCSV(format(record.scanTime, 'yyyy-MM-dd HH:mm:ss')),
        escapeCSV(format(record.finishTime, 'yyyy-MM-dd HH:mm:ss')),
        duration, record.autoFinished ? 'Có' : 'Không'
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lich-su-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-y-auto pb-24 flex flex-col">
      <header className="bg-slate-50 dark:bg-slate-900 flex items-center justify-between px-4 h-16 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-blue-600 active:scale-95 transition-transform">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-bold text-lg text-slate-900 dark:text-white">Lịch Sử Đóng Gói</h1>
        </div>
        <button onClick={exportToCSV} className="text-blue-600 active:scale-95 transition-transform" title="Xuất CSV">
          <Download size={24} />
        </button>
      </header>

      <div className="p-6 flex-1 flex flex-col gap-6">
        {/* AI Insights */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-purple-100 dark:border-purple-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <Sparkles size={18} className="text-purple-600 dark:text-purple-400" />
              Trợ lý AI
            </h3>
            <button onClick={handleAnalyze} disabled={isAnalyzing || history.length === 0}
              className="text-xs font-bold bg-purple-600 text-white px-3 py-1.5 rounded-lg active:scale-95 transition-transform disabled:opacity-50">
              {isAnalyzing ? "Đang phân tích..." : "Phân tích"}
            </button>
          </div>
          {aiInsight ? (
            <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed bg-white/60 dark:bg-white/10 p-3 rounded-xl">{aiInsight}</p>
          ) : (
            <p className="text-xs text-purple-600/80 dark:text-purple-400/80">Nhấn nút để AI phân tích hiệu suất.</p>
          )}
        </div>

        {/* Search + Date Filter */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" placeholder="Tìm mã vận đơn, tên..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm shadow-sm border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="date" value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm shadow-sm border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
            </div>
            {selectedDate && (
              <button onClick={() => setSelectedDate('')}
                className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl p-2.5 active:scale-95 transition-transform">
                <X size={16} />
              </button>
            )}
          </div>
          {selectedDate && (
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Hiển thị {filteredHistory.length} đơn ngày {format(new Date(selectedDate), 'dd/MM/yyyy')}
            </p>
          )}
        </div>

        {/* Records List */}
        <div className="flex flex-col gap-4">
          {filteredHistory.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-slate-400 mt-10">
              <Package size={48} className="mx-auto mb-4 opacity-20" />
              <p>Không tìm thấy dữ liệu.</p>
            </div>
          ) : (
            filteredHistory.map((record) => {
              const duration = Math.round((record.finishTime - record.scanTime) / 1000);
              const minutes = Math.floor(duration / 60);
              const seconds = duration % 60;
              
              return (
                <div key={record.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shrink-0">
                        <Package size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-slate-900 dark:text-white truncate">{record.code}</h4>
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs mt-1">
                          <Calendar size={12} />
                          <span>{format(record.scanTime, 'dd/MM/yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {record.autoFinished && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold px-2 py-1 rounded uppercase tracking-wider whitespace-nowrap">
                          Tự động
                        </span>
                      )}
                      {/* Delete button */}
                      {confirmDeleteId === record.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button onClick={() => handleDelete(record.id)}
                            className="text-[10px] bg-red-500 text-white font-bold px-2 py-1 rounded active:scale-95">Xóa</button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold px-2 py-1 rounded active:scale-95">Hủy</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(record.id)}
                          className="text-slate-300 dark:text-slate-600 hover:text-red-400 p-1 active:scale-90 transition-all ml-1">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-1 pt-3 border-t border-slate-50 dark:border-slate-700">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bắt đầu</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{format(record.scanTime, 'HH:mm:ss')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hoàn thành</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{format(record.finishTime, 'HH:mm:ss')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 p-2 rounded-lg">
                    <Clock size={14} className="text-blue-500" />
                    <span>Thời gian: {minutes}p {seconds}s</span>
                  </div>
                  
                  {record.scannedBy && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                      <User size={12} />
                      <span>Người quét: {record.scannedBy}</span>
                    </div>
                  )}

                  {/* Video playback button */}
                  {cameraConfig ? (() => {
                    const urls = buildVlcUrl(cameraConfig, record.scanTime, record.finishTime);
                    return (
                      <div className="flex gap-2 pt-2 border-t border-slate-50 dark:border-slate-700 mt-1">
                        <a
                          href={urls.vlc}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-all shadow-sm shadow-teal-500/20"
                        >
                          <Play size={14} />
                          Xem Video (VLC)
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(urls.rtsp);
                            setCopiedId(record.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          title="Copy RTSP URL"
                          className={`flex items-center justify-center px-3 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                            copiedId === record.id
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    );
                  })() : (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg mt-1">
                      <AlertCircle size={12} />
                      <span>Chưa cấu hình camera. Vào <strong>Cài Đặt → Camera Dahua</strong>.</span>
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
