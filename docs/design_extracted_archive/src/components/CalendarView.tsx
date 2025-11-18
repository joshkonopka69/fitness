import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { CreateSessionDialog } from "./CreateSessionDialog";
import { AttendanceDialog } from "./AttendanceDialog";
import { mockSessions } from "./mockData";

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getSessionsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return mockSessions.filter(s => s.date === dateStr);
  };

  const today = new Date();
  const isToday = (day: number) => {
    return today.getDate() === day &&
           today.getMonth() === currentDate.getMonth() &&
           today.getFullYear() === currentDate.getFullYear();
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-foreground mb-1">TrainTrack</h1>
          <p className="text-muted-foreground">Manage your sessions</p>
        </div>
        <Button
          onClick={() => setShowCreateSession(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-12 h-12 p-0"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Calendar Header */}
      <div className="bg-card rounded-2xl p-4 border border-border mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousMonth}
              className="w-8 h-8 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="w-8 h-8 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <div key={i} className="text-center text-muted-foreground text-sm">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const sessions = getSessionsForDate(day);
            const hasSession = sessions.length > 0;
            
            return (
              <motion.button
                key={day}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  setSelectedDate(date);
                  setShowCreateSession(true);
                }}
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center relative
                  transition-colors
                  ${isToday(day) ? 'bg-primary/20 border-2 border-primary' : 'bg-muted/50'}
                  hover:bg-muted
                `}
              >
                <span className={`text-sm ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                  {day}
                </span>
                {hasSession && (
                  <div className="flex gap-0.5 mt-1">
                    {sessions.slice(0, 3).map((_, idx) => (
                      <div key={idx} className="w-1 h-1 rounded-full bg-primary" />
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Today's Sessions */}
      <div className="mb-4">
        <h3 className="text-foreground mb-3">Today's Sessions</h3>
        <AnimatePresence>
          {mockSessions.filter(s => {
            const today = new Date();
            const sessionDate = new Date(s.date);
            return sessionDate.toDateString() === today.toDateString();
          }).map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedSession(session.id)}
              className="bg-card rounded-xl p-4 border border-border mb-3 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-foreground mb-1">{session.title}</h4>
                  <p className="text-sm text-muted-foreground">{session.time}</p>
                </div>
                <div className={`
                  px-3 py-1 rounded-full text-xs
                  ${session.type === 'strength' ? 'bg-primary/20 text-primary' : 
                    session.type === 'cardio' || session.type === 'hiit' ? 'bg-secondary/20 text-secondary' : 
                    session.type === 'yoga' || session.type === 'pilates' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-amber-500/20 text-amber-400'}
                `}>
                  {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  {session.attendees.filter(a => a.attended).length}/{session.attendees.length} attended
                </span>
                <div className="flex -space-x-2">
                  {session.attendees.slice(0, 4).map((attendee) => (
                    <div
                      key={attendee.id}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary border-2 border-card flex items-center justify-center text-xs"
                    >
                      {attendee.name.charAt(0)}
                    </div>
                  ))}
                  {session.attendees.length > 4 && (
                    <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs">
                      +{session.attendees.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {mockSessions.filter(s => {
          const today = new Date();
          const sessionDate = new Date(s.date);
          return sessionDate.toDateString() === today.toDateString();
        }).length === 0 && (
          <div className="bg-card rounded-xl p-8 border border-border text-center">
            <p className="text-muted-foreground">No sessions scheduled for today</p>
            <Button
              onClick={() => setShowCreateSession(true)}
              className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Session
            </Button>
          </div>
        )}
      </div>

      <CreateSessionDialog
        open={showCreateSession}
        onClose={() => {
          setShowCreateSession(false);
          setSelectedDate(null);
        }}
        selectedDate={selectedDate}
      />

      <AttendanceDialog
        open={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        session={mockSessions.find(s => s.id === selectedSession) || null}
      />
    </div>
  );
}
