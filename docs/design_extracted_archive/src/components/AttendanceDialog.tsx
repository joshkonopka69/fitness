import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, Minus } from "lucide-react";
import { Button } from "./ui/button";
import { Session } from "./mockData";

interface AttendanceDialogProps {
  open: boolean;
  onClose: () => void;
  session: Session | null;
}

export function AttendanceDialog({ open, onClose, session }: AttendanceDialogProps) {
  const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
    if (!session) return {};
    return session.attendees.reduce((acc, attendee) => {
      acc[attendee.id] = attendee.attended;
      return acc;
    }, {} as Record<string, boolean>);
  });

  if (!session) return null;

  const toggleAttendance = (id: string) => {
    setAttendance((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const attendedCount = Object.values(attendance).filter(Boolean).length;
  const totalCount = session.attendees.length;

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
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-foreground">{session.title}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full w-10 h-10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-6">{session.time}</p>

            <div className="bg-background rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Attendance</span>
                <span className="text-foreground">
                  {attendedCount}/{totalCount} attended ({Math.round((attendedCount / totalCount) * 100)}%)
                </span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(attendedCount / totalCount) * 100}%` }}
                  className="h-full bg-primary"
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {session.attendees.map((attendee, index) => (
                <motion.button
                  key={attendee.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => toggleAttendance(attendee.id)}
                  className={`
                    w-full flex items-center justify-between p-4 rounded-xl border transition-all min-h-[60px]
                    ${attendance[attendee.id]
                      ? 'bg-primary/10 border-primary'
                      : 'bg-background border-border'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${attendance[attendee.id]
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                      }
                    `}>
                      {attendee.name.charAt(0)}
                    </div>
                    <span className={`
                      ${attendance[attendee.id] ? 'text-foreground' : 'text-muted-foreground'}
                    `}>
                      {attendee.name}
                    </span>
                  </div>
                  <motion.div
                    initial={false}
                    animate={{
                      scale: attendance[attendee.id] ? 1 : 0.8,
                      opacity: attendance[attendee.id] ? 1 : 0.5,
                    }}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      ${attendance[attendee.id]
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                      }
                    `}
                  >
                    {attendance[attendee.id] ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Minus className="w-5 h-5" />
                    )}
                  </motion.div>
                </motion.button>
              ))}
            </div>

            <Button
              onClick={onClose}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12"
            >
              Save Attendance
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
