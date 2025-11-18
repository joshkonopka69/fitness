import { motion } from "motion/react";
import { User, Bell, Shield, HelpCircle, LogOut, ChevronRight, Moon } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Switch } from "./ui/switch";

export function ProfileView() {
  const coach = {
    name: "Coach Mike Thompson",
    email: "mike@traintrack.app",
    gym: "Elite Fitness Studio",
    since: "2022"
  };

  const menuItems = [
    {
      icon: User,
      label: "Edit Profile",
      description: "Update your personal information",
    },
    {
      icon: Bell,
      label: "Notifications",
      description: "Manage notification preferences",
    },
    {
      icon: Shield,
      label: "Privacy & Security",
      description: "Control your privacy settings",
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      description: "Get help and contact support",
    },
  ];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-foreground mb-1">Profile</h1>
        <p className="text-muted-foreground">Manage your account</p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl p-6 border border-border mb-6"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl">
            <span className="text-background">MT</span>
          </div>
          <div className="flex-1">
            <h2 className="text-foreground mb-1">{coach.name}</h2>
            <p className="text-sm text-muted-foreground mb-2">{coach.email}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{coach.gym}</span>
              <span>•</span>
              <span>Since {coach.since}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-6 border-t border-border">
          <div>
            <div className="text-2xl text-foreground mb-1">48</div>
            <div className="text-xs text-muted-foreground">Sessions</div>
          </div>
          <div>
            <div className="text-2xl text-primary mb-1">127</div>
            <div className="text-xs text-muted-foreground">Students</div>
          </div>
          <div>
            <div className="text-2xl text-secondary mb-1">94%</div>
            <div className="text-xs text-muted-foreground">Avg Rate</div>
          </div>
        </div>
      </motion.div>

      {/* Quick Settings */}
      <Card className="bg-card border-border mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Moon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-foreground">Dark Mode</div>
                <div className="text-xs text-muted-foreground">Always enabled</div>
              </div>
            </div>
            <Switch checked disabled />
          </div>
        </CardContent>
      </Card>

      {/* Menu Items */}
      <div className="space-y-2 mb-6">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="w-full bg-card rounded-xl p-4 border border-border hover:border-primary/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground mb-0.5">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Logout */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full bg-destructive/10 rounded-xl p-4 border border-destructive/30 hover:bg-destructive/20 transition-colors"
      >
        <div className="flex items-center justify-center gap-2">
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="text-destructive">Log Out</span>
        </div>
      </motion.button>

      {/* App Info */}
      <div className="text-center mt-8 text-xs text-muted-foreground">
        <p>TrainTrack v1.0.0</p>
        <p className="mt-1">Made for coaches, by coaches</p>
      </div>
    </div>
  );
}
