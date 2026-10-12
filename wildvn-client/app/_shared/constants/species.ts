export type ConservationStatus =
  | "LC"
  | "NT"
  | "VU"
  | "EN"
  | "CR"
  | "EW"
  | "EX"
  | "NE";

export const CONSERVATION_LABELS: Record<
  string,
  { label: string; color: string; description: string }
> = {
  "LC": {
    label: "Ít quan tâm",
    color: "#10B981",
    description: "Quần thể ổn định, không có nguy cơ tuyệt chủng hiện tại.",
  },
  "NT": {
    label: "Sắp bị đe dọa",
    color: "#FBBF24",
    description: "Có thể bị đe dọa tuyệt chủng trong tương lai gần.",
  },
  "VU": {
    label: "Sắp nguy cấp",
    color: "#F59E0B",
    description: "Nguy cơ tuyệt chủng cao trong tự nhiên nếu không được bảo vệ.",
  },
  "EN": {
    label: "Nguy cấp",
    color: "#EA580C",
    description: "Nguy cơ tuyệt chủng rất cao trong tự nhiên.",
  },
  "CR": {
    label: "Cực kỳ nguy cấp",
    color: "#DC2626",
    description: "Nguy cơ tuyệt chủng vô cùng cao, đang suy giảm nghiêm trọng.",
  },
  "EW": {
    label: "Tuyệt chủng trong tự nhiên",
    color: "#9333EA",
    description: "Chỉ còn tồn tại trong môi trường nuôi nhốt hoặc khu bảo tồn nhân tạo.",
  },
  "EX": {
    label: "Tuyệt chủng",
    color: "#111827",
    description: "Không còn cá thể nào tồn tại trên thế giới.",
  },
  "NE": {
    label: "Chưa đánh giá",
    color: "#9CA3AF",
    description: "Chưa được đánh giá theo các tiêu chí của Sách Đỏ.",
  },
};

export const DIET_LABELS: Record<string, string> = {
  CARNIVORE: 'Ăn thịt',
  HERBIVORE: 'Ăn thực vật',
  OMNIVORE: 'Ăn tạp',
  INSECTIVORE: 'Ăn côn trùng',
  AUTOTROPH: 'Tự dưỡng'
};

export const HABITAT_LABELS: Record<string, string> = {
  TERRESTRIAL: 'Trên cạn',
  FRESHWATER: 'Nước ngọt',
  MARINE: 'Nước mặn',
  CANOPY: 'Trên tán cây'
};

export const ACTIVITY_LABELS: Record<string, string> = {
  DIURNAL: 'Ban ngày',
  NOCTURNAL: 'Ban đêm',
  CREPUSCULAR: 'Chạng vạng'
};

export const DECREE_LABELS: Record<string, string> = {
  GROUP_IA: 'Nhóm IA',
  GROUP_IB: 'Nhóm IB',
  GROUP_IIA: 'Nhóm IIA',
  GROUP_IIB: 'Nhóm IIB',
  NONE: 'Không'
};
