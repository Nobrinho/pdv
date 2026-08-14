import React from "react";
import {
  ShieldCheck,
  LogIn,
  LogOut,
  Loader2,
  Eye,
  LockOpen,
  Ban,
  X,
  Users,
  UsersRound,
  KeyRound,
  UserX,
  UserCheck,
  Monitor,
  Check,
  Trash2,
  Store,
  LineChart,
  ReceiptText,
  Gavel,
  CloudUpload,
  RefreshCw,
  Search,
  Banknote,
  CircleHelp,
} from "lucide-react";

/**
 * Icon — wrapper lucide para o painel Admin (mesmo espírito do Icon do app pdv).
 * Registro kebab-case; a cor sai de `currentColor`.
 */
const REGISTRY = {
  "shield-check": ShieldCheck,
  "log-in": LogIn,
  "log-out": LogOut,
  loader: Loader2,
  eye: Eye,
  "lock-open": LockOpen,
  ban: Ban,
  x: X,
  users: Users,
  "users-round": UsersRound,
  key: KeyRound,
  "user-x": UserX,
  "user-check": UserCheck,
  monitor: Monitor,
  check: Check,
  "trash-2": Trash2,
  store: Store,
  "line-chart": LineChart,
  "receipt-text": ReceiptText,
  gavel: Gavel,
  "cloud-upload": CloudUpload,
  "refresh-cw": RefreshCw,
  search: Search,
  banknote: Banknote,
};

export function Icon({ name, size = 18, strokeWidth = 2, className = "", ...props }) {
  const Cmp = REGISTRY[name] || CircleHelp;
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" {...props} />;
}

export default Icon;
