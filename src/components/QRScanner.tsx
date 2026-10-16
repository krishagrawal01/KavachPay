import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  QrCode,
  ScanLine,
  Store,
  Upload,
  X,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import type { ShopAnalysisResult } from '@/lib/gemini';

interface QRScannerProps {
  onResult: (text: string) => void;
  onShopImage?: (dataUrl: string) => void;
  shopAnalysis?: ShopAnalysisResult | null;
  analyzingShop: boolean;
  geminiKey: string;
  qrPayeeName?: string;
}

const CAMERA_REGION_ID = 'qr-scanner-region';
const FILE_SCAN_REGION_ID = 'qr-file-scan-region';
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

export function QRScanner({
  onResult,
  onShopImage,
  shopAnalysis,
  analyzingShop,
  geminiKey,
  qrPayeeName,
}: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [qrUploadError, setQrUploadError] = useState('');
  const [qrUploading, setQrUploading] = useState(false);
  const [showShopUpload, setShowShopUpload] = useState(false);
  const [shopUploadError, setShopUploadError] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shopFileInputRef = useRef<HTMLInputElement>(null);
  const decodedRef = useRef(false);
  const mountedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        await scanner.stop();
      } catch {
        // The camera may not have started or may already be stopped.
      }

      try {
        await scanner.clear();
      } catch {
        // Ignore cleanup errors after a failed start.
      }
    }

    if (mountedRef.current) setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (scannerRef.current) return;

    setCameraError('');
    setQrUploadError('');
    setShowManual(false);
    decodedRef.current = false;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Camera access needs a secure HTTPS page and a supported browser. Check site camera permission or upload a QR image instead.'
      );
      return;
    }

    let scanner: Html5Qrcode | null = null;

    try {
      scanner = new Html5Qrcode(CAMERA_REGION_ID, { verbose: false });
      scannerRef.current = scanner;
      setScanning(true);

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, aspectRatio: 1 },
        (decodedText) => {
          if (decodedRef.current) return;
          decodedRef.current = true;

          void (async () => {
            await stopScanner();
            if (mountedRef.current) onResult(decodedText);
          })();
        },
        () => {
          // A frame without a readable QR code is expected during scanning.
        }
      );
    } catch (error: unknown) {
      await stopScanner();
      const message = error instanceof Error ? error.message : '';
      const lower = message.toLowerCase();

      if (lower.includes('notallowed') || lower.includes('permission') || lower.includes('denied')) {
        setCameraError('Camera permission is blocked. Allow Camera for this site in Chrome settings, then try again.');
      } else if (lower.includes('notfound') || lower.includes('no camera')) {
        setCameraError('No accessible camera was found. You can upload a QR image instead.');
      } else if (lower.includes('notreadable') || lower.includes('could not start video source')) {
        setCameraError('The camera is busy. Close other apps using it and try again.');
      } else {
        setCameraError(`Could not start the camera${message ? `: ${message}` : '.'}`);
      }
    }
  }, [onResult, stopScanner]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        void (async () => {
          try {
            await scanner.stop();
          } catch {
            // Best-effort cleanup on unmount.
          }
          try {
            await scanner.clear();
          } catch {
            // Best-effort cleanup on unmount.
          }
        })();
      }
    };
  }, []);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;
    setQrUploadError('');

    if (!file.type.startsWith('image/')) {
      setQrUploadError('Choose an image file containing a QR code.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setQrUploadError('This image is larger than 15 MB. Choose a smaller image.');
      return;
    }

    setQrUploading(true);
    let decoder: Html5Qrcode | null = null;

    try {
      decoder = new Html5Qrcode(FILE_SCAN_REGION_ID, { verbose: false });
      const text = await decoder.scanFile(file, false);

      if (!text.trim()) throw new Error('No QR contents detected.');
      if (mountedRef.current) onResult(text);
    } catch {
      if (mountedRef.current) {
        setQrUploadError('We could not read a QR code from this image. Try a clearer, straight-on picture, or paste the UPI link manually.');
      }
    } finally {
      if (decoder) {
        try {
          await decoder.clear();
        } catch {
          // File scanner has finished; cleanup errors are non-fatal.
        }
      }
      if (mountedRef.current) setQrUploading(false);
    }
  };

  const handleShopUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    setShopUploadError('');

    if (!file.type.startsWith('image/')) {
      setShopUploadError('Choose a valid image file.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setShopUploadError('This image is larger than 15 MB. Choose a smaller image.');
      return;
    }
    if (!onShopImage) {
      setShopUploadError('Shop image analysis is unavailable in this build.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && mountedRef.current) {
        onShopImage(reader.result);
        setShowShopUpload(false);
      }
    };
    reader.onerror = () => {
      if (mountedRef.current) setShopUploadError('Could not read this image. Try another file.');
    };
    reader.readAsDataURL(file);
  };

  const submitManual = () => {
    const value = manualInput.trim();
    if (!value) return;
    setManualInput('');
    setShowManual(false);
    setCameraError('');
    onResult(value);
  };

  return (
    <div className="space-y-4 px-4 pb-6 pt-4 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink-primary">Scan a payment QR</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">Check the payment details before you send money.</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-pale text-brand-blue">
          <QrCode size={21} />
        </div>
      </div>

      <div className="kavach-card overflow-hidden p-3 sm:p-4">
        <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-xl border border-slate-800 bg-[#0B1220]">
          <div
            id={CAMERA_REGION_ID}
            className={`absolute inset-0 h-full w-full ${scanning ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          />

          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0B1220] px-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-emerald-300">
                <QrCode size={45} strokeWidth={1.35} />
              </div>
              <p className="text-sm font-semibold text-white">Align the QR code inside the frame</p>
              <p className="max-w-[250px] text-xs leading-relaxed text-slate-300">
                Keep the whole code visible. We will review the payment details before you continue.
              </p>
            </div>
          )}

          {scanning && (
            <>
              <div className="pointer-events-none absolute inset-5 z-10 rounded-xl border-2 border-emerald-300/90 shadow-[0_0_0_999px_rgba(2,6,23,0.16)]" />
              <div role="status" className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md bg-slate-950/90 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300">
                Camera active
              </div>
              <button
                type="button"
                onClick={() => void stopScanner()}
                className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-900 shadow"
              >
                <X size={14} /> Stop scanning
              </button>
            </>
          )}
        </div>

        {cameraError && !scanning && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-warn/20 bg-amber-50 p-3 text-xs leading-relaxed text-amber-warn" role="alert">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => void startScanner()}
          disabled={scanning}
          className="kavach-primary-action tactile mt-3 w-full disabled:opacity-50"
        >
          <Camera size={18} />
          {scanning ? 'Scanning…' : 'Start camera scan'}
        </button>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setShowManual((current) => !current)}
            className="kavach-secondary-action tactile w-full px-2 text-xs"
          >
            <ScanLine size={16} /> Paste UPI link
          </button>
          <button
            type="button"
            onClick={() => {
              setQrUploadError('');
              fileInputRef.current?.click();
            }}
            disabled={qrUploading || scanning}
            className="kavach-secondary-action tactile w-full px-2 text-xs disabled:opacity-50"
          >
            {qrUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {qrUploading ? 'Reading…' : 'Upload QR image'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {qrUploading && (
          <p className="mt-3 text-xs text-ink-muted" role="status">Reading the QR code in your image…</p>
        )}
        {qrUploadError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-crimson-fraud/20 bg-rose-50 p-3 text-xs leading-relaxed text-crimson-fraud" role="alert">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {qrUploadError}
          </div>
        )}
      </div>

      {showManual && !scanning && (
        <div className="kavach-card space-y-3 p-4">
          <div>
            <h3 className="text-sm font-bold text-ink-primary">Paste payment link</h3>
            <p className="mt-1 text-xs text-ink-muted">Paste the UPI URI from a QR or payment request.</p>
          </div>
          <textarea
            value={manualInput}
            onChange={(event) => setManualInput(event.target.value)}
            placeholder="upi://pay?pa=...&pn=...&am=..."
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-obsidian px-3 py-3 text-xs text-ink-primary outline-none placeholder:text-ink-dim focus:border-brand-blue"
          />
          <button
            type="button"
            onClick={submitManual}
            disabled={!manualInput.trim()}
            className="w-full rounded-xl bg-brand-blue px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Check payment details
          </button>
        </div>
      )}

      <details className="group rounded-2xl border border-border bg-surface shadow-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
            <Store size={17} className="text-ink-muted" />
            Shop signboard verification
            <span className="rounded-full bg-obsidian px-2 py-0.5 text-[10px] font-medium text-ink-muted">Advanced</span>
          </span>
          <ChevronDown size={17} className="text-ink-muted transition-transform group-open:rotate-180" />
        </summary>

        <div className="space-y-3 border-t border-border px-4 py-4">
          <p className="text-xs leading-relaxed text-ink-muted">
            Compare a shop signboard photo with the scanned QR payee name. This is an optional check and may require a configured Gemini API key.
          </p>
          {qrPayeeName && (
            <p className="rounded-xl bg-obsidian px-3 py-2 text-xs text-ink-muted">
              QR payee: <span className="font-semibold text-ink-primary">{qrPayeeName}</span>
            </p>
          )}
          <input
            ref={shopFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleShopUpload}
          />
          <button
            type="button"
            onClick={() => shopFileInputRef.current?.click()}
            disabled={analyzingShop}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink-primary hover:bg-obsidian disabled:opacity-50"
          >
            <ImageIcon size={17} /> Upload shop photo
          </button>
          {geminiKey && (
            <p className="text-[11px] text-ink-muted">A Gemini key is currently configured in demo settings.</p>
          )}
          {shopUploadError && <p className="text-xs text-crimson-fraud" role="alert">{shopUploadError}</p>}
          {analyzingShop && <p className="text-xs text-ink-muted" role="status">Analysing shop photo…</p>}

          {shopAnalysis && !analyzingShop && (
            <div className={`space-y-2 rounded-xl border p-3 ${shopAnalysis.matchesQrPayee ? 'border-npcigreen/20 bg-emerald-50' : 'border-crimson-fraud/20 bg-rose-50'}`}>
              <div className="flex items-center gap-2">
                {shopAnalysis.matchesQrPayee ? <CheckCircle2 size={16} className="text-npcigreen" /> : <AlertCircle size={16} className="text-crimson-fraud" />}
                <p className="text-sm font-bold text-ink-primary">{shopAnalysis.matchesQrPayee ? 'Names appear to match' : 'Name mismatch detected'}</p>
              </div>
              <p className="text-xs leading-relaxed text-ink-muted">{shopAnalysis.explanation}</p>
              <p className="text-xs text-ink-muted">Detected signboard: <span className="font-semibold text-ink-primary">{shopAnalysis.printedShopName}</span></p>
              {shopAnalysis.risks.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-crimson-fraud">
                  {shopAnalysis.risks.map((risk, index) => <li key={`${risk}-${index}`}>{risk}</li>)}
                </ul>
              )}
              <p className="text-[11px] text-ink-muted">Confidence: {(shopAnalysis.confidence * 100).toFixed(0)}%. This result is an aid, not proof of merchant identity.</p>
            </div>
          )}
        </div>
      </details>

      <p className="px-1 text-[11px] leading-relaxed text-ink-muted">
        Kavach checks available payment details before you continue. It cannot guarantee that a recipient is legitimate.
      </p>
    </div>
  );
}
