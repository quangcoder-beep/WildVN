const BASE = '';

export const VIDEOS = {
  home: {
    heroLoop: {
      mp4: `${BASE}/videos/home/hero-loop.mp4`,
      webm: `${BASE}/videos/home/hero-loop.webm`,
      poster: `${BASE}/videos/home/hero-loop-poster.jpg`,
    },
    section1: {
      mp4: `${BASE}/videos/home/section-1.mp4`,
      webm: `${BASE}/videos/home/section-1.webm`,
      poster: `${BASE}/videos/home/section-1-poster.jpg`,
    },
    section2: {
      mp4: `${BASE}/videos/home/section-2.mp4`,
      webm: `${BASE}/videos/home/section-2.webm`,
      poster: `${BASE}/videos/home/section-2-poster.jpg`,
    },
    section3: {
      mp4: `${BASE}/videos/home/section-4.mp4`,
      webm: `${BASE}/videos/home/section-4.webm`,
      poster: `${BASE}/videos/home/section-4-poster.jpg`,
    },
    section4: {
      mp4: `${BASE}/videos/home/section-6.mp4`,
      webm: `${BASE}/videos/home/section-6.webm`,
      poster: `${BASE}/videos/home/section-6-poster.jpg`,
    },
  },
  ambient: {
    bg1: { 
      mp4: `${BASE}/videos/ambient/bg-ambient-1.mp4`,
      webm: `${BASE}/videos/ambient/bg-ambient-1.webm`,
      poster: `${BASE}/videos/ambient/bg-ambient-1-poster.jpg`,
    },
    bg2: { 
      mp4: `${BASE}/videos/ambient/bg-ambient-2.mp4`,
      webm: `${BASE}/videos/ambient/bg-ambient-2.webm`,
      poster: `${BASE}/videos/ambient/bg-ambient-2-poster.jpg`,
    },
    seamlessLoop: { 
      mp4: `${BASE}/videos/ambient/seamless-loop.mp4`,
      webm: `${BASE}/videos/ambient/seamless-loop.webm`,
      poster: `${BASE}/videos/ambient/seamless-loop-poster.jpg`,
    },
    dmp: { 
      mp4: `${BASE}/videos/ambient/dmp-ambient.mp4`,
      webm: `${BASE}/videos/ambient/dmp-ambient.webm`,
      poster: `${BASE}/videos/ambient/dmp-ambient-poster.jpg`,
    },
  },
  bando: {
    animation: {
      mp4: `${BASE}/videos/home/bando-animation.mp4`,
      webm: `${BASE}/videos/home/bando-animation.webm`,
      poster: `${BASE}/videos/home/bando-animation-poster.jpg`,
    }
  }
} as const;

export const IMAGES = {
  shared: {
    start: `${BASE}/images/shared/start.jpg`,
    end: `${BASE}/images/shared/end.jpg`,
    beforeBg: `${BASE}/images/shared/before-background.png`,
  },
  sequences: {
    home3: {
      path: `${BASE}/images/sequences/home3`,
      prefix: 'ezgif-frame-',
      extension: '.jpg',
      count: 48,
    },
    home5: {
      path: `${BASE}/images/sequences/home5`,
      prefix: 'ezgif-frame-',
      extension: '.jpg',
      count: 44,
    },
    bando: {
      path: `${BASE}/images/sequences/bando`,
      prefix: 'ezgif-frame-',
      extension: '.jpg',
      totalFrames: 121,
      getFrame: (index: number) => {
        const paddedIndex = index.toString().padStart(3, '0');
        return `${BASE}/images/sequences/bando/ezgif-frame-${paddedIndex}.jpg`;
      }
    }
  }
} as const;
