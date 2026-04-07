import React, { useState, useRef } from 'react';
import { ArrowLeft, Search, Package, Clock, Calendar, User, Download, Trash2, X, Play, Copy, Video, AlertCircle, Loader2, MessageSquare, Check, FileSpreadsheet } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import * as XLSX from 'xlsx';
import { ScanRecord } from '../types';

interface HistoryViewProps {
  history: ScanRecord[];
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdateNote: (id: string, notes: string) => Promise<void>;
}

interface CameraConfig {
  ip: string; port: string; username: string; password: string; urlFormat: '1' | '2' | '3'; toolUrl?: string; tabletUrl?: string;
}

// Chuyển timestamp (ms) → Dahua RTSP format: YYYY_MM_DD_HH_MM_SS (LOCAL time)
const toLocalDahuaTime = (ts: number): string => {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}_${p(d.getMonth()+1)}_${p(d.getDate())}_${p(d.getHours())}_${p(d.getMinutes())}_${p(d.getSeconds())}`;
};

// Build các tham số cho tool PC - dùng đúng thời gian bắt đầu/kết thúc
const buildToolParams = (startTs: number, endTs: number, orderCode: string) => {
  const dStart = new Date(startTs);
  const dEnd = new Date(endTs);
  const p = (n: number) => n.toString().padStart(2, '0');
  
  const date = `${dStart.getFullYear()}-${p(dStart.getMonth()+1)}-${p(dStart.getDate())}`;
  const startTime = `${p(dStart.getHours())}:${p(dStart.getMinutes())}:${p(dStart.getSeconds())}`;
  const endTime = `${p(dEnd.getHours())}:${p(dEnd.getMinutes())}:${p(dEnd.getSeconds())}`;
  
  return `date=${date}&startTime=${startTime}&endTime=${endTime}&orderCode=${encodeURIComponent(orderCode)}`;
};

// Build VLC URL cho playback từ thẻ nhớ camera — dùng đúng thời gian quét
const buildVlcPlaybackUrl = (cfg: CameraConfig, startTs: number, endTs: number) => {
  const start = toLocalDahuaTime(startTs);
  const end = toLocalDahuaTime(endTs);
  const rtsp = `rtsp://${cfg.username}:${cfg.password}@${cfg.ip}:${cfg.port || '554'}/cam/playback?channel=1&starttime=${start}&endtime=${end}`;
  return { vlc: `vlc://${rtsp}`, rtsp };
};

