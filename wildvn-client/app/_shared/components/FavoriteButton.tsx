"use client";

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/app/_shared/stores/authStore';
import { favoritesApi } from '@/app/_shared/services/api';

interface FavoriteButtonProps {
  speciesId: string;
  className?: string;
}

export default function FavoriteButton({ speciesId, className = '' }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isLoggedIn, user } = useAuthStore();

  useEffect(() => {
    // If not logged in, no need to fetch status
    if (!isLoggedIn || !user) {
      setIsFavorited(false);
      setIsLoading(false);
      return;
    }

    // Fetch initial status
    const fetchStatus = async () => {
      try {
        const response = await favoritesApi.getStatus(speciesId);
        setIsFavorited(response.data.favorited);
      } catch (error) {
        console.error('Failed to fetch favorite status', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatus();
  }, [speciesId, isLoggedIn, user]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLoggedIn || !user) {
      window.alert("Vui lòng đăng nhập để lưu vào bộ sưu tập");
      return;
    }
    
    // Optimistic UI update
    const previousState = isFavorited;
    setIsFavorited(!isFavorited);

    try {
      const response = await favoritesApi.toggle(speciesId);
      setIsFavorited(response.data.favorited);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Rollback on error
      setIsFavorited(previousState);
    }
  };

  if (isLoading) {
    return (
      <button 
        className={`p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 opacity-50 cursor-not-allowed ${className}`}
        disabled
      >
        <div className="w-6 h-6 rounded-full animate-pulse bg-white/20" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleFavorite}
      className={`p-2 rounded-full backdrop-blur-sm border transition-all duration-300 flex items-center justify-center group active:scale-95 ${
        isFavorited 
          ? 'bg-rose-500/20 border-rose-500/50 hover:bg-rose-500/30' 
          : 'bg-white/10 border-white/20 hover:bg-white/20'
      } ${className}`}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isFavorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-6 h-6 transition-all duration-300 ${
          isFavorited 
            ? 'text-rose-500 scale-110' 
            : 'text-white group-hover:scale-110 group-hover:text-rose-200'
        }`}
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </button>
  );
}
