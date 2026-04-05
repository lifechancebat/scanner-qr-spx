import { useEffect, useRef, useState } from 'react';
import { History, ScanLine, Flashlight, FlashlightOff, Zap, Package, Users } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ActiveUser { name: string; count: number; isRecent: boolean; }

interface ScannerProps {
  onScan: (code: string) => void;
  onHistory: () => void;
  isActive: boolean;
  resumeSignal: number;
  todayCount: number;
  quickMode: boolean;
  onToggleQuickMode: () => void;
  activeUsers: ActiveUser[];
}

const STATE_SCANNING = 2;
const STATE_PAUSED = 3;

export default function Scanner({ 
  onScan, onHistory, isActive, resumeSignal,
  todayCount, quickMode, onToggleQuickMode, activeUsers 
}: ScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isUnmounted = useRef(false);
  const onScanRef = useRef(onScan);

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  // Pause/Resume based on isActive
  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const state = scanner.getState();
      if (isActive && state === STATE_PAUSED) scanner.resume();
      else if (!isActive && state === STATE_SCANNING) scanner.pause(false);
    } catch {}
  }, [isActive]);

  // Resume signal — cho quick mode / duplicate detection
  useEffect(() => {
    if (resumeSignal === 0) return;
    const timer = setTimeout(() => {
      try {
        if (scannerRef.current?.getState() === STATE_PAUSED) scannerRef.current.resume();
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [resumeSignal]);

  // Camera init — MỘT LẦN DUY NHẤT
  useEffect(() => {
    isUnmounted.current = false;
    const initScanner = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (isUnmounted.current) return;
      try {
        const html5QrCode = new Html5Qrcode("reader", {
          verbose: false,
          useBarCodeDetectorIfSupported: true,
        });
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 30,
            disableFlip: true,
            aspectRatio: 1.0,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.EAN_13,
            ]
          },
          (decodedText) => {
            if (!isUnmounted.current && html5QrCode.getState() === STATE_SCANNING) {
              try { html5QrCode.pause(false); } catch {}
              onScanRef.current(decodedText);
            }
          },
          () => {}
        );
        if (!isUnmounted.current) {
          setHasPermission(true);
          setTimeout(() => {
            const video = document.querySelector('#reader video') as HTMLVideoElement;
            if (video) {
              video.setAttribute('playsinline', 'true');
              video.setAttribute('webkit-playsinline', 'true');
              video.style.objectFit = 'cover';
              video.style.width = '100%';
              video.style.height = '100%';
            }
          }, 300);
        }
      } catch (err) {
        console.error("Camera start error", err);
        if (!isUnmounted.current) setHasPermission(false);
      }
    };
    initScanner();
    return () => {
      isUnmounted.current = true;
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === STATE_SCANNING || state === STATE_PAUSED)
            scannerRef.current.stop().catch(console.error);
        } catch {}
      }
    };
  }, []);

  // Toggle đèn flash
  const toggleTorch = async () => {
    try {
      const video = document.querySelector('#reader video') as HTMLVideoElement;
      if (!video?.srcObject) return;
      const track = (video.srcObject as MediaStream).getVideoTracks()[0];
      if (!track) return;
      const caps = track.getCapabilities() as any;
      if (caps?.torch) {
        const next = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: next } as any] });
        setTorchOn(next);
      }
    } catch (e) { console.error('Torch error:', e); }
  };

  return (
    <div className="flex-1 relative bg-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="absolute top-0 w-full z-50 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-base text-slate-900">Quét Đơn</h1>
          <div className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Package size={12} />
            <span className="text-xs font-bold">{todayCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Active users */}
          {activeUsers.length > 0 && (
            <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
              <Users size={12} />
              <span className="text-[10px] font-bold">{activeUsers.length}</span>
            </div>
          )}
          <button onClick={onHistory} className="text-blue-600 active:scale-95 transition-transform">
            <History size={22} />
          </button>
        </div>
      </header>

      {/* Camera Feed */}
      <div className="absolute inset-0 w-full h-full bg-black overflow-hidden">
        <div id="reader" className="w-full h-full [&>canvas]:!opacity-0"></div>
        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-white p-6 text-center z-20">
            <p>Không thể truy cập camera. Vui lòng cấp quyền camera.</p>
          </div>
        )}
      </div>

      {/* Scanner Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
        <div className="flex-1 bg-black/45 w-full"></div>
        <div className="flex w-full h-[280px] shrink-0">
          <div className="flex-1 bg-black/45 h-full"></div>
          <div className="w-[280px] h-full relative border-2 border-blue-500/40 rounded-xl">
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-600 rounded-tl-lg"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-600 rounded-tr-lg"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-600 rounded-bl-lg"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-600 rounded-br-lg"></div>
            <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan"></div>
          </div>
          <div className="flex-1 bg-black/45 h-full"></div>
        </div>
        <div className="flex-1 bg-black/45 w-full"></div>
      </div>

      {/* Prompt */}
      <div className="absolute top-20 left-0 w-full z-20 flex justify-center px-6">
        <div className="bg-white/95 backdrop-blur-md px-5 py-2 rounded-full shadow-lg flex items-center gap-2">
          <ScanLine className="text-blue-600" size={16} />
          <p className="text-xs font-semibold text-slate-800">Đưa mã vạch vào khung hình</p>
        </div>
      </div>

      {/* Torch button */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
        <button 
          onClick={toggleTorch}
          className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center active:scale-90 transition-all border ${torchOn ? 'bg-yellow-400 border-yellow-300 text-yellow-900' : 'bg-black/40 border-white/20 text-white'}`}
        >
          {torchOn ? <FlashlightOff size={18} /> : <Flashlight size={18} />}
        </button>
      </div>

      {/* Bottom bar: Quick mode toggle + active users */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] left-0 w-full z-20 px-4 flex items-center justify-between gap-3">
        {/* Quick mode toggle */}
        <button 
          onClick={onToggleQuickMode}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-md shadow-lg active:scale-95 transition-all text-sm font-bold ${quickMode ? 'bg-amber-400 text-amber-900 border border-amber-300' : 'bg-white/90 text-slate-700 border border-white/50'}`}
        >
          <Zap size={16} className={quickMode ? 'text-amber-800' : 'text-slate-400'} />
          {quickMode ? 'Quét Nhanh' : 'Đóng Gói'}
        </button>

        {/* Active users chips */}
        {activeUsers.length > 0 && (
          <div className="flex items-center gap-1 bg-black/30 backdrop-blur-md px-3 py-2 rounded-full">
            {activeUsers.slice(0, 3).map((u, i) => (
              <div key={i} className="flex items-center gap-1" title={`${u.name}: ${u.count} đơn`}>
                <div className={`w-2 h-2 rounded-full ${u.isRecent ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <span className="text-[10px] font-medium text-white/90">{u.name}</span>
              </div>
            ))}
            {activeUsers.length > 3 && (
              <span className="text-[10px] text-white/60">+{activeUsers.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
