import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, History, ScanLine, Flashlight, Keyboard } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function Scanner({ onScan, onHistory }: { onScan: (code: string, base64Image?: string) => void, onHistory: () => void }) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isUnmounted = useRef(false);

  useEffect(() => {
    isUnmounted.current = false;
    const initScanner = async () => {
      // Delay slightly to ensure PWA viewport is fully initialized on iOS
      await new Promise(resolve => setTimeout(resolve, 400));
      if (isUnmounted.current) return;

      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 20, // Tăng FPS lên 20 để quét nhanh hơn
            // Bỏ qrbox để cho phép quét toàn màn hình (lướt ngang qua là quét được)
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
            ]
          },
          (decodedText) => {
            if (!isUnmounted.current && html5QrCode.isScanning) {
              html5QrCode.stop().then(() => {
                onScan(decodedText);
              }).catch(console.error);
            }
          },
          (errorMessage) => {
            // Ignore continuous scan errors
          }
        );
        if (!isUnmounted.current) {
          setHasPermission(true);
          // Force iOS PWA video attributes
          setTimeout(() => {
            const video = document.querySelector('#reader video') as HTMLVideoElement;
            if (video) {
              video.setAttribute('playsinline', 'true');
              video.setAttribute('webkit-playsinline', 'true');
              video.style.objectFit = 'cover';
              video.style.width = '100%';
              video.style.height = '100%';
            }
          }, 500);
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
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="flex-1 relative bg-slate-900 overflow-hidden flex flex-col">
      {/* Top App Bar */}
      <header className="absolute top-0 w-full z-50 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-4">
          <button className="text-blue-600 active:scale-95 transition-transform">
            <ArrowLeft size={24} />
          </button>
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

      {/* Scanner UI Overlay - Fixed for iOS rendering bug */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
        {/* Top dark area */}
        <div className="flex-1 bg-black/45 w-full"></div>
        
        {/* Middle area with clear cutout */}
        <div className="flex w-full h-[280px] shrink-0">
          <div className="flex-1 bg-black/45 h-full"></div>
          <div className="w-[280px] h-full relative border-2 border-blue-500/40 rounded-xl">
            {/* Corners */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-600 rounded-tl-lg"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-600 rounded-tr-lg"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-600 rounded-bl-lg"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-600 rounded-br-lg"></div>
            {/* Scan line */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan"></div>
          </div>
          <div className="flex-1 bg-black/45 h-full"></div>
        </div>
        
        {/* Bottom dark area */}
        <div className="flex-1 bg-black/45 w-full"></div>
      </div>

      {/* Scan Prompt */}
      <div className="absolute top-24 left-0 w-full z-20 flex justify-center px-6">
        <div className="bg-white/95 backdrop-blur-md px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
          <ScanLine className="text-blue-600" size={20} />
          <p className="text-sm font-semibold tracking-wide text-slate-800">Đưa mã vạch vào khung hình</p>
        </div>
      </div>

      {/* Flashlight/Manual Entry Controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-all border border-white/20">
          <Flashlight size={20} />
        </button>
        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-all border border-white/20">
          <Keyboard size={20} />
        </button>
      </div>
    </div>
  );
}
