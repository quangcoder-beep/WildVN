import type { Metadata } from "next";
import SearchClient from "./_components/SearchClient";

export const metadata: Metadata = {
  title: "Tra cứu loài",
  description:
    "Khám phá thế giới hoang dã Việt Nam — tra cứu hàng trăm loài động thực vật, tình trạng bảo tồn và phân bố.",
};

/**
 * Search Page — Server Component
 * CSS imported via globals.css, logic đẩy xuống SearchClient (Leaf)
 */
export default function SearchPage() {
  return <SearchClient />;
}
