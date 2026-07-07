import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Asset } from '../types';

export default function AssetList() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .get('/assets', { params: search ? { search } : {} })
      .then((res) => setAssets(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>Assets</h2>
        <Link className="btn" to="/assets/new">+ Register Asset</Link>
      </div>

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          className="input"
          placeholder="query: code / name / serial"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-ghost" type="submit">Search</button>
      </form>

      <div className="card">
        <h3>Registry [{loading ? '…' : assets.length}]</h3>
        {loading ? (
          <p className="mono">loading…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Name</th><th>Category</th><th>Department</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.asset_code}</td>
                  <td>{a.name}</td>
                  <td>{a.category_name ?? '-'}</td>
                  <td>{a.department_name ?? '-'}</td>
                  <td><span className="badge" data-s={a.status}>{a.status}</span></td>
                  <td><Link to={`/assets/${a.id}`}>view &rarr;</Link></td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr><td colSpan={6} className="mono">— no assets found —</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
