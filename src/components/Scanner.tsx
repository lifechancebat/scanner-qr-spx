import { useEffect, useRef, useState } from 'react';
import { History, ScanLine } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ScannerProps {
  onScan: (code: string) => void;
  onHistory: () => void;
  isActive: boolean; // Khi false → tạm dừng quét, giữ camera sống
}

// Trạng thái nội bộ html5-qrcode: SCANNING = 2, PAUSED = 3
const STATE_SCANNING = 2;
const STATE_PAUSED = 3;

export default function Scanner({ onScan, onHistory, isActive }: ScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isUnmounted = useRef(false);
  const onScanRef = useRef(onScan);

  // Giữ ref luôn cập nhật
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Pause/Resume camera dựa trên isActive — KHÔNG tắt/mở lại camera
  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      const state = scanner.getState();
      if (isActive && state === STATE_PAUSED) {
        scanner.resume();
      } else if (!isActive && state === STATE_SCANNING) {
        scanner.pause(false); // false = giữ video stream sống, chỉ dừng quét
      }
    } catch (e) {
      // Scanner chưa sẵn sàng, bỏ qua
    }
  }, [isActive]);

  // Khởi tạo camera MỘT LẦN DUY NHẤT
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
              // Tạm dừng ngay (không stop) → camera giữ sống
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
        if (!isUnmounted.current) {
          setHasPermission(false);
        }
      }
    };

    initScanner();

    return () => {
      isUnmounted.current = true;
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === STATE_SCANNING || state === STATE_PAUSED) {
            scannerRef.current.stop().catch(console.error);
          }
        } catch {
          // Bỏ qua
        }
      }
    };
  }, []);

  return (
    <div className="flex-1 relative bg-slate-900 overflow-hidden flex flex-col">
      {/* Top App Bar */}
      <header className="absolute top-0 w-full z-50 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg text-slate-900">Quét Đơn Hàng</h1>
        </div>
        <button onClick={onHistory} className="text-blue-600 active:scale-95 transition-transform">
          <History size={24} />
        </button>
      </header>

      {/* Live Camera Feed */}
      <div className="absolute inset-0 w-full h-full bg-black overflow-hidden">
        <div id="reader" className="w-full h-full [&>canvas]:!opacity-0"></div>
        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-white p-6 text-center z-20">
            <p>Không thể truy cập camera. Vui lòng cấp quyền camera cho ứng dụng.</p>
          </div>
        )}
      </div>

      {/* Scanner UI Overlay */}
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

      {/* Scan Prompt */}
      <div className="absolute top-24 left-0 w-full z-20 flex justify-center px-6">
        <div className="bg-white/95 backdrop-blur-md px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
          <ScanLine className="text-blue-600" size={20} />
          <p className="text-sm font-semibold tracking-wide text-slate-800">Đưa mã vạch vào khung hình</p>
        </div>
      </div>
    </div>
  );
}
