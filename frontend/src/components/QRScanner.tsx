import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useTranslation } from "react-i18next";
import { X, Camera } from "lucide-react";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const QR_READER_ID = "qr-reader";

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const { t } = useTranslation("mint");
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const scanner = new Html5Qrcode(QR_READER_ID);
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
          (decodedText) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            void scanner.stop().catch(() => {});
            onScan(decodedText);
          },
          () => {},
        );
      } catch {
        if (mounted) setError(t("scanner.cameraError"));
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, [onScan, t]);

  const handleClose = () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) {
      scanner.stop().catch(() => {});
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stellar-lilac/15">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-stellar-gold" />
            <h3 className="text-base font-headline text-stellar-black uppercase">
              {t("scanner.title")}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stellar-black/5 transition-colors"
          >
            <X size={18} className="text-stellar-black/60" />
          </button>
        </div>

        {/* Scanner area */}
        <div className="p-4">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                <Camera size={24} className="text-red-400" />
              </div>
              <p className="text-sm font-headline text-stellar-black uppercase">
                {t("scanner.cameraError")}
              </p>
              <p className="text-xs font-body text-stellar-black/50">
                {t("scanner.cameraErrorDesc")}
              </p>
            </div>
          ) : (
            <>
              <div
                id={QR_READER_ID}
                className="w-full rounded-xl overflow-hidden bg-black"
              />
              <p className="text-xs font-body text-stellar-black/50 text-center mt-3">
                {t("scanner.instruction")}
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={handleClose}
            className="w-full inline-flex items-center justify-center gap-2 border-2 border-stellar-black/15 text-stellar-black/70 hover:border-stellar-black/30 hover:text-stellar-black font-semibold rounded-full py-2.5 px-8 transition-all font-body text-sm"
          >
            {t("scanner.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
