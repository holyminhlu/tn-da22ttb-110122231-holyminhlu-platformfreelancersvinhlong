export type FreelancerListing = {
  id: string;
  name: string;
  location: string;
  earnings: string;
  rating: string;
  title: string;
  rate: string;
  minProject: string;
  description: string;
  category: string;
  skills: string[];
  services: number;
  portfolio: number;
  logo: string;
  thumbnail: string | null;
  hasVideo?: boolean;
  isWhatsApp?: boolean;
};

export const FREELANCER_LISTINGS: FreelancerListing[] = [
  {
    id: "1",
    name: "On Wave Software Group",
    location: "Charlestown, Saint Paul Charlestown, St. Kitts",
    earnings: "470,233",
    rating: "100",
    title: "Mobile and Web Application Development",
    rate: "$30/hr",
    minProject: "$120",
    description:
      "Outsource your project to us and we will deliver the software you need on budget. Delivering tailored agile software solutions for all your software challenges. With over 20 years experience in develo...",
    category: "Programming & Development",
    skills: [
      "Web Development & Design",
      "Angular",
      "App Development",
      "Back End Development",
      "Communications Technology",
      "Consultant",
    ],
    services: 1,
    portfolio: 2,
    logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop",
  },
  {
    id: "2",
    name: "Suretek Infosoft Pvt. Ltd.",
    location: "Noida, Delhi, India",
    earnings: "411,683",
    rating: "100",
    title: "AI Solutions",
    rate: "$15/hr",
    minProject: "$1,000",
    description:
      "Suretek InfoSoft develops AI-powered systems that transform business operations through automation, insight generation, and predictive intelligence. We design and implement models in machine learning,...",
    category: "Programming & Development",
    skills: [
      "Games (2D / 3D / Mobile)",
      "2D Games",
      "3D Games",
      "Android Game Development",
      "Artificial Intelligence",
      "Augmented Reality Development",
    ],
    services: 42,
    portfolio: 0,
    logo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=200&fit=crop",
  },
  {
    id: "3",
    name: "YanBin Pang",
    location: "Dandong, Liaoning, China",
    earnings: "220,133",
    rating: "100",
    title: "Highly experienced full-stack developer",
    rate: "$50/hr",
    minProject: "$25",
    description:
      "I am a highly experienced and creative full-stack web developer with more than a decade of experience in web development. I have extensive knowledge of commercial and open source software/database eng...",
    category: "Programming & Development",
    skills: ["Angular", "Node.js", "PHP", "Python", "ReactJS"],
    services: 0,
    portfolio: 0,
    logo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    thumbnail: null,
  },
];

export const BROWSE_CATEGORIES = [
  "PROGRAMMING & DEVELOPMENT",
  "DESIGN & ART",
  "WRITING & TRANSLATION",
  "SALES & MARKETING",
  "ADMINISTRATIVE & SECRETARIAL",
  "ENGINEERING & ARCHITECTURE",
  "BUSINESS & FINANCE",
  "LEGAL",
  "EDUCATION & TRAINING",
] as const;

export const TOTAL_FREELANCERS = "1,378,712";
export const TOTAL_SERVICES = "2,051,628";
