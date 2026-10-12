import { ClientHome } from "./_components/Home/ClientHome";

/**
 * Home Page — Server Component
 * Navbar đã nằm trong layout.tsx → không cần import ở đây
 */
export default function Home() {
  return (
    <main className="relative w-full h-screen overflow-hidden">
      <ClientHome />
    </main>
  );
}
