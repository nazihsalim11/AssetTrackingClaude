import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../api/client';

const SCANNER_ID = 'qr-scanner-region';

export default function ScanQR() {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);

  async function lookup(assetCode: string) {
    try {
      const res = await api.get('/assets', { params: { search: assetCode } });
      const match = res.data.find((a: { asset_code: string }) => a.asset_code === assetCode) ?? res.data[0];
      if (match) {
        navigate(`/assets/${match.id}`);
      } else {
        setError(`No asset found for code "${assetCode}"`);
      }
    } catch {
      setError('Lookup failed.');
    }
  }

  async function handleDecoded(decodedText: string) {
    let assetCode = decodedText;
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.assetCode) assetCode = parsed.assetCode;
    } catch {
      // plain text QR, use as-is
    }
    await stopScanning();
    lookup(assetCode);
  }

  async function startScanning() {
    setError(null);
    try {
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => handleDecoded(decodedText),
        () => {}
      );
      setScanning(true);
    } catch {
      setError('Unable to access camera. You can look up the asset code manually below.');
    }
  }

  async function stopScanning() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h2>Scan QR / Barcode</h2>
      <div className="grid grid-2">
        <div className="card">
          <div id={SCANNER_ID} style={{ width: '100%', minHeight: 250 }} />
          {!scanning ? (
            <button className="btn" onClick={startScanning} style={{ marginTop: 12 }}>Start Camera Scan</button>
          ) : (
            <button className="btn btn-ghost" onClick={stopScanning} style={{ marginTop: 12 }}>Stop</button>
          )}
          {error && <p className="error-text">{error}</p>}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Manual Lookup</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.trim()) lookup(manualCode.trim());
            }}
          >
            <div className="form-row">
              <label>Asset Code / Serial Number</label>
              <input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="AST-00001" />
            </div>
            <button className="btn" type="submit">Look Up</button>
          </form>
        </div>
      </div>
    </div>
  );
}
