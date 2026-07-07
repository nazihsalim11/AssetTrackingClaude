import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

interface SearchGroup {
  entity: string;
  label: string;
  items: Record<string, unknown>[];
}

// Where each entity's "view" link points. Only assets have a dedicated detail
// page; the rest link to their section list.
const SECTION_LINK: Record<string, string> = {
  vendor: '/vendors',
  department: '/assets',
  category: '/assets',
  employee: '/users',
  invoice: '/invoices',
};

function renderItem(entity: string, item: Record<string, unknown>) {
  switch (entity) {
    case 'asset':
      return (
        <>
          <Link to={`/assets/${item.id}`} className="mono">{String(item.asset_code)}</Link>
          {' — '}{String(item.name)}
          {item.serial_number ? ` · SN ${item.serial_number}` : ''}
          {item.department_name ? ` · ${item.department_name}` : ''}
          {' '}<span className="badge" data-s={String(item.status)}>{String(item.status)}</span>
        </>
      );
    case 'vendor':
      return <>{String(item.name)}{item.contact_email ? ` · ${item.contact_email}` : ''}{item.gst_number ? ` · GST ${item.gst_number}` : ''}</>;
    case 'employee':
      return <>{String(item.name)} · {String(item.email)} <span className="role">[{String(item.role)}]</span></>;
    case 'invoice':
      return <>{String(item.invoice_number)}{item.vendor_name ? ` · ${item.vendor_name}` : ''} · {String(item.amount)} <span className="badge" data-s={String(item.payment_status)}>{String(item.payment_status)}</span></>;
    case 'category':
      return <>{String(item.name)} <span className="qr-label-sub">({String(item.type)})</span></>;
    default:
      return <>{String(item.name)}</>;
  }
}

export default function GlobalSearch() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setGroups([]);
      return;
    }
    setLoading(true);
    api
      .get('/search', { params: { q } })
      .then((res) => setGroups(res.data.groups))
      .finally(() => setLoading(false));
  }, [q]);

  const totalResults = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>Search</h2>
      </div>

      {!q.trim() ? (
        <p className="mono">Type a query in the search box above.</p>
      ) : loading ? (
        <p className="mono">searching…</p>
      ) : (
        <>
          <p className="mono" style={{ marginBottom: 12 }}>
            {totalResults} result{totalResults === 1 ? '' : 's'} for &ldquo;{q}&rdquo;
          </p>
          {groups.length === 0 && <p className="mono">— no matches —</p>}
          {groups.map((g) => (
            <div className="card" key={g.entity} style={{ marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>
                {g.label} [{g.items.length}]
                {SECTION_LINK[g.entity] && g.entity !== 'asset' && (
                  <Link to={SECTION_LINK[g.entity]} style={{ fontSize: 12, marginLeft: 8 }}>
                    open section &rarr;
                  </Link>
                )}
              </h3>
              <ul className="search-results">
                {g.items.map((item, i) => (
                  <li key={i}>{renderItem(g.entity, item)}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
