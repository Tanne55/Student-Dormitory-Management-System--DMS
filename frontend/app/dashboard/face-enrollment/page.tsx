'use client';

import { useEffect, useRef, useState } from 'react';
import { useFaceApi, extractDescriptor } from '@/hooks/useFaceApi';
import { enrollFace, deleteEnrollment, getEnrolledStudents, API_BASE, authHeaders } from '@/lib/api';
import { Button, Card, EmptyState, Field, Input, PageHeader, Table } from '@/components/ui';

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
    void loadEnrolledList();
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
        setStudentInfo(await res.json());
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
        await videoRef.current.play();
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
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Đăng ký khuôn mặt sinh viên"
        description="Trích xuất đặc trưng khuôn mặt qua camera để bật nhận diện cổng KTX."
        icon={<span className="material-symbols-outlined">face</span>}
      />

      {faceError && (
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl text-sm font-bold">
          {faceError}
        </div>
      )}
      {!isLoaded && !faceError && (
        <div className="bg-primary-fixed/40 text-on-primary-fixed px-6 py-4 rounded-2xl text-sm font-medium">
          Đang tải model nhận diện... (~6MB, chỉ tải một lần)
        </div>
      )}

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
            <span className="material-symbols-outlined">person_add</span>
          </div>
          <h2 className="text-base font-bold text-on-surface">Đăng ký mới</h2>
        </div>

        <div className="flex gap-3 items-end mb-4">
          <div className="flex-1">
            <Field label="Mã sinh viên">
              <Input
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lookupStudent()}
                placeholder="VD: SV001"
              />
            </Field>
          </div>
          <Button variant="secondary" onClick={lookupStudent}>
            Tìm kiếm
          </Button>
        </div>

        {studentInfo && (
          <div className="bg-green-50 text-green-800 px-4 py-3 rounded-2xl text-sm font-medium mb-4">
            ✓ {(studentInfo as any).fullName ?? studentCode}
          </div>
        )}

        {!cameraOn ? (
          <Button
            variant="gradient"
            disabled={!isLoaded || !studentCode.trim()}
            onClick={startCamera}
            icon={<span className="material-symbols-outlined text-[18px]">videocam</span>}
          >
            Mở camera
          </Button>
        ) : (
          <div className="space-y-3">
            <video
              ref={videoRef}
              className="w-full max-w-sm rounded-2xl bg-black"
              style={{ transform: 'scaleX(-1)' }}
              muted
              playsInline
            />
            <div className="flex gap-3">
              <Button
                variant="gradient"
                loading={processing}
                onClick={captureAndEnroll}
                icon={
                  !processing ? <span className="material-symbols-outlined text-[18px]">photo_camera</span> : undefined
                }
              >
                {processing ? 'Đang xử lý...' : 'Chụp & Đăng ký'}
              </Button>
              <Button variant="secondary" onClick={stopCamera}>
                Hủy
              </Button>
            </div>
          </div>
        )}

        {status.message && (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
              status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-error-container text-on-error-container'
            }`}
          >
            {status.message}
          </div>
        )}
      </Card>

      <Card padding="sm">
        <div className="flex items-center justify-between px-2 py-3 mb-2">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant">list</span>
            <h2 className="text-base font-bold text-on-surface">Danh sách đã đăng ký</h2>
          </div>
          <span className="bg-primary-fixed text-on-primary-fixed px-3 py-0.5 rounded-full text-xs font-bold">
            {enrolledList.length}
          </span>
        </div>

        <Table
          rows={enrolledList}
          getRowKey={(r) => r.studentCode}
          empty={<EmptyState icon="face" title="Chưa có sinh viên nào đăng ký khuôn mặt" />}
          columns={[
            {
              key: 'code',
              header: 'Mã SV',
              render: (r) => <span className="font-mono font-bold text-primary">{r.studentCode}</span>,
            },
            {
              key: 'name',
              header: 'Họ tên',
              render: (r) => <span className="font-bold text-on-surface">{r.fullName ?? '—'}</span>,
            },
            {
              key: 'enrolled',
              header: 'Đăng ký lúc',
              render: (r) => (
                <span className="text-on-surface-variant">{new Date(r.enrolledAt).toLocaleString('vi-VN')}</span>
              ),
            },
            {
              key: 'updated',
              header: 'Cập nhật',
              render: (r) => (
                <span className="text-on-surface-variant">{new Date(r.updatedAt).toLocaleString('vi-VN')}</span>
              ),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (r) => (
                <Button size="sm" variant="ghost" onClick={() => handleDelete(r.studentCode)} className="!text-error">
                  Xóa
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
