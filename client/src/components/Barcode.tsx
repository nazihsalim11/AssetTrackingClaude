import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

// Renders a Code128 barcode for the given value (e.g. an asset code) as an
// inline SVG, complementing the QR code on the printable asset label.
export default function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        width: 1.6,
        height: 44,
        fontSize: 12,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      // ignore values that can't be encoded
    }
  }, [value]);

  return <svg ref={ref} style={{ maxWidth: '100%' }} />;
}
