import React, { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type { ChatApi } from '../services/chatApi';

interface AuthImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string;
  chatApi: ChatApi;
}

export function AuthImage({ src, alt, className, chatApi, ...rest }: AuthImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
    if (!src) return null;
    return chatApi.isProtectedFileUrl(src) ? null : src;
  });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) {
      setResolvedSrc(null);
      return;
    }

    if (!chatApi.isProtectedFileUrl(src)) {
      setResolvedSrc(src);
      setFailed(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setFailed(false);

    chatApi
      .fetchFileBlob(src)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src, chatApi]);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 text-gray-400 rounded-lg border border-gray-200 p-2 ${className || ''}`}
        title={alt || 'Image unavailable'}
      >
        <ImageIcon className="w-4 h-4" />
      </div>
    );
  }

  if (!resolvedSrc) {
    return (
      <div
        className={`animate-pulse bg-gray-100 rounded-lg ${className || 'w-full h-32'}`}
        aria-label={alt || 'Loading image'}
      />
    );
  }

  return <img src={resolvedSrc} alt={alt} className={className} {...rest} />;
}

export async function openAuthenticatedFile(url: string, chatApi: ChatApi): Promise<void> {
  if (!url) return;
  if (!chatApi.isProtectedFileUrl(url)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  const blob = await chatApi.fetchFileBlob(url);
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
