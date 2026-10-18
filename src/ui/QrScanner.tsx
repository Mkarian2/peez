import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

/** Camera QR scanner using jsQR (works in Chrome on Android and Windows). */
export function QrScanner({ onResult }: { onResult: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const tick = () => {
      if (stopped) return;
      const v = videoRef.current;
      if (v && v.readyState === v.HAVE_ENOUGH_DATA) {
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (code?.data) {
          stopped = true;
          stream?.getTracks().forEach((t) => t.stop());
          onResult(code.data);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const v = videoRef.current!;
        v.srcObject = s;
        v.play().catch(() => undefined);
        raf = requestAnimationFrame(tick);
      })
      .catch(() => setError('Could not access the camera. You can paste the pairing code instead.'));

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="scanner">
      {error ? <p className="error">{error}</p> : <video ref={videoRef} playsInline muted />}
    </div>
  );
}
