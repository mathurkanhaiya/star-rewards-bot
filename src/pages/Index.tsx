import { useState } from "react";
import { UserProvider } from "@/context/UserContext";
import BottomNav from "@/components/BottomNav";
import HomeTab from "@/components/tabs/HomeTab";
import EarnTab from "@/components/tabs/EarnTab";
import TasksTab from "@/components/tabs/TasksTab";
import ReferralsTab from "@/components/tabs/ReferralsTab";
import WithdrawTab from "@/components/tabs/WithdrawTab";
import AdminTab from "@/components/tabs/AdminTab";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <UserProvider>
      <div className="min-h-screen bg-background gradient-hero pb-20 max-w-lg mx-auto">
        {/* Header */}
        <header className="px-4 pt-4 pb-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
            <span className="text-sm font-black text-primary-foreground">T</span>
          </div>
          <h1 className="font-bold text-sm">TonxStar Rewards</h1>
        </header>

        {/* Content */}
        <main>
          {activeTab === "home" && <HomeTab />}
          {activeTab === "earn" && <EarnTab />}
          {activeTab === "tasks" && <TasksTab />}
          {activeTab === "referrals" && <ReferralsTab />}
          {activeTab === "withdraw" && <WithdrawTab />}
          {activeTab === "admin" && <AdminTab />}
        </main>

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </UserProvider>
  );
};

export default Index;
