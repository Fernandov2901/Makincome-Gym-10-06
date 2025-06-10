import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/en";

// --- Minimal shadcn/ui Popover implementation ---
function Popover({ open, onOpenChange, children }) {
  return <>{children}</>;
}
function PopoverTrigger({ asChild, children }) {
  return children;
}
function PopoverContent({ className = '', children }) {
  return (
    <div className={`absolute z-50 mt-2 left-1/2 -translate-x-1/2 ${className}`}>{children}</div>
  );
}

const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];
const accent = "cyan-400";

function getMonthMatrix(year, month) {
  const firstDay = dayjs().year(year).month(month).startOf("month");
  const startDay = firstDay.day();
  const daysInMonth = firstDay.daysInMonth();
  let matrix = [];
  let day = 1 - startDay;
  for (let i = 0; i < 6; i++) {
    let row = [];
    for (let j = 0; j < 7; j++, day++) {
      row.push(day > 0 && day <= daysInMonth ? day : null);
    }
    matrix.push(row);
  }
  return matrix;
}

export default function FuturisticCalendar() {
  const [current, setCurrent] = useState(dayjs());
  const [selected, setSelected] = useState(dayjs());
  const [popoverDay, setPopoverDay] = useState(null);

  const matrix = getMonthMatrix(current.year(), current.month());
  const today = dayjs();

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <motion.div
        className="rounded-2xl shadow-xl bg-white/5 backdrop-blur-lg border border-white/10 p-6 relative"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            whileHover={{ scale: 1.15, backgroundColor: "#0ff" }}
            className="p-2 rounded-full bg-white/10 hover:bg-cyan-400/20 transition"
            onClick={() => setCurrent(current.subtract(1, "month"))}
            aria-label="Previous month"
            type="button"
          >
            <ChevronLeft className="w-5 h-5 text-cyan-400" />
          </motion.button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-cyan-400" />
            <span className="font-bold text-xl md:text-2xl tracking-wide text-white font-sans" style={{ fontFamily: "Inter, Satoshi, sans-serif" }}>
              {current.format("MMMM YYYY")}
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.15, backgroundColor: "#0ff" }}
            className="p-2 rounded-full bg-white/10 hover:bg-cyan-400/20 transition"
            onClick={() => setCurrent(current.add(1, "month"))}
            aria-label="Next month"
            type="button"
          >
            <ChevronRight className="w-5 h-5 text-cyan-400" />
          </motion.button>
        </div>
        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysOfWeek.map((d) => (
            <div key={d} className="text-cyan-300 text-center font-semibold text-sm select-none">{d}</div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2 relative">
          {matrix.flat().map((day, idx) => {
            const date = day && current.date(day);
            const isToday = day && date.isSame(today, "day");
            const isSelected = day && date.isSame(selected, "day");
            return (
              <Popover key={idx} open={popoverDay === day} onOpenChange={open => setPopoverDay(open ? day : null)}>
                <PopoverTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    className={[
                      "aspect-square w-full rounded-2xl flex items-center justify-center font-medium transition relative z-10",
                      day ? "cursor-pointer text-white" : "opacity-0 pointer-events-none",
                      isSelected && `bg-cyan-400 text-gray-900 shadow-lg`,
                      isToday && !isSelected && "ring-2 ring-cyan-400/80 ring-offset-2 ring-offset-[#0d1117] shadow-cyan-400/30 shadow-lg",
                      isToday && "after:absolute after:inset-0 after:rounded-2xl after:blur-md after:bg-cyan-400/30 after:z-[-1]"
                    ].filter(Boolean).join(' ')}
                    style={{
                      fontFamily: "Inter, Satoshi, sans-serif",
                      boxShadow: isToday ? "0 0 16px 4px rgba(34,211,238,0.25)" : undefined,
                    }}
                    onClick={() => day && setSelected(date)}
                    type="button"
                  >
                    {day}
                  </motion.button>
                </PopoverTrigger>
                {day && isSelected && (
                  <PopoverContent
                    className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 min-w-[220px] shadow-xl"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold text-cyan-200">{date.format("dddd, MMM D")}</span>
                    </div>
                    <div className="text-white/80 text-sm">
                      <span className="block mb-1">No real events (demo)</span>
                      <span className="block">You can hook up real data here.</span>
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            );
          })}
        </div>
      </motion.div>
      <style>{`
        body { background: #0d1117; }
      `}</style>
    </div>
  );
} 