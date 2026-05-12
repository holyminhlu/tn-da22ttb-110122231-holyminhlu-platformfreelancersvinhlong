export type QuickCategory = {
  id: string;
  label: string;
};

export const QUICK_CATEGORIES: QuickCategory[] = [
  { id: "repair", label: "Sửa chữa" },
  { id: "tutor", label: "Gia sư" },
  { id: "clean", label: "Vệ sinh" },
  { id: "photo", label: "Chụp ảnh" },
  { id: "it", label: "IT & máy tính" },
  { id: "design", label: "Thiết kế" },
  { id: "transport", label: "Vận chuyển" },
  { id: "beauty", label: "Làm đẹp" },
  { id: "event", label: "Sự kiện" },
];

export const DISTRICT_OPTIONS = [
  { value: "", label: "Toàn tỉnh Vĩnh Long" },
  { value: "tp-vinh-long", label: "TP. Vĩnh Long" },
  { value: "long-ho", label: "Long Hồ" },
  { value: "mang-thit", label: "Mang Thít" },
  { value: "vung-liem", label: "Vũng Liêm" },
  { value: "tam-binh", label: "Tam Bình" },
  { value: "tra-on", label: "Trà Ôn" },
  { value: "binh-minh", label: "Bình Minh" },
  { value: "binh-tan", label: "Bình Tân" },
] as const;

export type FeaturedFreelancer = {
  id: string;
  name: string;
  title: string;
  rating: number;
  reviewCount: number;
  initials: string;
  accent: "navy" | "green";
};

export const FEATURED_FREELANCERS: FeaturedFreelancer[] = [
  {
    id: "1",
    name: "Phạm Minh Tuấn",
    title: "Điện lạnh & sửa chữa tại nhà",
    rating: 4.9,
    reviewCount: 32,
    initials: "PT",
    accent: "navy",
  },
  {
    id: "2",
    name: "Trần Thị Mai",
    title: "Gia sư Tiếng Anh — THPT",
    rating: 5.0,
    reviewCount: 18,
    initials: "TM",
    accent: "green",
  },
  {
    id: "3",
    name: "Lê Hoàng Nam",
    title: "Quay — chụp sự kiện & profile",
    rating: 4.8,
    reviewCount: 41,
    initials: "LN",
    accent: "green",
  },
  {
    id: "4",
    name: "Nguyễn Thu Hà",
    title: "Dọn vệ sinh công nghiệp",
    rating: 4.95,
    reviewCount: 27,
    initials: "NH",
    accent: "navy",
  },
];
