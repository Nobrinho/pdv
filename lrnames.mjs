import * as L from "lucide-react";
const want = ["LayoutDashboard","ShoppingCart","Package","Wrench","Receipt","FileText","Users","HandCoins","LineChart","Wallet","UsersRound","History","Settings","Store","ChevronLeft","Power","Lock","Menu","Moon","Sun","HelpCircle","CircleHelp"];
for (const n of want) console.log(n.padEnd(16), typeof L[n] !== "undefined" ? "OK" : "FALTA");
