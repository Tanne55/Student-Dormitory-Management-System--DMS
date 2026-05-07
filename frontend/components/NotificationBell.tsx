'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING';
  isRead: boolean;
  createdAt: string;
};

function typeStyles(t: string) {
  if (t === 'SUCCESS') return 'border-l-emerald-500 bg-emerald-50/50';
  if (t === 'WARNING') return 'border-l-amber-500 bg-amber-50/50';
  return 'border-l-blue-500 bg-blue-50/50';
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      setItems([]);
      setUnread(0);
      return;
    }
    try {
      const [listRes, countRes] = await Promise.all([
        apiFetch(`${API_BASE}/notifications/my`, { headers: authHeaders() }),
        apiFetch(`${API_BASE}/notifications/unread-count`, { headers: authHeaders() }),
      ]);
      if (listRes.ok) {
        const data = await listRes.json();
        setItems(Array.isArray(data) ? data : []);
      }
      if (countRes.ok) {
        const c = await countRes.json();
        setUnread(typeof c.count === 'number' ? c.count : 0);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const markRead = async (id: string) => {
    if (!localStorage.getItem('token')) return;
    await apiFetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    load();
  };

  const markAllRead = async () => {
    if (!localStorage.getItem('token')) return;
    await apiFetch(`${API_BASE}/notifications/mark-all-read`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    load();
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
        aria-label="Thông báo"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(100vw-2rem,22rem)] max-h-[70vh] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl z-[60] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="font-semibold text-gray-900 text-sm">Thông báo</span>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">Chưa có thông báo.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((n) => (
                  <li key={n.id} className={`border-l-4 ${typeStyles(n.type)} ${!n.isRead ? 'bg-white' : 'opacity-80'}`}>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{n.message}</p>
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          Đánh dấu đã đọc
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
