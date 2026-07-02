'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  compressImage,
  DEFAULT_FORMAT,
  DEFAULT_QUALITY,
  isImageFile,
} from '../lib/compress';

export function useCompressor() {
  const [file, setFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [format, setFormat] = useState(DEFAULT_FORMAT);
  const [maxWidth, setMaxWidth] = useState('');
  const [maxHeight, setMaxHeight] = useState('');
  const [maxSizeMB, setMaxSizeMB] = useState('');
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('compare');
  const inputRef = useRef(null);
  const prevUrlRef = useRef(null);
  const skipReprocessRef = useRef(false);

  const getOpts = useCallback(() => ({
    quality,
    format,
    maxWidth: maxWidth ? parseInt(maxWidth, 10) : undefined,
    maxHeight: maxHeight ? parseInt(maxHeight, 10) : undefined,
    maxSizeMB: maxSizeMB ? parseFloat(maxSizeMB) : undefined,
  }), [quality, format, maxWidth, maxHeight, maxSizeMB]);

  const clearUpload = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setOriginalUrl(null);
    setResult(null);
    setError(null);
    setQuality(DEFAULT_QUALITY);
    setFormat(DEFAULT_FORMAT);
    setMaxWidth('');
    setMaxHeight('');
    setMaxSizeMB('');
    setViewMode('compare');
    if (inputRef.current) inputRef.current.value = '';
  }, [originalUrl, result?.url]);

  const handleFile = useCallback(async (imageFile) => {
    if (!isImageFile(imageFile)) return;
    setError(null);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(imageFile);
    setOriginalUrl(URL.createObjectURL(imageFile));
    setResult(null);
    setInitialLoading(true);
    setViewMode('compare');
    skipReprocessRef.current = true;
    try {
      setResult(await compressImage(imageFile, getOpts()));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to process image');
    }
    setInitialLoading(false);
  }, [getOpts, originalUrl, result?.url]);

  useEffect(() => {
    if (!file || initialLoading) return;
    if (skipReprocessRef.current) {
      skipReprocessRef.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      setReprocessing(true);
      try {
        const r = await compressImage(file, getOpts());
        prevUrlRef.current = result?.url;
        setResult(r);
        if (prevUrlRef.current) setTimeout(() => URL.revokeObjectURL(prevUrlRef.current), 100);
      } catch (err) {
        console.error(err);
      }
      setReprocessing(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [quality, format, maxWidth, maxHeight, maxSizeMB, file, initialLoading]);

  const resetParams = useCallback(() => {
    setQuality(DEFAULT_QUALITY);
    setFormat(DEFAULT_FORMAT);
    setMaxWidth('');
    setMaxHeight('');
    setMaxSizeMB('');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const download = useCallback(() => {
    if (!result) return;
    const ext = result.format === 'jpeg' ? 'jpg' : result.format;
    const baseName = file?.name ? file.name.replace(/\.[^.]+$/, '') : 'image';
    const a = document.createElement('a');
    a.href = result.url;
    a.download = `${baseName}-optimized.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [result, file?.name]);

  const loadExample = useCallback(async (url, name) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await handleFile(new File([blob], name, { type: blob.type }));
    } catch (err) {
      console.error(err);
    }
  }, [handleFile]);

  return {
    file,
    originalUrl,
    result,
    initialLoading,
    reprocessing,
    dragOver,
    setDragOver,
    quality,
    setQuality,
    format,
    setFormat,
    maxWidth,
    setMaxWidth,
    maxHeight,
    setMaxHeight,
    maxSizeMB,
    setMaxSizeMB,
    error,
    viewMode,
    setViewMode,
    inputRef,
    getOpts,
    handleFile,
    handleDrop,
    clearUpload,
    resetParams,
    download,
    loadExample,
  };
}
