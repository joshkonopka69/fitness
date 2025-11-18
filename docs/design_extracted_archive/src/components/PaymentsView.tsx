import { motion } from "motion/react";
import { DollarSign, AlertCircle, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { mockClients } from "./mockData";

export function PaymentsView() {
  const paidClients = mockClients.filter(c => c.paymentStatus === 'paid');
  const overdueClients = mockClients.filter(c => c.paymentStatus === 'overdue');
  const pendingClients = mockClients.filter(c => c.paymentStatus === 'pending');

  const totalRevenue = paidClients.reduce((sum, c) => sum + c.monthlyFee, 0);
  const pendingAmount = pendingClients.reduce((sum, c) => sum + c.monthlyFee, 0);
  const overdueAmount = overdueClients.reduce((sum, c) => sum + c.monthlyFee, 0);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-foreground mb-1">Payments</h1>
        <p className="text-muted-foreground">Manage member payments</p>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="text-xl text-foreground mb-1">${totalRevenue}</div>
              <div className="text-xs text-muted-foreground">Collected</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-secondary" />
              </div>
              <div className="text-xl text-foreground mb-1">${pendingAmount}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div className="text-xl text-foreground mb-1">${overdueAmount}</div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Overdue Payments */}
      {overdueClients.length > 0 && (
        <div className="mb-6">
          <h3 className="text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Overdue Payments
          </h3>
          <div className="space-y-3">
            {overdueClients.map((client, index) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl p-4 border border-destructive/30"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center flex-shrink-0">
                    <span className="text-white">{client.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-foreground">{client.name}</h4>
                      <span className="text-destructive">${client.monthlyFee}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Last payment: {new Date(client.lastPayment).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-9"
                      >
                        Send Reminder
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 border-border h-9"
                      >
                        Mark as Paid
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Payments */}
      {pendingClients.length > 0 && (
        <div className="mb-6">
          <h3 className="text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-secondary" />
            Pending Payments
          </h3>
          <div className="space-y-3">
            {pendingClients.map((client, index) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl p-4 border border-secondary/30"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center flex-shrink-0">
                    <span className="text-white">{client.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-foreground">{client.name}</h4>
                      <span className="text-secondary">${client.monthlyFee}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Due date: {new Date(client.lastPayment).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <Button 
                      className="w-full bg-secondary hover:bg-secondary/90 text-white h-9"
                    >
                      Mark as Paid
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Payments */}
      <div>
        <h3 className="text-foreground mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          Recent Payments
        </h3>
        <div className="space-y-3">
          {paidClients.slice(0, 5).map((client, index) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                  <span className="text-background text-sm">{client.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-foreground text-sm mb-0.5">{client.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {new Date(client.lastPayment).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-primary">${client.monthlyFee}</span>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                    ● Paid
                  </Badge>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Monthly Insights */}
      <Card className="bg-card border-border mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Expected</span>
              <span className="text-foreground">${totalRevenue + pendingAmount + overdueAmount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Collected</span>
              <span className="text-primary">${totalRevenue}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Collection Rate</span>
              <span className="text-foreground">
                {Math.round((totalRevenue / (totalRevenue + pendingAmount + overdueAmount)) * 100)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
