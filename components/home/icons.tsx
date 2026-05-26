import type { IconType } from "react-icons";
import {
  FaAndroid,
  FaApple,
  FaCalculator,
  FaChartLine,
  FaCheckCircle,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaCircle,
  FaClipboardList,
  FaClock,
  FaCode,
  FaCog,
  FaCreditCard,
  FaDesktop,
  FaDollarSign,
  FaDotCircle,
  FaDraftingCompass,
  FaEdit,
  FaFacebookF,
  FaFileInvoiceDollar,
  FaGavel,
  FaGraduationCap,
  FaHandHoldingUsd,
  FaHeadset,
  FaIdCard,
  FaLinkedinIn,
  FaMoneyCheckAlt,
  FaPalette,
  FaPenNib,
  FaSearch,
  FaShieldAlt,
  FaSignInAlt,
  FaThumbsUp,
  FaTools,
  FaTwitter,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";
import type {
  CategoryIconKey,
  StatIconKey,
  StepIconKey,
  WhyIconKey,
} from "./types";

const CATEGORY_ICONS: Record<CategoryIconKey, IconType> = {
  code: FaCode,
  pen: FaPenNib,
  palette: FaPalette,
  cog: FaCog,
  chart: FaChartLine,
  draft: FaDraftingCompass,
  calc: FaCalculator,
  grad: FaGraduationCap,
  gavel: FaGavel,
};

const STAT_ICONS: Record<StatIconKey, IconType> = {
  users: FaUsers,
  invoice: FaFileInvoiceDollar,
  money: FaMoneyCheckAlt,
  thumbs: FaThumbsUp,
};

const WHY_ICONS: Record<WhyIconKey, IconType> = {
  id: FaIdCard,
  shield: FaShieldAlt,
  headset: FaHeadset,
  clock: FaClock,
  dollar: FaDollarSign,
};

const STEP_ICONS: Record<StepIconKey, IconType> = {
  clipboard: FaClipboardList,
  tie: FaUserTie,
  desktop: FaDesktop,
  card: FaCreditCard,
};

export function CategoryIcon({ name, className }: { name: CategoryIconKey; className?: string }) {
  const I = CATEGORY_ICONS[name];
  return <I className={className} aria-hidden />;
}

export function StatIcon({ name, className }: { name: StatIconKey; className?: string }) {
  const I = STAT_ICONS[name];
  return <I className={className} aria-hidden />;
}

export function WhyIcon({ name, className }: { name: WhyIconKey; className?: string }) {
  const I = WHY_ICONS[name];
  return <I className={className} aria-hidden />;
}

export function StepIcon({ name, className }: { name: StepIconKey; className?: string }) {
  const I = STEP_ICONS[name];
  return <I className={className} aria-hidden />;
}

export {
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaSignInAlt,
  FaEdit,
  FaTools,
  FaCheckCircle,
  FaHandHoldingUsd,
  FaCircle,
  FaDotCircle,
  FaFacebookF,
  FaTwitter,
  FaLinkedinIn,
  FaApple,
  FaAndroid,
};
