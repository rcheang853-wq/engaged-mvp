'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled = false
}: SliderProps) {
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const getPercentage = (val: number) => ((val - min) / (max - min)) * 100;

  const getValue = useCallback((clientX: number) => {
    if (!sliderRef.current) return min;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawValue = min + percentage * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;

    return Math.max(min, Math.min(max, steppedValue));
  }, [min, max, step]);

  const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(index);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging === null || disabled) return;

    const newValue = getValue(e.clientX);
    const newValues = [...value];
    newValues[isDragging] = newValue;

    // Ensure values are in order
    if (newValues.length === 2) {
      if (isDragging === 0 && newValue > newValues[1]) {
        newValues[1] = newValue;
      } else if (isDragging === 1 && newValue < newValues[0]) {
        newValues[0] = newValue;
      }
    }

    onValueChange(newValues);
  }, [isDragging, getValue, value, onValueChange, disabled]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  React.useEffect(() => {
    if (isDragging !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleTrackClick = (e: React.MouseEvent) => {
    if (disabled) return;

    const newValue = getValue(e.clientX);

    if (value.length === 1) {
      onValueChange([newValue]);
    } else if (value.length === 2) {
      // Find closest thumb
      const dist1 = Math.abs(newValue - value[0]);
      const dist2 = Math.abs(newValue - value[1]);
      const closestIndex = dist1 <= dist2 ? 0 : 1;

      const newValues = [...value];
      newValues[closestIndex] = newValue;

      // Ensure values are in order
      if (newValues[0] > newValues[1]) {
        newValues.sort((a, b) => a - b);
      }

      onValueChange(newValues);
    }
  };

  return (
    <div className={cn("relative flex items-center w-full touch-none", className)}>
      <div
        ref={sliderRef}
        className="relative flex-1 h-2 bg-gray-200 rounded-full cursor-pointer"
        onClick={handleTrackClick}
      >
        {/* Track fill */}
        {value.length === 2 ? (
          <div
            className="absolute h-2 bg-blue-600 rounded-full"
            style={{
              left: `${getPercentage(value[0])}%`,
              right: `${100 - getPercentage(value[1])}%`
            }}
          />
        ) : (
          <div
            className="absolute h-2 bg-blue-600 rounded-full"
            style={{
              width: `${getPercentage(value[0])}%`
            }}
          />
        )}

        {/* Thumbs */}
        {value.map((val, index) => (
          <div
            key={index}
            className={cn(
              "absolute w-5 h-5 bg-white border-2 border-blue-600 rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2 top-1/2 transition-colors",
              isDragging === index && "border-blue-700 bg-blue-50",
              disabled && "cursor-not-allowed opacity-50"
            )}
            style={{ left: `${getPercentage(val)}%` }}
            onMouseDown={handleMouseDown(index)}
          />
        ))}
      </div>
    </div>
  );
}