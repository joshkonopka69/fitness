import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";
import type { Tab } from "../App";

interface BottomNavProps {
  tabs: Array<{ id: Tab; label: string; icon: LucideIcon }>;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomNav({ tabs, activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-md mx-auto flex justify-around items-center h-20 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center gap-1 min-w-[60px] min-h-[60px] relative"
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  color: isActive ? "#00FF88" : "#A0A0A0",
                }}
                transition={{ duration: 0.15 }}
              >
                <Icon className="w-6 h-6" />
              </motion.div>
              <motion.span
                className="text-xs"
                animate={{
                  color: isActive ? "#00FF88" : "#A0A0A0",
                }}
                transition={{ duration: 0.15 }}
              >
                {tab.label}
              </motion.span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
