import { Home, Gift, ListTodo, Users, Wallet, Shield } from "lucide-react";
import { useUser } from "@/context/UserContext";

interface NavItem {
  icon: React.ElementType;
  label: string;
  tab: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", tab: "home" },
  { icon: Gift, label: "Earn", tab: "earn" },
  { icon: ListTodo, label: "Tasks", tab: "tasks" },
  { icon: Users, label: "Friends", tab: "referrals" },
  { icon: Wallet, label: "Wallet", tab: "withdraw" },
];

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { isAdmin } = useUser();

  const allItems = isAdmin
    ? [...navItems, { icon: Shield, label: "Admin", tab: "admin" }]
    : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border z-50">
      <div className="flex items-center justify-around py-2 px-1 max-w-lg mx-auto">
        {allItems.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => onTabChange(item.tab)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? "text-primary scale-105"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_6px_hsl(43_96%_56%/0.5)]" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
