'use client';

import React, { useState } from 'react';
import { Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
  noteTitle?: string;
  isEditable?: boolean;
  onRemoveImage?: (index: number) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  noteTitle = 'Görsel',
  isEditable = false,
  onRemoveImage,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  return (
    <div className="relative mb-3.5 group/gallery">
      {/* 1 Image */}
      {images.length === 1 && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setSelectedImageIndex(0);
          }}
          className="relative overflow-hidden rounded-2xl border-2 border-white/60 shadow-sm bg-black/5 aspect-[16/10] cursor-pointer transition-transform duration-200 hover:scale-[1.01]"
        >
          <img
            src={images[0]}
            alt={noteTitle}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/gallery:opacity-100 transition-opacity flex items-center justify-center">
            <span className="p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-800 shadow-md">
              <Maximize2 className="w-4 h-4" />
            </span>
          </div>
          {isEditable && onRemoveImage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveImage(0);
              }}
              className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded-full shadow-md transition-transform hover:scale-110"
              title="Fotoğrafı Kaldır"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 2 Images */}
      {images.length === 2 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((img, idx) => (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageIndex(idx);
              }}
              className="relative overflow-hidden rounded-2xl border-2 border-white/60 shadow-sm bg-black/5 aspect-square cursor-pointer transition-transform hover:scale-[1.02]"
            >
              <img src={img} alt={`${noteTitle} ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
              {isEditable && onRemoveImage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveImage(idx);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 bg-red-500/90 hover:bg-red-600 text-white rounded-full shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3 or more Images */}
      {images.length >= 3 && (
        <div className="grid grid-cols-3 gap-1.5">
          {images.slice(0, 3).map((img, idx) => {
            const isThird = idx === 2;
            const extraCount = images.length - 3;
            return (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(idx);
                }}
                className="relative overflow-hidden rounded-xl border border-white/60 shadow-xs bg-black/5 aspect-square cursor-pointer transition-transform hover:scale-[1.03]"
              >
                <img src={img} alt={`${noteTitle} ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                {isThird && extraCount > 0 && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white font-bold text-sm">
                    +{extraCount}
                  </div>
                )}
                {isEditable && onRemoveImage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveImage(idx);
                    }}
                    className="absolute top-1 right-1 p-1 bg-red-500/90 text-white rounded-full shadow"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImageIndex !== null && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setSelectedImageIndex(null);
          }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
          >
            <img
              src={images[selectedImageIndex]}
              alt={noteTitle}
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl border-2 border-white/20"
            />
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            {images.length > 1 && (
              <div className="flex items-center gap-4 mt-3 text-white">
                <button
                  onClick={() =>
                    setSelectedImageIndex((prev) =>
                      prev !== null ? (prev === 0 ? images.length - 1 : prev - 1) : 0
                    )
                  }
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <span className="text-sm font-medium">
                  {selectedImageIndex + 1} / {images.length}
                </span>
                <button
                  onClick={() =>
                    setSelectedImageIndex((prev) =>
                      prev !== null ? (prev === images.length - 1 ? 0 : prev + 1) : 0
                    )
                  }
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
