import { useState } from "react";
import { CalendarView } from "./components/CalendarView";
import { ClientsList } from "./components/ClientsList";
import { StatsView } from "./components/StatsView";
import { PaymentsView } from "./components/PaymentsView";
import { ProfileView } from "./components/ProfileView";
import { BottomNav } from "./components/BottomNav";
import { CalendarDays, Users, BarChart3, DollarSign, UserCircle } from "lucide-react";

export type Tab = "calendar" | "clients" | "stats" | "payments" | "profile";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("calendar");

  const tabs = [
    { id: "calendar" as Tab, label: "Calendar", icon: CalendarDays },
    { id: "clients" as Tab, label: "Clients", icon: Users },
    { id: "stats" as Tab, label: "Stats", icon: BarChart3 },
    { id: "payments" as Tab, label: "Payments", icon: DollarSign },
    { id: "profile" as Tab, label: "Profile", icon: UserCircle },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto">
        {activeTab === "calendar" && <CalendarView />}
        {activeTab === "clients" && <ClientsList />}
        {activeTab === "stats" && <StatsView />}
        {activeTab === "payments" && <PaymentsView />}
        {activeTab === "profile" && <ProfileView />}
      </div>
      <BottomNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
