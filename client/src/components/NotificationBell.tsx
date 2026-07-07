import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { Notification } from '../types';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function load() {
    api.get('/notifications').then((res) => setNotifications(res.data));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  async function markAllRead() {
    await api.post('/notifications/read-all');
    load();
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div ref={ref} className="notif-wrap">
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)}>
        Alerts{unreadCount > 0 && <span className="notif-dot"> ({unreadCount})</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <h3 style={{ margin: 0 }}>Notifications [{unreadCount} unread]</h3>
            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 && (
            <div className="notif-item"><span className="mono">— no notifications —</span></div>
          )}
          {notifications.map((n) => (
            <div key={n.id} className={`notif-item${n.is_read ? ' read' : ''}`}>
              <div className="msg">{n.message}</div>
              <div className="ts">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
