'use client';

/**
 * Track Selector Component
 * 
 * Dropdown to change a task's track in Edit Mode
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface TrackSelectorProps {
  currentTrack: string;
  onTrackChange: (newTrack: string) => void;
}

const tracks = [
  { value: 'BACKLOG', label: 'Backlog', color: 'bg-gray-100 dark:bg-gray-800' },
  { value: 'BUG', label: 'Bug', color: 'bg-red-50 dark:bg-red-950' },
  { value: 'DESIGN', label: 'Design', color: 'bg-purple-50 dark:bg-purple-950' },
  { value: 'DOC', label: 'Doc', color: 'bg-blue-50 dark:bg-blue-950' },
  { value: 'DEV', label: 'Dev', color: 'bg-green-50 dark:bg-green-950' },
];

export function TrackSelector({ currentTrack, onTrackChange }: TrackSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentTrackInfo = tracks.find(t => t.value === currentTrack) || tracks[0];
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  const handleTrackSelect = (track: string) => {
    if (track !== currentTrack) {
      onTrackChange(track);
    }
    setIsOpen(false);
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium',
          'hover:opacity-80 transition-opacity',
          currentTrackInfo.color
        )}
        title="Change track"
      >
        {currentTrackInfo.label}
        <ChevronDown className="w-3 h-3" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 min-w-[100px]">
          {tracks.map((track) => (
            <button
              key={track.value}
              onClick={(e) => {
                e.stopPropagation();
                handleTrackSelect(track.value);
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                track.value === currentTrack && 'font-semibold'
              )}
            >
              {track.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
