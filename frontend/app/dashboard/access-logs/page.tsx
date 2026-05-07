'use client';

import { useEffect, useState } from 'react';
import { getAccessLogs } from '../../../lib/api';

interface AccessLog {
  id: number;
  studentCode: string;
  fullName: string | null;
  direction: 'IN' | 'OUT';
  confidence: number | null;
  buildingCode: string | null;
  loggedAt: string;
}

interface LogsResponse {
  data: AccessLog[];
  total: number;
  page: number;
  limit: number;
}

export default function AccessLogsPage() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [filterStudent, setFilterStudent] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const limit = 50;

  async function fetchLogs(p = 1) {
    setLoading(true);
    try {
      const res: LogsResponse = await getAccessLogs({
        studentCode: filterStudent.trim() || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        page: p,
        limit,
      });
      setLogs(res.data);
      setTotal(res.total);
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs(1);
  }, []);

  function handleSearch() {
    fetchLogs(1);
  }

  const totalPages = Math.ceil(total / limit);

  const directionBadge = (d: 'IN' | 'OUT') =>
    d === 'IN' ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">
        VÀO
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800">
        RA
      </span>
    );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nhật ký ra vào ký túc xá</h1>
        <a
          href="/kiosk"
          target="_blank"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Mở cổng kiosk ↗
        </a>
      </div>

      {/* Filter bar */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mã sinh viên</label>
          <input
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="VD: SV001"
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Từ ngày</label>
          <input
            type="date"
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Đến ngày</label>
          <input
            type="date"
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Tìm kiếm
        </button>
        <button
          onClick={() => {
            setFilterStudent('');
            setFilterDateFrom('');
            setFilterDateTo('');
            setTimeout(() => fetchLogs(1), 0);
          }}
          className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          Xóa bộ lọc
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {loading ? 'Đang tải...' : `Tổng: ${total} lượt`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => fetchLogs(page - 1)}
                disabled={page <= 1}
                className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-50"
              >
                ‹ Trước
              </button>
              <span className="text-gray-600">
                Trang {page}/{totalPages}
              </span>
              <button
                onClick={() => fetchLogs(page + 1)}
                disabled={page >= totalPages}
                className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-50"
              >
                Sau ›
              </button>
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Thời gian</th>
              <th className="px-4 py-3 font-medium">Mã SV</th>
              <th className="px-4 py-3 font-medium">Họ tên</th>
              <th className="px-4 py-3 font-medium">Hướng</th>
              <th className="px-4 py-3 font-medium">Độ tin cậy</th>
              <th className="px-4 py-3 font-medium">Tòa nhà</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(log.loggedAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 font-mono">{log.studentCode}</td>
                  <td className="px-4 py-3">{log.fullName ?? '—'}</td>
                  <td className="px-4 py-3">{directionBadge(log.direction)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {log.confidence != null
                      ? `${(log.confidence * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{log.buildingCode ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
