'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useFaceApi, extractDescriptor } from '../../../hooks/useFaceApi';
import {
  enrollFace,
  deleteEnrollment,
  getEnrolledStudents,
  API_BASE,
  authHeaders,
} from '../../../lib/api';

interface EnrolledStudent {
  studentCode: string;
  fullName: string | null;
  enrolledAt: string;
  updatedAt: string;
}

export default function FaceEnrollmentPage() {
  const { faceApi, isLoaded, error: faceError } = useFaceApi();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [studentCode, setStudentCode] = useState('');
  const [studentInfo, setStudentInfo] = useState<{ fullName?: string } | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [enrolledList, setEnrolledList] = useState<EnrolledStudent[]>([]);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadEnrolledList();
  }, []);

  async function loadEnrolledList() {
    try {
      const data = await getEnrolledStudents();
      setEnrolledList(data);
    } catch {}
  }

  async function lookupStudent() {
    if (!studentCode.trim()) return;
    setStudentInfo(null);
    try {
      const res = await fetch(`${API_BASE}/students/by-code/${studentCode.trim()}`, {
        headers: authHeaders(),
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setStudentInfo(data);
      } else {
        setStatus({ type: 'error', message: 'Không tìm thấy sinh viên.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Lỗi kết nối.' });
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setStatus({ type: 'error', message: 'Không thể mở camera. Vui lòng cấp quyền truy cập.' });
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function captureAndEnroll() {
    if (!faceApi || !videoRef.current || !studentCode.trim()) return;
    setProcessing(true);
    setStatus({ type: 'idle', message: '' });
    try {
      const descriptor = await extractDescriptor(faceApi, videoRef.current);
      if (!descriptor) {
        setStatus({ type: 'error', message: 'Không phát hiện khuôn mặt. Nhìn thẳng vào camera.' });
        return;
      }
      await enrollFace(studentCode.trim(), Array.from(descriptor));
      setStatus({ type: 'success', message: `Đã đăng ký khuôn mặt cho sinh viên ${studentCode}.` });
      stopCamera();
      await loadEnrolledList();
    } catch (e: any) {
      setStatus({ type: 'error', message: e.message ?? 'Lỗi không xác định.' });
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete(code: string) {
    if (!confirm(`Xóa khuôn mặt đã đăng ký của sinh viên ${code}?`)) return;
    try {
      await deleteEnrollment(code);
      await loadEnrolledList();
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Đăng ký khuôn mặt sinh viên</h1>

      {faceError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {faceError}
        </div>
      )}

      {!isLoaded && !faceError && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-4">
          Đang tải model nhận diện... (khoảng 6MB, chỉ tải một lần)
        </div>
      )}

      {/* Enrollment form */}
      <div className="bg-white border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-lg">Đăng ký mới</h2>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Mã sinh viên</label>
            <input
              className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && lookupStudent()}
              placeholder="VD: SV001"
            />
          </div>
          <button
            onClick={lookupStudent}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            Tìm kiếm
          </button>
        </div>

        {studentInfo && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800">
            ✓ {(studentInfo as any).fullName ?? studentCode}
          </div>
        )}

        {!cameraOn ? (
          <button
            onClick={startCamera}
            disabled={!isLoaded || !studentCode.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Mở camera
          </button>
        ) : (
          <div className="space-y-3">
            <video
              ref={videoRef}
              className="w-full max-w-sm rounded-xl border bg-black"
              style={{ transform: 'scaleX(-1)' }}
              muted
              playsInline
            />
            <div className="flex gap-3">
              <button
                onClick={captureAndEnroll}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
              >
                {processing ? 'Đang xử lý...' : 'Chụp & Đăng ký'}
              </button>
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm font-medium"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {status.message && (
          <div
            className={`rounded-lg p-3 text-sm ${
              status.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {status.message}
          </div>
        )}
      </div>

      {/* Enrolled list */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4">
          Danh sách đã đăng ký ({enrolledList.length})
        </h2>

        {enrolledList.length === 0 ? (
          <p className="text-gray-500 text-sm">Chưa có sinh viên nào đăng ký khuôn mặt.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Mã SV</th>
                <th className="pb-2 font-medium">Họ tên</th>
                <th className="pb-2 font-medium">Đăng ký lúc</th>
                <th className="pb-2 font-medium">Cập nhật</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {enrolledList.map((s) => (
                <tr key={s.studentCode} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 font-mono">{s.studentCode}</td>
                  <td className="py-2">{s.fullName ?? '—'}</td>
                  <td className="py-2 text-gray-500">
                    {new Date(s.enrolledAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="py-2 text-gray-500">
                    {new Date(s.updatedAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleDelete(s.studentCode)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
