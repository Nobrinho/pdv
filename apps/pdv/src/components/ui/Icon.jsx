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
  Inbox,
  ClipboardList,
  Tag,
  Tags,
  PackageOpen,
  Eye,
  Ban,
  Phone,
  IdCard,
  MapPin,
  Percent,
  DollarSign,
  Warehouse,
  Key,
  User,
  ArrowRightLeft,
  Copy,
  Sparkles,
  Shield,
  UserCircle,
  Settings2,
  Layers,
  Recycle,
  Upload,
  Download,
  FolderOpen,
  BookOpen,
  FileSpreadsheet,
  PaintRoller,
  Palette,
  RotateCw,
  Link as LinkIcon,
  CloudUpload,
  Database,
  Gift,
  CameraOff,
  Info,
  HardDrive,
  Cloud,
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
  inbox: Inbox,
  "clipboard-list": ClipboardList,
  tag: Tag,
  tags: Tags,
  "package-open": PackageOpen,
  eye: Eye,
  ban: Ban,
  phone: Phone,
  "id-card": IdCard,
  "map-pin": MapPin,
  percent: Percent,
  "dollar-sign": DollarSign,
  warehouse: Warehouse,
  key: Key,
  user: User,
  "arrow-right-left": ArrowRightLeft,
  copy: Copy,
  sparkles: Sparkles,
  shield: Shield,
  "user-circle": UserCircle,
  gear: Settings2,
  layers: Layers,
  recycle: Recycle,
  upload: Upload,
  download: Download,
  "folder-open": FolderOpen,
  "book-open": BookOpen,
  "file-spreadsheet": FileSpreadsheet,
  "paint-roller": PaintRoller,
  palette: Palette,
  "rotate-cw": RotateCw,
  link: LinkIcon,
  "cloud-upload": CloudUpload,
  database: Database,
  gift: Gift,
  "camera-off": CameraOff,
  info: Info,
  "hard-drive": HardDrive,
  cloud: Cloud,
  "circle-help": CircleHelp,
};

// Nomes FontAwesome legados → Lucide (para Button/FormField que recebem `fa-...`).
const FA_TO_LUCIDE = {
  "fa-plus": "plus", "fa-plus-circle": "plus", "fa-minus": "minus",
  "fa-check": "check", "fa-check-double": "check", "fa-check-circle": "circle-check",
  "fa-times": "x", "fa-xmark": "x", "fa-trash": "trash-2", "fa-trash-alt": "trash-2",
  "fa-edit": "pencil", "fa-pen": "pencil", "fa-save": "save", "fa-search": "search",
  "fa-print": "printer", "fa-eye": "eye", "fa-ban": "ban",
  "fa-phone": "phone", "fa-phone-alt": "phone", "fa-id-card": "id-card",
  "fa-map-marker-alt": "map-pin", "fa-map": "map-pin", "fa-percent": "percent",
  "fa-tag": "tag", "fa-tags": "tags", "fa-dollar-sign": "dollar-sign",
  "fa-hand-holding-dollar": "hand-coins", "fa-hand-holding-usd": "hand-coins",
  "fa-warehouse": "warehouse", "fa-key": "key", "fa-user": "user",
  "fa-user-plus": "user", "fa-user-tie": "user", "fa-user-tag": "user",
  "fa-user-friends": "users-round", "fa-users": "users", "fa-store": "store",
  "fa-file-pdf": "file-text", "fa-file-alt": "file-text", "fa-file-invoice-dollar": "receipt",
  "fa-file-import": "file-down", "fa-wrench": "wrench", "fa-box-open": "package",
  "fa-box": "package", "fa-receipt": "receipt", "fa-clipboard-list": "clipboard-list",
  "fa-sliders": "settings", "fa-cog": "settings", "fa-circle-notch": "refresh-cw",
  "fa-sync-alt": "refresh-cw", "fa-rotate": "refresh-cw", "fa-arrow-right": "arrow-right",
  "fa-history": "history",
};

/** Converte um nome FontAwesome (`fa-...`) para o Lucide equivalente. */
export function faToLucide(name) {
  if (!name) return "circle-help";
  if (name.startsWith("fa-")) return FA_TO_LUCIDE[name] || "circle-help";
  return name;
}

// Ícone de marca (WhatsApp) — não existe no Lucide; SVG inline, herda currentColor.
function WhatsappGlyph({ size = 20, className = "", ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function Icon({ name, size = 20, strokeWidth = 2, className = "", ...props }) {
  if (name === "whatsapp") return <WhatsappGlyph size={size} className={className} {...props} />;
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