export default function HistoryView({ history, onBack, onDelete, onUpdateNote }: HistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingVideoId, setLoadingVideoId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

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

  const exportToExcel = () => {
    const dataToExport = filteredHistory.length > 0 ? filteredHistory : history;
    if (dataToExport.length === 0) return;

    const dateLabel = selectedDate
      ? format(new Date(selectedDate + 'T00:00:00'), 'dd-MM-yyyy')
      : format(new Date(), 'dd-MM-yyyy');

    const rows = dataToExport.map((r, i) => {
      const durSec = Math.round((r.finishTime - r.scanTime) / 1000);
      const durMin = Math.floor(durSec / 60);
      const durS = durSec % 60;
      return {
        'STT': i + 1,
        'M\u00e3 V\u1eadn \u0110\u01a1n': r.code,
        'Nh\u00e2n Vi\u00ean': r.scannedBy || '',
        'B\u1eaft \u0110\u1ea7u': format(r.scanTime, 'HH:mm:ss'),
        'K\u1ebft Th\u00fac': format(r.finishTime, 'HH:mm:ss'),
        'Ng\u00e0y': format(r.scanTime, 'dd/MM/yyyy'),
        'Th\u1eddi L\u01b0\u1ee3ng': `${durMin}p ${durS}s`,
        'Gi\u00e2y': durSec,
        'Ghi Ch\u00fa': r.notes || '',
        'T\u1ef1 K\u1ebft Th\u00fac': r.autoFinished ? 'C\u00f3' : 'Kh\u00f4ng'
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 }, { wch: 26 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 7 }, { wch: 30 }, { wch: 12 }
    ];

    // Style header row
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
      if (cell) {
        cell.s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1E40AF' } },
          alignment: { horizontal: 'center' }
        };
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh S\u00e1ch \u0110\u01a1n');
    XLSX.writeFile(wb, `SPX_${dateLabel}_${dataToExport.length}don.xlsx`);
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-y-auto pb-24 flex flex-col" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'none', maxWidth: '100%' } as React.CSSProperties}>
      <header className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-between px-4 h-16 shrink-0 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-blue-600 active:scale-95 transition-transform">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-bold text-lg text-slate-900 dark:text-white">Lịch Sử Đóng Gói</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-40"
            title="Xu\u1ea5t Excel"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <button onClick={exportToCSV} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 active:scale-95 transition-transform p-1" title="Xu\u1ea5t CSV">
            <Download size={20} />
          </button>
        </div>
      </header>

      <div className="p-6 flex-1 flex flex-col gap-6">
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

                  {/* Notes section */}
                  <div className="mt-2">
                    {editingNoteId === record.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          ref={noteInputRef}
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          placeholder="Ghi chú về đơn này..."
                          rows={2}
                          className="w-full text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 resize-none outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              setSavingNoteId(record.id);
                              await onUpdateNote(record.id, noteText.trim());
                              setSavingNoteId(null);
                              setEditingNoteId(null);
                            }}
                            disabled={savingNoteId === record.id}
                            className="flex items-center gap-1 text-[11px] font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                          >
                            {savingNoteId === record.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            Lưu
                          </button>
                          <button
                            onClick={() => setEditingNoteId(null)}
                            className="text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-lg active:scale-95"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingNoteId(record.id);
                          setNoteText(record.notes || '');
                          setTimeout(() => noteInputRef.current?.focus(), 50);
                        }}
                        className={`flex items-center gap-1.5 text-[11px] w-full text-left rounded-xl px-3 py-2 transition-all ${
                          record.notes
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700'
                            : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <MessageSquare size={12} className="shrink-0" />
                        <span className="truncate">{record.notes || 'Thêm ghi chú...'}</span>
                      </button>
                    )}
                  </div>

                  {/* Video playback button */}
                  {cameraConfig ? (() => {
                    const urls = buildVlcPlaybackUrl(cameraConfig, record.scanTime, record.finishTime);
                    const minutesAgo = Math.floor((Date.now() - record.finishTime) / 60_000);
                    const isRecent = minutesAgo < 5;
                    return (
                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-50 dark:border-slate-700 mt-1">
                        {isRecent && (
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg">
                            <Clock size={11} />
                            <span>Camera đang ghi — chờ ~{5 - minutesAgo}p nữa để xem video</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <a
                            href={urls.vlc}
                            className={`flex flex-col items-center justify-center gap-0.5 text-white py-2 rounded-xl active:scale-95 transition-all shadow-sm flex-1 ${
                              isRecent 
                                ? 'bg-slate-400 shadow-slate-400/20' 
                                : 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/20'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <Play size={14} />
                              {isRecent ? '⏳ Thử Xem (VLC)' : '▶ Xem (VLC)'}
                            </div>
                            <span className="text-[9px] opacity-80">Ghi Màn Hình</span>
                          </a>

                          {/* Tablet download button */}
                          {cameraConfig.tabletUrl && (
                            <a
                              href={`${cameraConfig.tabletUrl.replace(/\/+$/, '')}/download?start=${record.scanTime}&end=${record.finishTime}&code=${encodeURIComponent(record.code)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                setDownloadingId(record.id);
                                setTimeout(() => setDownloadingId(null), 60_000);
                              }}
                              className={`flex flex-col items-center justify-center gap-0.5 text-white py-2 rounded-xl active:scale-95 transition-all shadow-sm flex-1 ${
                                isRecent
                                  ? 'bg-slate-400 shadow-slate-400/20'
                                  : downloadingId === record.id
                                  ? 'bg-amber-500 shadow-amber-500/20'
                                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-bold text-xs">
                                {downloadingId === record.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                {isRecent ? '⏳ Chờ Ghi' : downloadingId === record.id ? 'Đang tải...' : '⬇ Tải Video'}
                              </div>
                              <span className="text-[9px] opacity-80">
                                {downloadingId === record.id ? 'Mở Files khi xong' : 'Tablet → iPhone'}
                              </span>
                            </a>
                          )}

                          {cameraConfig.toolUrl && (
                            <a
                              href={`${cameraConfig.toolUrl.replace(/\/+$/, '')}/auto-download?${buildToolParams(record.scanTime, record.finishTime, record.code)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                setDownloadingId(record.id);
                                setTimeout(() => setDownloadingId(null), 45_000);
                              }}
                              className={`flex flex-col items-center justify-center gap-0.5 text-white py-2 rounded-xl active:scale-95 transition-all shadow-sm flex-1 ${
                                isRecent
                                  ? 'bg-slate-400 shadow-slate-400/20'
                                  : downloadingId === record.id
                                  ? 'bg-amber-500 shadow-amber-500/20'
                                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-bold text-xs">
                                {downloadingId === record.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                {isRecent ? '⏳ Thử Máy Tính' : downloadingId === record.id ? 'Đang tải...' : '📥 Tải Máy Tính'}
                              </div>
                              <span className="text-[9px] opacity-80">
                                {downloadingId === record.id ? 'Mở file khi xong ~30s' : 'Lưu file MP4 cực nét'}
                              </span>
                            </a>
                          )}

                          {!cameraConfig.toolUrl && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(urls.rtsp);
                                setCopiedId(record.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              title="Copy RTSP URL"
                              className={`flex items-center justify-center px-4 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                                copiedId === record.id
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {copiedId === record.id ? '✓' : <Copy size={16} />}
                            </button>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-relaxed text-center mt-1">
                          ⏱ Khung giờ: {format(record.scanTime, 'HH:mm:ss')} → {format(record.finishTime, 'HH:mm:ss')}
                        </p>
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
