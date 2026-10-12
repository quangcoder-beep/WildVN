"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import FavoriteButton from '@/app/_shared/components/FavoriteButton';
import { getImageUrl } from '@/app/_shared/lib/media';
import { favoritesApi } from '@/app/_shared/services/api';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    favoritesApi.list()
      .then((response) => {
        if (mounted) setFavorites(response.data);
      })
      .catch(() => {
        if (mounted) setFavorites([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-200 pt-32 pb-20 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-serif text-amber-50 mb-4 tracking-tight">Bộ sưu tập của tôi</h1>
          <p className="text-stone-400 text-lg max-w-2xl">
            Lưu trữ và theo dõi những loài động thực vật quý hiếm mà bạn yêu thích trên nền tảng WildVN.
          </p>
        </header>

        {loading ? (
          <div className="py-20 text-center text-stone-400">Đang tải bộ sưu tập...</div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 border border-stone-800/50 rounded-2xl bg-stone-900/20 backdrop-blur-sm text-center">
            <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-medium text-stone-200 mb-2">Bạn chưa lưu loài nào</h2>
            <p className="text-stone-400 max-w-md mb-8">
              Khám phá danh sách các loài sinh vật đặc hữu của Việt Nam và thêm vào bộ sưu tập cá nhân của bạn.
            </p>
            <Link 
              href="/search" 
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-amber-50 font-medium rounded-full transition-colors duration-300"
            >
              Khám phá ngay
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((item) => {
              // Nếu trong DB có cột thumbnailUrl, dùng getImageUrl để resolve MinIO path.
              const imageUrl = getImageUrl(item.species.thumbnailUrl) || '';
              
              return (
                <div 
                  key={item.speciesId} 
                  className="group relative overflow-hidden rounded-2xl border border-stone-800/60 bg-stone-900/40 transition-all duration-500 hover:border-stone-700 hover:bg-stone-800/40"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-stone-950 relative">
                    <img
                      src={imageUrl}
                      alt={item.species.nameVn}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent opacity-80" />
                    
                    <div className="absolute top-2 right-2 z-10 drop-shadow-lg pointer-events-auto">
                      <FavoriteButton speciesId={item.speciesId} />
                    </div>
                  </div>
                  
                  <div className="absolute bottom-0 left-0 w-full p-6">
                    <Link href={`/species/${item.species.slug}`} className="block">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                          item.species.conservationStatus === 'CR' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          item.species.conservationStatus === 'EN' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          item.species.conservationStatus === 'VU' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          'bg-stone-700 text-stone-300'
                        }`}>
                          {item.species.conservationStatus}
                        </span>
                        <p className="text-sm italic text-stone-400 font-serif">
                          {item.species.scientificName}
                        </p>
                      </div>
                      <h3 className="text-2xl font-bold text-stone-100 group-hover:text-amber-400 transition-colors">
                        {item.species.nameVn}
                      </h3>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  );
}
