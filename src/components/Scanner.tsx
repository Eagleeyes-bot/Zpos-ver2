import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Smartphone } from 'lucide-react';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
}

export default function Scanner({ onScan, onClose, title = "Scan Device IMEI" }: ScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Initializing scanner
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      /* verbose= */ false
    );

    const onScanSuccess = (decodedText: string) => {
      onScan(decodedText);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };

    const onScanFailure = (error: string) => {
      // Noise/failure to scan happens often, we just ignore it
    };

    scannerRef.current.render(onScanSuccess, onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden relative shadow-2xl">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-xl text-gray-900">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6">
          <div id="reader" className="w-full bg-gray-100 rounded-2xl overflow-hidden border-4 border-gray-100 shadow-inner min-h-[300px]"></div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 font-medium">Position the barcode or IMEI within the frame to scan automatically.</p>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium border border-rose-100">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all active:scale-[0.98]"
          >
            Cancel Scanning
          </button>
        </div>
      </div>
    </div>
  );
}
