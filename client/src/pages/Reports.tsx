import { useEffect, useState } from 'react';
import { api } from '../api/client';

const REPORTS = [
  { key: 'inventory', label: 'Inventory Report' },
  { key: 'employee-allocation', label: 'Employee Allocation' },
  { key: 'vendor-assets', label: 'Vendor Assets' },
  { key: 'amc-renewals', label: 'AMC Renewals' },
  { key: 'invoice-status', label: 'Invoice Status' },
  { key: 'asset-movement', label: 'Asset Movement' },
  { key: 'disposal', label: 'Disposal Report' },
];

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const s = val === null || val === undefined ? '' : String(val);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

export default function Reports() {
  const [active, setActive] = useState(REPORTS[0].key);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/reports/${active}`).then((res) => {
      setRows(res.data);
      setLoading(false);
    });
  }, [active]);

  const activeLabel = REPORTS.find((r) => r.key === active)?.label ?? active;

  function downloadCsv() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${active}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // xlsx / jsPDF are heavy, so load them on demand to keep the main bundle small.
  async function downloadExcel() {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeLabel.slice(0, 31));
    XLSX.writeFile(workbook, `${active}-report.xlsx`);
  }

  async function downloadPdf() {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(activeLabel, 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [headers.map((h) => h.replace(/_/g, ' '))],
      body: rows.map((row) => headers.map((h) => (row[h] === null || row[h] === undefined ? '' : String(row[h])))),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [40, 48, 60] },
    });
    doc.save(`${active}-report.pdf`);
  }

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>Reports</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={downloadCsv} disabled={rows.length === 0}>
            Export CSV
          </button>
          <button className="btn btn-ghost" onClick={downloadExcel} disabled={rows.length === 0}>
            Export Excel
          </button>
          <button className="btn btn-ghost" onClick={downloadPdf} disabled={rows.length === 0}>
            Export PDF
          </button>
        </div>
      </div>

      <div className="tabs">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            className={`tab${active === r.key ? ' active' : ''}`}
            onClick={() => setActive(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="card">
        <h3>{REPORTS.find((r) => r.key === active)?.label} [{loading ? '…' : rows.length}]</h3>
        {loading ? (
          <p className="mono">loading…</p>
        ) : rows.length === 0 ? (
          <p className="mono">— no data available —</p>
        ) : (
          <table>
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {headers.map((h) => (
                    <td key={h}>{String(row[h] ?? '-')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
