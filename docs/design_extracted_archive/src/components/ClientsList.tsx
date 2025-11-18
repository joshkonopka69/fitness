import { useState } from "react";
import { motion } from "motion/react";
import { Plus, Search, Filter, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { AddClientDialog } from "./AddClientDialog";
import { ClientProfileDialog } from "./ClientProfileDialog";
import { mockClients, Client } from "./mockData";

export function ClientsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'overdue' | 'pending'>('all');

  const filteredClients = mockClients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || client.paymentStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getMembershipColor = (type: string) => {
    if (type.includes('Basic')) return 'bg-gray-400';
    if (type.includes('Standard')) return 'bg-blue-500';
    if (type.includes('Premium')) return 'bg-purple-500';
    if (type.includes('Personal')) return 'bg-amber-500';
    return 'bg-primary';
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-foreground mb-1">Clients</h1>
          <p className="text-muted-foreground">{mockClients.length} total members</p>
        </div>
        <Button
          onClick={() => setShowAddClient(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-12 h-12 p-0"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clients..."
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {(['all', 'paid', 'overdue', 'pending'] as const).map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "outline"}
            onClick={() => setFilterStatus(status)}
            className={`whitespace-nowrap ${
              filterStatus === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border-border'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-card rounded-xl p-3 border border-border">
          <div className="text-2xl text-primary mb-1">
            {mockClients.filter(c => c.paymentStatus === 'paid').length}
          </div>
          <div className="text-xs text-muted-foreground">Paid</div>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border">
          <div className="text-2xl text-destructive mb-1">
            {mockClients.filter(c => c.paymentStatus === 'overdue').length}
          </div>
          <div className="text-xs text-muted-foreground">Overdue</div>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border">
          <div className="text-2xl text-secondary mb-1">
            {mockClients.filter(c => c.paymentStatus === 'pending').length}
          </div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-3">
        {filteredClients.map((client, index) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelectedClient(client)}
            className="bg-card rounded-xl p-4 border border-border cursor-pointer hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                <span className="text-background">{client.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-foreground truncate">{client.name}</h3>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">{client.email}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={`h-2 w-2 rounded-full ${getMembershipColor(client.membershipType)}`} />
                  <span className="text-xs text-muted-foreground">{client.membershipType}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{client.attendanceRate}% attendance</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
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
              <span className="text-sm text-muted-foreground">
                ${client.monthlyFee}/mo
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="bg-card rounded-xl p-8 border border-border text-center mt-8">
          <p className="text-muted-foreground mb-4">No clients found</p>
          <Button
            onClick={() => setShowAddClient(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </div>
      )}

      <AddClientDialog
        open={showAddClient}
        onClose={() => setShowAddClient(false)}
      />

      <ClientProfileDialog
        open={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        client={selectedClient}
      />
    </div>
  );
}
