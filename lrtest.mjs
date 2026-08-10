import * as L from "lucide-react";
console.log("tem export 'icons'?", typeof L.icons, L.icons ? "chaves:"+Object.keys(L.icons).length : "");
if (L.icons) console.log("amostra chaves:", Object.keys(L.icons).slice(0,6));
console.log("LayoutDashboard direto?", typeof L.LayoutDashboard);
console.log("HelpCircle?", typeof L.HelpCircle, "| CircleHelp?", typeof L.CircleHelp);
if (L.icons) console.log("icons.LayoutDashboard?", typeof L.icons.LayoutDashboard, "| icons['layout-dashboard']?", typeof L.icons["layout-dashboard"]);
