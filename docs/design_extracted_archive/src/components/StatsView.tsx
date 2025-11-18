import { motion } from "motion/react";
import { BarChart3, TrendingUp, Users, Calendar, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { mockClients, mockSessions } from "./mockData";

export function StatsView() {
  const totalClients = mockClients.length;
  const activeClients = mockClients.filter(c => c.paymentStatus === 'paid').length;
  const averageAttendance = Math.round(
    mockClients.reduce((sum, c) => sum + c.attendanceRate, 0) / mockClients.length
  );
  const monthlyRevenue = mockClients
    .filter(c => c.paymentStatus === 'paid')
    .reduce((sum, c) => sum + c.monthlyFee, 0);

  const stats = [
    {
      title: "Total Clients",
      value: totalClients,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Active Members",
      value: activeClients,
      icon: TrendingUp,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Avg Attendance",
      value: `${averageAttendance}%`,
      icon: BarChart3,
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
    },
    {
      title: "Monthly Revenue",
      value: `$${monthlyRevenue}`,
      icon: Award,
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
    },
  ];

  const weeklyData = [
    { day: "Mon", sessions: 3, attendance: 24 },
    { day: "Tue", sessions: 2, attendance: 18 },
    { day: "Wed", sessions: 3, attendance: 27 },
    { day: "Thu", sessions: 2, attendance: 20 },
    { day: "Fri", sessions: 3, attendance: 25 },
    { day: "Sat", sessions: 2, attendance: 22 },
    { day: "Sun", sessions: 1, attendance: 15 },
  ];

  const membershipDistribution = [
    { type: "Basic", count: mockClients.filter(c => c.membershipType.includes('Basic')).length, color: "bg-gray-400" },
    { type: "Standard", count: mockClients.filter(c => c.membershipType.includes('Standard')).length, color: "bg-blue-500" },
    { type: "Premium", count: mockClients.filter(c => c.membershipType.includes('Premium')).length, color: "bg-purple-500" },
    { type: "Personal Training", count: mockClients.filter(c => c.membershipType.includes('Personal')).length, color: "bg-amber-500" },
  ];

  const maxAttendance = Math.max(...weeklyData.map(d => d.attendance));

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-foreground mb-1">Statistics</h1>
        <p className="text-muted-foreground">Track your gym's performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="text-2xl text-foreground mb-1">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.title}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Weekly Attendance */}
      <Card className="bg-card border-border mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {weeklyData.map((day, index) => (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="w-12 text-sm text-muted-foreground">{day.day}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(day.attendance / maxAttendance) * 100}%` }}
                        transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-primary to-secondary"
                      />
                    </div>
                    <div className="w-8 text-sm text-foreground">{day.attendance}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Membership Distribution */}
      <Card className="bg-card border-border mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Membership Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {membershipDistribution.map((membership, index) => (
              <motion.div
                key={membership.type}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className={`w-4 h-4 rounded-full ${membership.color} border-2 border-card`} />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-foreground">{membership.type}</span>
                  <span className="text-sm text-muted-foreground">{membership.count} members</span>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Members</span>
              <span className="text-foreground">{totalClients}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Quick Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm text-foreground mb-1">Attendance is up 12% this week</p>
              <p className="text-xs text-muted-foreground">Keep up the great work!</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-secondary/10 rounded-lg border border-secondary/20">
            <Users className="w-5 h-5 text-secondary mt-0.5" />
            <div>
              <p className="text-sm text-foreground mb-1">3 new members this month</p>
              <p className="text-xs text-muted-foreground">Growth is looking strong</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
