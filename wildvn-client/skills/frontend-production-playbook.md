# Frontend Engineering Skills — Phòng Tránh Lỗi Production

> Tài liệu tham chiếu cho Next.js App Router, animation-heavy interfaces, và cinematic web experiences.  
> Cập nhật từ thực tế dự án WILDVN và các pattern production phổ biến.

---

## Mục lục

1. [Browser Lifecycle & Cache](#1-browser-lifecycle--cache)
2. [Next.js App Router](#2-nextjs-app-router)
3. [Animation & Motion Systems](#3-animation--motion-systems)
4. [Performance Engineering](#4-performance-engineering)
5. [CSS Architecture](#5-css-architecture)
6. [State Management](#6-state-management)
7. [Accessibility](#7-accessibility)
8. [Responsive & Mobile](#8-responsive--mobile)
9. [Hydration & SSR/SSG](#9-hydration--ssrsg)
10. [Memory & Cleanup](#10-memory--cleanup)
11. [Debugging Toolkit](#11-debugging-toolkit)
12. [Pre-ship Checklist](#12-pre-ship-checklist)

---

## 1. Browser Lifecycle & Cache

### BFCache (Back/Forward Cache)

Trình duyệt freeze toàn bộ trang vào memory khi navigate đi. Khi Back, restore nguyên trạng — **không chạy lại JS, không reload CSS**.

**Dấu hiệu bị lỗi:**
- CSS mất sau khi Back
- Animation bị đóng băng
- Scroll library (Lenis, Locomotive) không hoạt động
- GSAP ScrollTrigger bị desync

**Cách fix:**

```ts
// Luôn lắng nghe pageshow, KHÔNG dùng load hay DOMContentLoaded
window.addEventListener('pageshow', (event: PageTransitionEvent) => {
  if (event.persisted) {
    // Trang restore từ BFCache — reinitialize libraries ở đây
  }
});
```

**Quy tắc:**
- Dùng `event.persisted` để phân biệt BFCache restore vs full load
- Restart Lenis: `lenis.stop(); lenis.start()`
- Refresh GSAP: `ScrollTrigger.refresh(true)`
- Force CSS reflow nếu style bị mất: set `display: none` rồi `display: ''` trên `documentElement`
- Không opt-out BFCache bằng `Cache-Control: no-store` trừ khi thực sự cần — làm mất UX benefit

**Những thứ khiến trang bị loại khỏi BFCache:**
- `unload` event listener (deprecated, xóa đi)
- `Cache-Control: no-store` header
- `window.opener` không phải null
- IndexedDB transaction đang mở
- WebSocket hoặc fetch đang pending khi navigate

---

### Page Visibility & Focus Events

```ts
// Phân biệt rõ 3 event khác nhau
document.addEventListener('visibilitychange', () => {
  // Tab bị ẩn/hiện — dùng cho pause video, analytics
});

window.addEventListener('focus', () => {
  // Window lấy lại focus — dùng cho refetch data
});

window.addEventListener('pageshow', (e) => {
  // Trang được hiển thị — bao gồm cả BFCache restore
  if (e.persisted) { /* BFCache */ }
});
```

---

### Navigation Events trong Next.js App Router

```ts
// App Router KHÔNG có Router.events như Pages Router
// Dùng các cách này thay thế:

// 1. usePathname để detect route change
const pathname = usePathname();
useEffect(() => {
  // Chạy khi route thay đổi
}, [pathname]);

// 2. useRouter().push() rồi xử lý transition thủ công
// 3. layout.tsx wrapping để persist state across routes
```

---

## 2. Next.js App Router

### Server vs Client Component — Quy tắc phân loại

| Cần cái gì | Loại |
|---|---|
| `useState`, `useEffect`, event handlers | Client (`'use client'`) |
| `onClick`, `onChange` | Client |
| Browser APIs (`window`, `document`) | Client |
| Framer Motion, GSAP, Lenis | Client |
| Data fetching (async/await trực tiếp) | Server |
| `cookies()`, `headers()` | Server |
| Database / CMS queries | Server |
| SEO metadata | Server |
| Static content, no interactivity | Server |

**Quy tắc vàng:** Đẩy `'use client'` boundary xuống càng thấp càng tốt trong component tree.

```tsx
// ❌ Sai — cả page thành Client Component chỉ vì một button
'use client';
export default function Page() {
  return (
    <main>
      <HeavyStaticContent /> {/* lẽ ra có thể là Server */}
      <InteractiveButton />
    </main>
  );
}

// ✅ Đúng — chỉ phần interactive là Client
// page.tsx (Server)
export default function Page() {
  return (
    <main>
      <HeavyStaticContent />
      <InteractiveButton /> {/* file này có 'use client' */}
    </main>
  );
}
```

---

### Dynamic Imports — Khi nào bắt buộc dùng

```ts
// Bắt buộc dùng dynamic import với ssr: false cho:
// - Thư viện dùng window/document
// - Animation libraries (particles, canvas)
// - Heavy visualization components

const FloatingParticles = dynamic(
  () => import('@/components/FloatingParticles'),
  { ssr: false, loading: () => null }
);

const HeavyChart = dynamic(
  () => import('@/components/HeavyChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
```

---

### Suspense Boundaries — Pattern chuẩn

```tsx
// Luôn có fallback có cùng kích thước với content thật
// để tránh CLS (Cumulative Layout Shift)

<Suspense fallback={<SpeciesGridSkeleton />}>
  <SpeciesGrid />
</Suspense>

// Skeleton phải có cùng height với content thật
function SpeciesGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[400px] rounded-3xl bg-white/5 animate-pulse" />
      ))}
    </div>
  );
}
```

---

### URL State cho Filters — Không dùng useState thuần

```ts
// ❌ Sai — filter state mất khi Back, không shareable
const [status, setStatus] = useState('CR');

// ✅ Đúng — dùng searchParams để persist state trong URL
// Dùng nuqs (thư viện nhỏ) hoặc native URLSearchParams
import { useQueryState } from 'nuqs';

const [status, setStatus] = useQueryState('status', { defaultValue: '' });
// URL tự động: /species?status=CR
// Back navigation giữ nguyên filter state
// Link có thể share được
```

---

### generateMetadata — Luôn có đầy đủ

```ts
// app/species/page.tsx
export const metadata: Metadata = {
  title: 'Danh Mục Loài — WILDVN',
  description: '...',
  openGraph: {
    title: '...',
    images: ['/og/species.jpg'],
  },
  // Quan trọng cho cinematic sites:
  themeColor: '#050505',
  colorScheme: 'dark',
};
```

---

## 3. Animation & Motion Systems

### Motion Tiers — Kiến trúc phân cấp

Không bao giờ để tất cả animations có cùng priority. Phân tầng:

```ts
// lib/motion-tokens.ts
export const MOTION = {
  // Tier 1: Critical — luôn chạy, reduce duration khi reduced-motion
  spring: { type: 'spring', stiffness: 400, damping: 30 },
  
  // Tier 2: Enhancement — disable khi reduced-motion
  tilt: { type: 'spring', stiffness: 300, damping: 25 },
  
  // Tier 3: Atmospheric — disable khi mobile hoặc reduced-motion
  particle: { duration: 8, ease: 'linear', repeat: Infinity },
  
  // Easing chuẩn
  ease: {
    cinematic: [0.16, 1, 0.3, 1],
    exit: [0.4, 0, 1, 1],
    enter: [0, 0, 0.2, 1],
  }
} as const;
```

---

### useReducedMotion — Bắt buộc implement

```ts
// hooks/useMotionSafe.ts
import { useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function useMotionSafe() {
  const prefersReduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [isLowEnd, setIsLowEnd] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    // Navigator API để detect low-end device
    const nav = navigator as Navigator & { deviceMemory?: number };
    setIsLowEnd((nav.deviceMemory ?? 8) < 4);
  }, []);

  return {
    tier1: true,                          // Luôn chạy
    tier2: !prefersReduced,               // Disable khi reduced-motion
    tier3: !prefersReduced && !isMobile && !isLowEnd, // Chỉ desktop high-end
  };
}
```

---

### 3D Tilt — Cách implement đúng

```ts
// ❌ Sai — getBoundingClientRect() trong mọi mousemove = layout thrashing
onMouseMove={(e) => {
  const rect = e.currentTarget.getBoundingClientRect(); // Đây là vấn đề
  setTilt({ x: ..., y: ... });
}}

// ✅ Đúng — cache rect, dùng CSS custom properties
const rectRef = useRef<DOMRect | null>(null);

const handleMouseEnter = () => {
  rectRef.current = cardRef.current?.getBoundingClientRect() ?? null;
};

const handleMouseMove = (e: MouseEvent) => {
  if (!rectRef.current) return;
  const rect = rectRef.current;
  // Dùng CSS vars thay vì setState để tránh re-render
  cardRef.current?.style.setProperty('--tilt-x', `${...}deg`);
  cardRef.current?.style.setProperty('--tilt-y', `${...}deg`);
};

// CSS
// transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
```

---

### GSAP ScrollTrigger — Cleanup bắt buộc

```ts
useEffect(() => {
  const ctx = gsap.context(() => {
    ScrollTrigger.create({
      trigger: triggerRef.current,
      // ...
    });
  }, containerRef);

  // Luôn cleanup — không cleanup = memory leak + duplicate triggers
  return () => ctx.revert();
}, []);
```

---

### Lenis — Pattern chuẩn trong App Router

```ts
// providers/LenisProvider.tsx
'use client';

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, easing: (t) => ... });
    lenisRef.current = lenis;

    // Sync với GSAP ticker nếu dùng cả hai
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // BFCache fix
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        lenis.stop();
        lenis.start();
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      lenis.destroy();
      gsap.ticker.remove((time) => lenis.raf(time * 1000));
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return <>{children}</>;
}
```

---

### AnimatePresence — Tránh layout shift

```tsx
// Luôn dùng key duy nhất và mode phù hợp
<AnimatePresence mode="wait" initial={false}>
  {filteredSpecies.map((species) => (
    <motion.div
      key={species.id} // Key phải stable và unique
      layout            // Chỉ dùng khi thực sự cần reflow
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    />
  ))}
</AnimatePresence>
```

---

## 4. Performance Engineering

### GPU Layer Management

```css
/* ❌ Sai — tạo GPU layer cho mọi thứ */
* { will-change: transform; }

/* ✅ Đúng — chỉ apply khi hover, remove sau */
.card {
  /* Không có will-change mặc định */
}
.card:hover {
  will-change: transform;
}
/* Hoặc dùng JS để add/remove class */
```

**Quy tắc:** < 10 elements có `will-change: transform` đồng thời. Nhiều hơn = GPU VRAM pressure = jank.

---

### Image Optimization — Next.js Image Component

```tsx
// Luôn dùng next/image, không bao giờ dùng <img> thuần cho content images
import Image from 'next/image';

<Image
  src={species.imageUrl}
  alt={`${species.commonName} — ${species.scientificName}`}
  width={400}
  height={500}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  placeholder="blur"
  blurDataURL={species.blurPlaceholder} // Generate lúc build
  priority={index < 3} // LCP candidates
/>
```

---

### Bundle Size — Kiểm tra thường xuyên

```bash
# Phân tích bundle
ANALYZE=true next build

# Kiểm tra specific package cost
npx bundlephobia <package-name>

# Tree-shaking check — import đúng cách
# ❌ Sai
import _ from 'lodash'; // Import toàn bộ lodash

# ✅ Đúng
import debounce from 'lodash/debounce'; // Chỉ import hàm cần
```

---

### Debounce & Throttle — Bắt buộc cho event handlers

```ts
import { useMemo } from 'react';
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';

// Search input — debounce 300ms
const handleSearch = useMemo(
  () => debounce((value: string) => { setQuery(value); }, 300),
  []
);

// Mouse move (tilt effect) — throttle 16ms (1 frame)
const handleMouseMove = useMemo(
  () => throttle((e: MouseEvent) => { updateTilt(e); }, 16),
  []
);

// Cleanup trong useEffect
useEffect(() => {
  return () => {
    handleSearch.cancel();
    handleMouseMove.cancel();
  };
}, [handleSearch, handleMouseMove]);
```

---

### IntersectionObserver — Lazy rendering cards

```ts
// Dùng cho catalog pages với nhiều cards
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect(); // Unobserve sau khi vào view lần đầu
        }
      },
      { threshold, rootMargin: '100px' } // Load trước 100px
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}
```

---

## 5. CSS Architecture

### CSS Custom Properties cho Dynamic Values

```css
/* Dùng CSS variables cho values thay đổi theo JS */
/* Tránh inline styles và setState cho animation values */

:root {
  --card-tilt-x: 0deg;
  --card-tilt-y: 0deg;
  --glow-color: 239, 68, 68; /* CR red — dạng RGB để dùng với opacity */
  --glow-intensity: 0;
}

.card {
  transform: rotateX(var(--card-tilt-x)) rotateY(var(--card-tilt-y));
  box-shadow: 0 0 calc(var(--glow-intensity) * 40px) 
              rgba(var(--glow-color), 0.4);
}
```

---

### Tailwind — Tránh Dynamic Class Names

```tsx
// ❌ Sai — Tailwind không thể tree-shake dynamic strings
const color = `text-${status}-500`; // Không hoạt động trong production

// ✅ Đúng — map đầy đủ tên class
const STATUS_CLASSES = {
  CR: 'text-red-500 border-red-500 shadow-red-500/40',
  EN: 'text-orange-500 border-orange-500 shadow-orange-500/40',
  VU: 'text-yellow-500 border-yellow-500 shadow-yellow-500/40',
  NT: 'text-green-400 border-green-400 shadow-green-400/40',
  LC: 'text-emerald-500 border-emerald-500 shadow-emerald-500/40',
} as const;

// Hoặc dùng CSS variables + inline style
<div style={{ '--status-color': STATUS_COLORS[status] } as CSSProperties} />
```

---

### Backdrop Filter — Performance warning

```css
/* backdrop-filter: blur() rất expensive */
/* Giới hạn số lượng elements dùng đồng thời */

/* ❌ Nhiều elements với backdrop-filter */
.every-card { backdrop-filter: blur(12px); } /* 20 cards = 20 blur passes */

/* ✅ Chỉ dùng cho overlay/modal, không phải list items */
.modal-overlay { backdrop-filter: blur(8px); }

/* Nếu bắt buộc phải dùng cho cards — giảm blur radius */
.card { backdrop-filter: blur(4px); } /* 4px thay vì 12px */
```

---

### Font Loading — Tránh FOUT

```tsx
// app/layout.tsx — Next.js font optimization
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',     // FOUT thay vì FOIT — tốt hơn cho UX
  preload: true,
  variable: '--font-display',
});

// Không bao giờ load font qua @import trong CSS — blocking
// Không bao giờ dùng <link> trong <body> — blocking
```

---

## 6. State Management

### Quy tắc chọn state solution

```
Local UI state (hover, open/close)     → useState
Shared state trong một subtree         → useContext + useReducer
URL-persistent state (filters, search) → URL searchParams (nuqs)
Server data                            → React Server Components + fetch
Client cache + server sync             → TanStack Query (nếu cần)
Global app state                       → Zustand (minimal)
Form state                             → React Hook Form
```

---

### Derived State — Không duplicate state

```ts
// ❌ Sai — filteredSpecies là derived state, không cần useState
const [species, setSpecies] = useState(allSpecies);
const [filteredSpecies, setFilteredSpecies] = useState(allSpecies); // Duplicate!

// ✅ Đúng — compute on the fly, hoặc useMemo nếu expensive
const [filters, setFilters] = useState({ status: '', query: '' });

const filteredSpecies = useMemo(
  () => allSpecies.filter(s => 
    (!filters.status || s.conservationStatus === filters.status) &&
    (!filters.query || s.name.toLowerCase().includes(filters.query.toLowerCase()))
  ),
  [allSpecies, filters]
);
```

---

## 7. Accessibility

### Checklist tối thiểu cho mọi component

```tsx
// 1. Semantic HTML trước, ARIA sau
<nav aria-label="Bộ lọc loài">     // Không phải <div>
<main>                               // Không phải <div id="main">
<article>                            // Mỗi species card

// 2. Keyboard navigation
<button onClick={...}>              // Không phải <div onClick={...}>
// Div không nhận focus và không trigger Enter/Space

// 3. Focus visible — không xóa outline
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  /* KHÔNG: outline: none; */
}

// 4. Alt text có nghĩa
<Image alt="Voọc Cát Bà — Loài linh trưởng cực kỳ nguy cấp" />
// Không phải: alt="species-image" hoặc alt=""

// 5. ARIA live cho dynamic content
<div aria-live="polite" aria-atomic="true">
  Hiển thị {count} / {total} loài
</div>
```

---

### prefers-reduced-motion — Implement ở mức CSS và JS

```css
/* CSS level */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

```ts
// JS level — Framer Motion
const shouldReduceMotion = useReducedMotion();

const variants = {
  hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
  visible: { opacity: 1, y: 0 },
};
```

---

### Color Contrast — Kiểm tra trước khi ship

```
WCAG AA (minimum):
- Text thường:    4.5:1
- Text lớn (18px bold hoặc 24px): 3:1
- UI components:  3:1

Tools:
- Chrome DevTools → CSS Overview → Colors
- https://webaim.org/resources/contrastchecker/
- axe DevTools extension

Lỗi hay gặp trong dark cinematic UIs:
- Text trắng mờ (opacity 0.6) trên nền tối → thường fail 4.5:1
- Neon glow không đủ bù cho text nhỏ
- Film grain overlay làm giảm perceived contrast
```

---

## 8. Responsive & Mobile

### Touch vs Pointer — Phân biệt input device

```ts
// Detect pointer type — chuẩn hơn UA sniffing
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const isFinePointer = window.matchMedia('(pointer: fine)').matches;

// Hoặc CSS
@media (pointer: coarse) {
  /* Touch device — disable hover effects */
  .card { transform: none !important; }
  .tilt-effect { display: none; }
}

@media (hover: none) {
  /* Device không có hover — thường là touch */
  .hover-only-content { display: block; } /* Luôn visible */
}
```

---

### Mobile Performance — Quy tắc cứng

```
Trên mobile, luôn:
- Disable floating particles hoàn toàn
- Giảm blur radius xuống ≤ 4px
- Không dùng backdrop-filter trên list items
- Không dùng 3D transforms phức tạp
- Giảm số lượng animated elements đồng thời xuống ≤ 3
- Dùng opacity thay vì blur cho transitions
```

---

### Container Queries — Tốt hơn breakpoints cho components

```css
/* Thay vì media query dựa trên viewport */
@media (min-width: 768px) {
  .card { grid-template-columns: 1fr 1fr; }
}

/* Dùng container query — component tự responsive theo container của nó */
.card-wrapper {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card { grid-template-columns: 1fr 1fr; }
}
```

---

## 9. Hydration & SSR/SSG

### Hydration Mismatch — Nguyên nhân và cách tránh

```tsx
// ❌ Nguyên nhân 1: Math.random() hay Date.now() trong render
function ParticleSystem() {
  const particles = Array.from({ length: 20 }, () => ({
    x: Math.random() * 100, // Server và client cho kết quả khác nhau!
  }));
}

// ✅ Fix: Seed random ở client-only
'use client';
function ParticleSystem() {
  const [particles, setParticles] = useState<Particle[]>([]);
  
  useEffect(() => {
    // Chỉ chạy ở client — không hydrate trên server
    setParticles(Array.from({ length: 20 }, () => ({
      x: Math.random() * 100,
    })));
  }, []);

  if (particles.length === 0) return null;
  return <Canvas particles={particles} />;
}
```

```tsx
// ❌ Nguyên nhân 2: Browser-only APIs trong render
function Component() {
  const width = window.innerWidth; // window không tồn tại trên server!
}

// ✅ Fix: useEffect hoặc typeof check
function Component() {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    setWidth(window.innerWidth);
  }, []);
}
```

```tsx
// ❌ Nguyên nhân 3: CSS-in-JS không đồng bộ class names
// Dùng Tailwind hoặc CSS Modules — không có hydration issues
```

---

### suppressHydrationWarning — Dùng đúng cách

```tsx
// Chỉ dùng cho elements intentionally khác nhau giữa server/client
// Ví dụ: timestamp, random ID

<time 
  dateTime={date.toISOString()}
  suppressHydrationWarning // OK vì chỉ text content khác
>
  {formattedDate}
</time>

// KHÔNG dùng để suppress lỗi thật — đó là che giấu bugs
```

---

## 10. Memory & Cleanup

### Event Listeners — Bắt buộc cleanup

```ts
// Mọi addEventListener phải có removeEventListener tương ứng
useEffect(() => {
  const handler = (e: Event) => { ... };
  
  window.addEventListener('resize', handler);
  document.addEventListener('keydown', handler);
  
  return () => {
    window.removeEventListener('resize', handler);
    document.removeEventListener('keydown', handler);
  };
}, []);

// Lưu ý: handler phải là cùng reference
// ❌ Sai — function mới mỗi render, remove không hoạt động
window.addEventListener('resize', () => { ... });
window.removeEventListener('resize', () => { ... }); // Khác reference!

// ✅ Đúng — lưu reference
const handler = useCallback(() => { ... }, []);
```

---

### Timers — Cleanup bắt buộc

```ts
useEffect(() => {
  const timeoutId = setTimeout(() => { ... }, 1000);
  const intervalId = setInterval(() => { ... }, 100);
  const rafId = requestAnimationFrame(() => { ... });

  return () => {
    clearTimeout(timeoutId);
    clearInterval(intervalId);
    cancelAnimationFrame(rafId);
  };
}, []);
```

---

### AbortController — Cancel fetch khi unmount

```ts
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/species', { signal: controller.signal })
    .then(res => res.json())
    .then(data => setSpecies(data))
    .catch(err => {
      if (err.name === 'AbortError') return; // Ignore — component unmounted
      console.error(err);
    });

  return () => controller.abort();
}, []);
```

---

## 11. Debugging Toolkit

### Performance Profiling

```
Chrome DevTools — Performance tab:
1. Record khi scroll/hover
2. Tìm "Long Tasks" (> 50ms) — đây là jank source
3. Tìm "Layout" trong flame chart — layout thrashing
4. Tìm "Paint" — excessive repaint areas
5. Layers panel — kiểm tra số lượng GPU layers

Mục tiêu:
- Không có Long Tasks > 50ms trong normal interaction
- < 10 Layers có will-change
- Paint areas chỉ ở vùng thay đổi, không phải full-page
```

---

### Memory Leak Detection

```
Chrome DevTools — Memory tab:
1. Take Heap Snapshot trước khi navigate đến trang
2. Navigate đến trang, interact
3. Navigate đi
4. Take Heap Snapshot thứ hai
5. So sánh — nếu retained size tăng = memory leak

Dấu hiệu leak:
- Detached DOM nodes trong snapshot
- Event listeners tăng theo thời gian
- GSAP tweens không được kill
```

---

### BFCache Testing

```
Chrome DevTools — Application tab → Back/forward cache:
1. Navigate đến trang
2. Click "Test back/forward cache"
3. Xem "Reasons" nếu bị evict
4. Fix từng reason một

Common eviction reasons:
- unload listener → xóa đi
- Cache-Control: no-store → review header strategy
- WebSocket → đóng trước khi navigate
```

---

### React DevTools

```
Profiler tab:
- "Highlight updates" — xem component nào re-render
- Record interaction — xem render time
- Tìm components render > 16ms — optimize với memo/useMemo

Components tab:
- Xem component tree
- Kiểm tra props và state
- Xem hooks
```

---

## 12. Pre-ship Checklist

### Visual & UX

- [ ] Không có layout shift khi load (CLS < 0.1)
- [ ] Loading states cho mọi async operation
- [ ] Empty states được design (filter 0 kết quả, search không có data)
- [ ] Error states được handle (image load fail, data fetch fail)
- [ ] Hover states rõ ràng cho mọi interactive element
- [ ] Focus states visible cho keyboard navigation
- [ ] Không có orphaned text (text bị cắt, overflow hidden)

### Performance

- [ ] LCP < 2.5s trên 4G (test với Chrome DevTools Network throttling)
- [ ] Không có Long Tasks > 50ms trong normal scroll/interact
- [ ] Bundle size page chunk < 150KB gzipped
- [ ] Images dùng next/image với sizes attribute đúng
- [ ] Dynamic imports cho heavy components
- [ ] `will-change` chỉ dùng khi cần, remove sau animation

### Accessibility

- [ ] Contrast ratio pass WCAG AA (4.5:1 cho text thường)
- [ ] Keyboard navigation hoàn chỉnh (Tab, Enter, Escape, Arrow keys)
- [ ] Screen reader test với NVDA (Windows) hoặc VoiceOver (Mac)
- [ ] `prefers-reduced-motion` respected
- [ ] Không có hover-only information (content không accessible trên touch)
- [ ] Touch targets ≥ 44×44px

### Cross-browser & Device

- [ ] iOS Safari test (hay có flex/grid bugs)
- [ ] Android Chrome test (performance benchmark)
- [ ] Firefox test
- [ ] Không có `window is not defined` errors
- [ ] BFCache test — Back navigation hoạt động đúng

### Code Quality

- [ ] `npx tsc --noEmit` pass 0 errors
- [ ] Không có console.error hay console.warn trong production
- [ ] Tất cả useEffect có cleanup function
- [ ] Không có `// @ts-ignore` không có lý do
- [ ] Environment variables trong `.env.example`

---

> **Nguyên tắc cốt lõi:**  
> Code dễ đọc > code clever. Cleanup mọi side effect. Test trên device thật.  
> Cinematic experience đến từ intentional restraint, không phải số lượng effects.