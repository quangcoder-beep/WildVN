import type { SlideData } from "../types";

/* ─────────────────────────────────────────────
   Data: 3 slides tương ứng 3 tính năng chính
   ───────────────────────────────────────────── */
export const SLIDES: SlideData[] = [
  {
    id: 0,
    title: "NHẬN DIỆN",
    subtitle: "AI Phân tích tức thì",
    desc: "Đưa camera lên và để trí tuệ nhân tạo nhận diện hàng ngàn loài động thực vật hoang dã trong tích tắc. Một phép màu công nghệ trong tay bạn.",
    cta: "Thử Tra Cứu Ngay",
    accentColor: "#34d399",
    stat: { value: 12847, label: "loài đã được nhận diện" },
  },
  {
    id: 1,
    title: "PHÂN BỐ",
    subtitle: "Bản đồ sinh thái",
    desc: "Hành trình theo dấu những loài quý hiếm. Bản đồ tương tác mở ra cánh cửa dẫn đến môi trường sống tự nhiên sâu thẳm nhất Việt Nam.",
    cta: "Khám Phá Bản Đồ",
    accentColor: "#2dd4bf",
    stat: { value: 63, label: "tỉnh thành đã khảo sát" },
  },
  {
    id: 2,
    title: "KẾT NỐI",
    subtitle: "Cộng đồng & Học tập",
    desc: "Không chỉ là thu thập dữ liệu, hãy biến mỗi chuyến đi thành một huy hiệu bảo tồn. Tham gia các thử thách sinh tồn và đua top cộng đồng.",
    cta: "Bắt Đầu Hành Trình",
    accentColor: "#22d3ee",
    stat: { value: 5231, label: "nhà thám hiểm đang hoạt động" },
  },
];

/* Overlay blink animation variant */
export const overlayVariants = {
  flash: { opacity: [0.4, 0.75, 0.4] },
};
