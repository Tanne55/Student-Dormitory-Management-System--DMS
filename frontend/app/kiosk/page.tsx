'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useFaceApi, extractDescriptor } from '../../hooks/useFaceApi';
import { recognizeFace, createAccessLog } from '../../lib/api';

interface RecognizeResult {
  matched: boolean;
  studentCode?: string;
  fullName?: string | null;
  confidence?: number;
  suggestedDirection?: 'IN' | 'OUT';
  message?: string;
}

interface RecentLog {
  studentCode: string;
  fullName: string | null;
  direction: 'IN' | 'OUT';
  loggedAt: string;
  confidence: number;
}

const SCAN_INTERVAL_MS = 1800; // ms giữa mỗi lần quét
const COOLDOWN_MS = 4000; // ms không quét sau khi nhận ra ai đó

export default function KioskPage() {
  const { faceApi, isLoaded, error: faceError } = useFaceApi();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLogTimeRef = useRef<number>(0);

  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [currentResult, setCurrentResult] = useState<RecognizeResult | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [lastLogTime, setLastLogTime] = useState<string>('');

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      alert('Không thể mở camera. Vui lòng cấp quyền truy cập camera.');
    }
  }

  function stopCamera() {
    stopScanning();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    setCurrentResult(null);
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const performScan = useCallback(async () => {
    if (!faceApi || !videoRef.current) return;
    const now = Date.now();
    if (now - lastLogTimeRef.current < COOLDOWN_MS) return;

    try {
      const descriptor = await extractDescriptor(faceApi, videoRef.current);
      if (!descriptor) {
        setCurrentResult({ matched: false, message: 'Không phát hiện khuôn mặt...' });
        return;
      }

      const result: RecognizeResult = await recognizeFace(Array.from(descriptor));
      setCurrentResult(result);

      if (result.matched && result.studentCode && result.suggestedDirection) {
        lastLogTimeRef.current = Date.now();
        // Ghi log vào backend
        await createAccessLog({
          studentCode: result.studentCode,
          direction: result.suggestedDirection,
          confidence: result.confidence,
        });

        const logEntry: RecentLog = {
          studentCode: result.studentCode,
          fullName: result.fullName ?? null,
          direction: result.suggestedDirection,
          loggedAt: new Date().toISOString(),
          confidence: result.confidence ?? 0,
        };

        setRecentLogs((prev) => [logEntry, ...prev].slice(0, 10));
        setLastLogTime(new Date().toLocaleTimeString('vi-VN'));
      }
    } catch (e) {
      // Bỏ qua lỗi mạng tạm thời
    }
  }, [faceApi]);

  function startScanning() {
    if (scanTimerRef.current) return;
    setScanning(true);
    scanTimerRef.current = setInterval(performScan, SCAN_INTERVAL_MS);
  }

  function stopScanning() {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    setScanning(false);
  }

  // Cập nhật performScan khi faceApi thay đổi (load xong)
  useEffect(() => {
    if (scanning && faceApi) {
      stopScanning();
      startScanning();
    }
  }, [faceApi]);

  const directionLabel = (d: 'IN' | 'OUT') =>
    d === 'IN' ? { text: 'VÀO', bg: 'bg-green-500', light: 'bg-green-50 text-green-800 border-green-200' }
               : { text: 'RA', bg: 'bg-orange-500', light: 'bg-orange-50 text-orange-800 border-orange-200' };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-wide">KÝ TÚC XÁ — CỔNG RA VÀO</h1>
          <p className="text-gray-400 text-sm mt-0.5">Nhận diện khuôn mặt tự động</p>
        </div>
        <div className="text-right text-sm text-gray-400">
          {lastLogTime && <p>Lần cuối: {lastLogTime}</p>}
          <p className={isLoaded ? 'text-green-400' : 'text-yellow-400'}>
            {isLoaded ? '● Model sẵn sàng' : '○ Đang tải model...'}
          </p>
        </div>
      </header>

      <div className="flex flex-1 gap-6 p-6">
        {/* Camera panel */}
        <div className="flex-1 space-y-4">
          <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 aspect-[4/3] flex items-center justify-center relative">
            {cameraOn ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
                muted
                playsInline
              />
            ) : (
              <div className="text-center text-gray-500 space-y-2">
                <div className="text-5xl">📷</div>
                <p>Camera chưa bật</p>
              </div>
            )}

            {/* Scan overlay */}
            {scanning && (
              <div className="absolute inset-0 border-2 border-blue-400 rounded-2xl pointer-events-none animate-pulse" />
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {!cameraOn ? (
              <button
                onClick={startCamera}
                disabled={!isLoaded}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl font-semibold"
              >
                Bật camera
              </button>
            ) : !scanning ? (
              <button
                onClick={startScanning}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-semibold"
              >
                Bắt đầu quét
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-xl font-semibold"
              >
                Tạm dừng
              </button>
            )}

            {cameraOn && (
              <button
                onClick={stopCamera}
                className="px-5 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold"
              >
                Tắt
              </button>
            )}
          </div>
        </div>

        {/* Result + recent logs */}
        <div className="w-80 space-y-4">
          {/* Current result */}
          <div
            className={`rounded-2xl border p-5 min-h-36 flex flex-col justify-center transition-all duration-300 ${
              currentResult?.matched
                ? currentResult.suggestedDirection === 'IN'
                  ? 'bg-green-950 border-green-700'
                  : 'bg-orange-950 border-orange-700'
                : 'bg-gray-900 border-gray-700'
            }`}
          >
            {!currentResult && (
              <p className="text-gray-500 text-center text-sm">Chờ nhận diện...</p>
            )}

            {currentResult && !currentResult.matched && (
              <p className="text-gray-400 text-center text-sm">{currentResult.message}</p>
            )}

            {currentResult?.matched && (
              <div className="text-center space-y-2">
                <div
                  className={`inline-block text-3xl font-black px-6 py-2 rounded-xl ${
                    directionLabel(currentResult.suggestedDirection!).bg
                  }`}
                >
                  {directionLabel(currentResult.suggestedDirection!).text}
                </div>
                <p className="text-white font-bold text-lg leading-tight">
                  {currentResult.fullName ?? currentResult.studentCode}
                </p>
                <p className="text-gray-400 text-sm font-mono">{currentResult.studentCode}</p>
                <p className="text-gray-500 text-xs">
                  Độ tin cậy: {((currentResult.confidence ?? 0) * 100).toFixed(1)}%
                </p>
              </div>
            )}
          </div>

          {/* Recent logs */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Lượt gần đây</h3>
            {recentLogs.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-4">Chưa có lượt nào</p>
            ) : (
              <ul className="space-y-2">
                {recentLogs.map((log, i) => {
                  const d = directionLabel(log.direction);
                  return (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded text-white ${d.bg}`}
                      >
                        {d.text}
                      </span>
                      <span className="flex-1 truncate text-gray-300">
                        {log.fullName ?? log.studentCode}
                      </span>
                      <span className="text-gray-600 text-xs shrink-0">
                        {new Date(log.loggedAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {faceError && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-900 border border-red-700 rounded-xl p-4 text-red-200 text-sm">
          {faceError}
        </div>
      )}
    </div>
  );
}
