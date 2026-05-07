'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';

export default function DormApprovalsPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = getUserFromToken();
    if (!token || !user || !['staff', 'admin'].includes(user.role)) {
      router.push('/login');
      return;
    }

    setErrorMsg('');
    apiFetch(`${API_BASE}/dorm-registrations/pending`, { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `Lỗi ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setRegistrations(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg(err.message || 'Không tải được danh sách đơn chờ duyệt.');
        setRegistrations([]);
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Staff Dashboard - Dorm Approvals</h1>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
        )}

        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No pending applications found.
                  </td>
                </tr>
              ) : (
                registrations.map((reg: any) => {
                  let appData: any = reg.applicationData;
                  if (typeof appData === 'string') {
                    try {
                      appData = JSON.parse(appData);
                    } catch {
                      /* ignore */
                    }
                  }
                  return (
                    <tr key={reg.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reg.studentCode}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{appData?.basic?.fullName || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.semester}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Phòng {reg.roomType} người</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {reg.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/staff/dorm-approvals/${reg.id}`}
                          className="text-indigo-600 hover:text-indigo-900 font-semibold bg-indigo-50 px-3 py-1.5 rounded"
                        >
                          Review & Approve
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
