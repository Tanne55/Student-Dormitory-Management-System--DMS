'use client';

import { useEffect, useRef, useState } from 'react';

// face-api.js types (dynamic import để tránh SSR)
type FaceApi = typeof import('@vladmandic/face-api');

interface UseFaceApiReturn {
  faceApi: FaceApi | null;
  isLoaded: boolean;
  error: string | null;
}

let cachedFaceApi: FaceApi | null = null;
let loadPromise: Promise<FaceApi> | null = null;

async function loadFaceApi(): Promise<FaceApi> {
  if (cachedFaceApi) return cachedFaceApi;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const faceApi = await import('@vladmandic/face-api');
    const MODEL_URL = '/face-models';
    await Promise.all([
      faceApi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceApi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceApi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    ]);
    cachedFaceApi = faceApi;
    return faceApi;
  })();

  return loadPromise;
}

export function useFaceApi(): UseFaceApiReturn {
  const [faceApi, setFaceApi] = useState<FaceApi | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFaceApi()
      .then((api) => {
        setFaceApi(api);
        setIsLoaded(true);
      })
      .catch((err) => {
        setError('Không thể tải model nhận diện khuôn mặt: ' + err.message);
      });
  }, []);

  return { faceApi, isLoaded, error };
}

// Trích xuất face descriptor từ video/canvas element
export async function extractDescriptor(
  faceApi: FaceApi,
  mediaEl: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
): Promise<Float32Array | null> {
  const detection = await faceApi
    .detectSingleFace(mediaEl, new faceApi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection?.descriptor ?? null;
}
