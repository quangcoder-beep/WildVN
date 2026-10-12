// =======================================================================================
// WILDVN - SEARCH PAGE DATA
// Dữ liệu tĩnh cho 5 section scroll storytelling
// =======================================================================================

import type { ConservationStatus } from "../constants/species";

export interface ShowcaseAnimal {
  id: string;
  nameVn: string;
  scientificName: string;
  status: ConservationStatus;
  emoji: string;
  description: string;
  habitat: string;
  population: string;
  accentColor: string;
}

export const SHOWCASE_ANIMALS: ShowcaseAnimal[] = [
  {
    id: "sao-la",
    nameVn: "Sao La",
    scientificName: "Pseudoryx nghetinhensis",
    status: "CR",
    emoji: "🦌",
    description:
      "Được phát hiện năm 1992, Sao La là một trong những phát hiện động vật lớn nhất thế kỷ 20. Loài thú móng guốc bí ẩn này chỉ sống ở dãy Trường Sơn.",
    habitat: "Rừng thường xanh ẩm, dãy Trường Sơn",
    population: "Ước tính < 100 cá thể",
    accentColor: "#2DD4A8",
  },
  {
    id: "ho-dong-duong",
    nameVn: "Hổ Đông Dương",
    scientificName: "Panthera tigris corbetti",
    status: "EN",
    emoji: "🐅",
    description:
      "Chúa sơn lâm của rừng Việt Nam. Từng phân bố rộng khắp Đông Nam Á, nay ước tính còn dưới 5 cá thể trong tự nhiên tại Việt Nam.",
    habitat: "Rừng nhiệt đới và cận nhiệt đới",
    population: "< 5 cá thể tại VN",
    accentColor: "#F59E0B",
  },
  {
    id: "vooc-cha-va",
    nameVn: "Voọc chà vá chân nâu",
    scientificName: "Pygathrix nemaeus",
    status: "EN",
    emoji: "🐒",
    description:
      "Được mệnh danh là 'Nữ hoàng linh trưởng' nhờ bộ lông ngũ sắc rực rỡ nhất trong thế giới linh trưởng. Loài đặc hữu của bán đảo Đông Dương.",
    habitat: "Rừng mưa nhiệt đới nguyên sinh",
    population: "~1.000 cá thể",
    accentColor: "#F97316",
  },
  {
    id: "rua-hoan-kiem",
    nameVn: "Rùa Hoàn Kiếm",
    scientificName: "Rafetus swinhoei",
    status: "CR",
    emoji: "🐢",
    description:
      "Loài rùa mai mềm lớn nhất thế giới và cũng là loài bò sát nguy cấp nhất hành tinh. Chỉ còn 1 cá thể được xác nhận trên toàn cầu.",
    habitat: "Hồ nước ngọt, đầm lầy",
    population: "1 cá thể còn sống",
    accentColor: "#3B82F6",
  },
  {
    id: "vuon-cao-vit",
    nameVn: "Vượn cao vít",
    scientificName: "Nomascus nasutus",
    status: "CR",
    emoji: "🦧",
    description:
      "Một trong những loài linh trưởng hiếm nhất thế giới. Tiếng hót vang vọng của chúng có thể nghe thấy từ khoảng cách 2km trong rừng.",
    habitat: "Rừng mưa trên núi đá vôi",
    population: "~130 cá thể",
    accentColor: "#A855F7",
  },
];

export interface AnimalCategory {
  name: string;
  emoji: string;
  count: number;
  slug: string;
  gradient: string;
}

export const CATEGORIES: AnimalCategory[] = [
  { name: "Thú", emoji: "🐅", count: 310, slug: "thu", gradient: "linear-gradient(135deg, #F59E0B20, #F59E0B08)" },
  { name: "Chim", emoji: "🦅", count: 867, slug: "chim", gradient: "linear-gradient(135deg, #3B82F620, #3B82F608)" },
  { name: "Bò sát", emoji: "🐊", count: 296, slug: "bo-sat", gradient: "linear-gradient(135deg, #22C55E20, #22C55E08)" },
  { name: "Lưỡng cư", emoji: "🐸", count: 176, slug: "luong-cu", gradient: "linear-gradient(135deg, #A855F720, #A855F708)" },
  { name: "Cá", emoji: "🐟", count: 2738, slug: "ca", gradient: "linear-gradient(135deg, #06B6D420, #06B6D408)" },
  { name: "Côn trùng", emoji: "🦋", count: 7000, slug: "con-trung", gradient: "linear-gradient(135deg, #EC489920, #EC489908)" },
];

export const STATS = [
  { value: 310, label: "loài ghi nhận", suffix: "+" },
  { value: 63, label: "tỉnh thành", suffix: "" },
  { value: 16, label: "vườn quốc gia", suffix: "" },
  { value: 5, label: "loài CR cực kỳ nguy cấp", suffix: "" },
];
