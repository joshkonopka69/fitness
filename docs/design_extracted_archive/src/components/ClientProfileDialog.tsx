import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Phone, Calendar, Award, TrendingUp, FileText, Activity } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Client } from "./mockData";

interface ClientProfileDialogProps {
  open: boolean;
  onClose: () => void;
  client: Client | null;
}

export function ClientProfileDialog({ open, onClose, client }: ClientProfileDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!client) return null;

  const getMembershipColor = (type: string) => {
    if (type.includes('Basic')) return 'bg-gray-400';
    if (type.includes('Standard')) return 'bg-blue-500';
    if (type.includes('Premium')) return 'bg-purple-500';
    if (type.includes('Personal')) return 'bg-amber-500';
    return 'bg-primary';
  };

  // Mock attendance history
  const attendanceHistory = [
    { date: '2025-10-23', status: 'present' },
    { date: '2025-10-22', status: 'present' },
    { date: '2025-10-21', status: 'absent' },
    { date: '2025-10-20', status: 'present' },
    { date: '2025-10-19', status: 'present' },
    { date: '2025-10-18', status: 'present' },
    { date: '2025-10-17', status: 'present' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-card border border-border rounded-2xl z-50 max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <span className="text-background text-xl">{client.name.charAt(0)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full w-10 h-10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <h2 className="text-foreground mb-1">{client.name}</h2>
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-2 w-2 rounded-full ${getMembershipColor(client.membershipType)}`} />
                <span className="text-sm text-muted-foreground">{client.membershipType}</span>
              </div>
              <Badge
                className={`
                  ${client.paymentStatus === 'paid' 
                    ? 'bg-primary/20 text-primary border-primary/30' 
                    : client.paymentStatus === 'overdue'
                    ? 'bg-destructive/20 text-destructive border-destructive/30'
                    : 'bg-secondary/20 text-secondary border-secondary/30'
                  }
                `}
              >
                {client.paymentStatus === 'paid' && '● Paid'}
                {client.paymentStatus === 'overdue' && '● Overdue'}
                {client.paymentStatus === 'pending' && '● Pending'}
              </Badge>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-auto">
                <TabsTrigger 
                  value="overview" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="attendance" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6"
                >
                  Attendance
                </TabsTrigger>
                <TabsTrigger 
                  value="notes" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6"
                >
                  Notes
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="overview" className="p-6 mt-0 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{client.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{client.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">
                        Joined {new Date(client.joinDate).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <div className="bg-background rounded-xl p-4 border border-border">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs">Total Sessions</span>
                      </div>
                      <div className="text-2xl text-foreground">{client.totalSessions}</div>
                    </div>
                    <div className="bg-background rounded-xl p-4 border border-border">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs">Attendance</span>
                      </div>
                      <div className="text-2xl text-primary">{client.attendanceRate}%</div>
                    </div>
                  </div>

                  <div className="bg-background rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Monthly Fee</span>
                      <span className="text-foreground">${client.monthlyFee}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Payment</span>
                      <span className="text-foreground">
                        {new Date(client.lastPayment).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="attendance" className="p-6 mt-0">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">This Month</span>
                      <span className="text-foreground">{client.attendanceRate}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${client.attendanceRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm text-muted-foreground mb-3">Recent Activity</h4>
                    {attendanceHistory.map((record, index) => (
                      <motion.div
                        key={record.date}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                      >
                        <span className="text-sm text-foreground">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <Badge
                          className={`
                            ${record.status === 'present'
                              ? 'bg-primary/20 text-primary border-primary/30'
                              : 'bg-muted text-muted-foreground border-border'
                            }
                          `}
                        >
                          {record.status === 'present' ? '✓ Present' : '✗ Absent'}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="p-6 mt-0">
                  <div className="bg-background rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-3">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">Training Notes</span>
                    </div>
                    <p className="text-foreground">{client.notes}</p>
                  </div>

                  <Button className="w-full mt-4 bg-background border border-border text-foreground hover:bg-muted">
                    Add Note
                  </Button>
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
