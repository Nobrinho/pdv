import React from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wrench,
  Receipt,
  FileText,
  Users,
  UsersRound,
  HandCoins,
  LineChart,
  Wallet,
  History,
  Settings,
  Store,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  Power,
  Lock,
  Menu,
  Moon,
  Sun,
  Plus,
  Minus,
  Trash2,
  Search,
  Check,
  X,
  MoreHorizontal,
  Printer,
  Share2,
  Camera,
  Pencil,
  Save,
  FileDown,
  Image,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PackageX,
  ArrowRight,
  Truck,
  CircleCheck,
  CircleHelp,
} from "lucide-react";

/**
 * Icon — wrapper do design system sobre o Lucide.
 *
 * Usa **imports explícitos** (tree-shaking) num registro kebab-case, exatamente
 * como o handoff nomeia os ícones (`layout-dashboard`, `shopping-cart`,
 * `chevrons-up-down`, `trash-2`…). Para adicionar um ícone novo: importe-o acima
 * e registre no mapa abaixo.
 *
 * A cor sai do `currentColor` — aplique `text-[var(--primary)]` (ou classe de
 * cor) no próprio Icon ou num ancestral.
 */
const REGISTRY = {
  "layout-dashboard": LayoutDashboard,
  "shopping-cart": ShoppingCart,
  package: Package,
  wrench: Wrench,
  receipt: Receipt,
  "file-text": FileText,
  users: Users,
  "users-round": UsersRound,
  "hand-coins": HandCoins,
  "line-chart": LineChart,
  wallet: Wallet,
  history: History,
  settings: Settings,
  store: Store,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "chevron-down": ChevronDown,
  "chevrons-up-down": ChevronsUpDown,
  power: Power,
  lock: Lock,
  menu: Menu,
  moon: Moon,
  sun: Sun,
  plus: Plus,
  minus: Minus,
  "trash-2": Trash2,
  search: Search,
  check: Check,
  x: X,
  "more-horizontal": MoreHorizontal,
  printer: Printer,
  "share-2": Share2,
  camera: Camera,
  pencil: Pencil,
  save: Save,
  "file-down": FileDown,
  image: Image,
  "refresh-cw": RefreshCw,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "alert-triangle": AlertTriangle,
  "package-x": PackageX,
  "arrow-right": ArrowRight,
  truck: Truck,
  "circle-check": CircleCheck,
};

export function Icon({ name, size = 20, strokeWidth = 2, className = "", ...props }) {
  const Cmp = REGISTRY[name] || CircleHelp;
  return (
    <Cmp
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    />
  );
}

export default Icon;
