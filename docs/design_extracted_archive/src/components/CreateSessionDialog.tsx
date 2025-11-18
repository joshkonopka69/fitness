import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Clock, Users, Type } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

interface CreateSessionDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date | null;
}

export function CreateSessionDialog({ open, onClose, selectedDate }: CreateSessionDialogProps) {
  const [title, setTitle] = useState("");
  const [sessionType, setSessionType] = useState("strength");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const timePresets = [
    "6:00 AM - 7:30 AM",
    "9:00 AM - 10:30 AM",
    "12:00 PM - 1:30 PM",
    "6:00 PM - 7:30 PM",
    "7:30 PM - 9:00 PM",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle session creation
    onClose();
  };

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
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-card border border-border rounded-2xl p-6 z-50 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-foreground">Create Session</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full w-10 h-10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Type className="w-4 h-4" />
                  Session Title
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Morning HIIT Bootcamp"
                  className="bg-background border-border"
                  required
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4" />
                  Session Type
                </Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Strength Training</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="hiit">HIIT</SelectItem>
                    <SelectItem value="yoga">Yoga</SelectItem>
                    <SelectItem value="pilates">Pilates</SelectItem>
                    <SelectItem value="crossfit">CrossFit</SelectItem>
                    <SelectItem value="personal">Personal Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" />
                  Time
                </Label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {timePresets.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={time === preset ? "default" : "outline"}
                      onClick={() => setTime(preset)}
                      className={`${
                        time === preset
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border-border"
                      }`}
                    >
                      {preset.split(" - ")[0]}
                    </Button>
                  ))}
                </div>
                <Input
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="Or enter custom time"
                  className="bg-background border-border"
                />
              </div>

              {selectedDate && (
                <div>
                  <Label>Date</Label>
                  <div className="mt-2 p-3 bg-background rounded-lg border border-border">
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              )}

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add session notes..."
                  className="bg-background border-border mt-2 min-h-[80px]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-border"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Create Session
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
