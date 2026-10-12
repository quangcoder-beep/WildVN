import { IMAGES } from "@/app/_shared/constants/assets";

export type ConservationStatus = 'Cực kỳ nguy cấp' | 'Nguy cấp' | 'Sắp bị đe dọa' | 'Ít quan tâm';

export type Species = {
  id: string;
  name: string;
  scientificName: string;
  habitat: string;
  status: ConservationStatus;
  description: string;
  image: string;
  population: string;
  diet: string;
};

export const SPECIES_LIST: Species[] = [
  {
    id: "vooc-mui-hech",
    name: "Voọc Mũi Hếch",
    scientificName: "Rhinopithecus avunculus",
    habitat: "Hà Giang, Tuyên Quang (Đông Bắc)",
    status: "Cực kỳ nguy cấp",
    description: "Một trong 25 loài linh trưởng bị đe dọa nhất toàn cầu, đặc hữu của Việt Nam. Điểm đặc trưng là chiếc mũi hếch lên, môi dày và vành mắt xanh nhạt.",
    image: IMAGES.shared.start, 
    population: "~250 cá thể",
    diet: "Lá cây non, quả, hạt"
  },
  {
    id: "sao-la",
    name: "Sao La",
    scientificName: "Pseudoryx nghetinhensis",
    habitat: "Dãy Trường Sơn (Miền Trung)",
    status: "Cực kỳ nguy cấp",
    description: "Được mệnh danh là 'Kỳ lân Châu Á', Sao La sở hữu cặp sừng dài, suôn thẳng ấn tượng. Đây là một trong những loài thú hiếm nhất trên thế giới được phát hiện.",
    image: IMAGES.shared.end, 
    population: "Vô cùng hiếm (<50)",
    diet: "Lá cây dương xỉ, thực vật mềm"
  },
  {
    id: "bo-tot",
    name: "Bò Tót Đông Dương",
    scientificName: "Bos gaurus",
    habitat: "Tây Nguyên, Đông Nam Bộ",
    status: "Sắp bị đe dọa",
    description: "Loài bò rừng lớn nhất thế giới với cặp sừng dũng mãnh và bộ lông đen bóng. Chúng đóng vai trò quan trọng trong việc duy trì thảm thực vật rừng.",
    image: IMAGES.shared.start, 
    population: "~300 cá thể",
    diet: "Cỏ, măng tre, cành lá"
  }
];
