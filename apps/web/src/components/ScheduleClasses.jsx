import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import supabase from '../supabaseClient';

const ScheduleClasses = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allClasses, setAllClasses] = useState([]);
  const [registeredClasses, setRegisteredClasses] = useState([]);
  const [clientId, setClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setMessage('');
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setClientId(user.id);
      // Fetch all classes (future and today)
      const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .gte('date', new Date().toISOString().slice(0, 10));
      setAllClasses(classes || []);
      // Fetch registered classes for this user
      const { data: regs } = await supabase
        .from('class_registrations')
        .select('class_id')
        .eq('user_id', user.id);
      setRegisteredClasses(regs ? regs.map(r => r.class_id) : []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleRegister = async (classId) => {
    setMessage('');
    await supabase.from('class_registrations').insert({ user_id: clientId, class_id: classId });
    setRegisteredClasses(prev => [...prev, classId]);
    setMessage('Registered successfully!');
  };

  const handleUnregister = async (classId) => {
    setMessage('');
    await supabase.from('class_registrations').delete().eq('user_id', clientId).eq('class_id', classId);
    setRegisteredClasses(prev => prev.filter(id => id !== classId));
    setMessage('Unregistered successfully!');
  };

  // Classes for the selected day
  const selectedDateStr = selectedDate.toISOString().slice(0, 10);
  const classesForDay = allClasses.filter(cls => cls.date === selectedDateStr);

  // Dates with classes for calendar highlight
  const classDates = Array.from(new Set((allClasses || []).map(cls => cls.date)));

  return (
    <div className="schedule-root">
      <div className="schedule-grid">
        <div className="calendar-col">
          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            tileClassName={({ date, view }) =>
              view === 'month' && classDates.includes(date.toISOString().slice(0, 10)) ? 'class-day-highlight' : null
            }
          />
        </div>
        <div className="classlist-col">
          <h2 className="classlist-title">
            Classes on {selectedDate.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </h2>
          {message && <div className="classlist-message">{message}</div>}
          {loading ? (
            <div>Loading...</div>
          ) : classesForDay.length === 0 ? (
            <div className="classlist-empty">No classes scheduled for this day.</div>
          ) : (
            classesForDay.map(cls => (
              <div key={cls.id} className="class-card">
                <div className="class-card-header">
                  <div className="class-card-title">{cls.name}</div>
                  <div className="class-card-time">{cls.start_time} - {cls.end_time}</div>
                </div>
                {cls.description && <div className="class-card-desc">{cls.description}</div>}
                <div className="class-card-coach">Coach: {/* You can fetch coach name if needed */}</div>
                {registeredClasses.includes(cls.id) ? (
                  <button className="remove-btn class-card-btn" onClick={() => handleUnregister(cls.id)}>Unregister</button>
                ) : (
                  <button className="submit-btn class-card-btn" onClick={() => handleRegister(cls.id)}>Register</button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <style>{`
        .schedule-root {
          min-height: 100vh;
          width: 100vw;
          background: #fff;
          display: flex;
          flex-direction: column;
        }
        .schedule-grid {
          flex: 1;
          display: grid;
          grid-template-columns: minmax(260px, 420px) 1fr;
          gap: 2.5vw;
          align-items: flex-start;
          justify-content: center;
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          padding: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 3rem);
          box-sizing: border-box;
        }
        .calendar-col {
          min-width: 0;
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          padding: clamp(1rem, 2vw, 2rem);
          overflow-x: auto;
        }
        .classlist-col {
          min-width: 0;
          width: 100%;
          background: #f8fafc;
          border-radius: 16px;
          padding: clamp(1.5rem, 3vw, 2.5rem);
          min-height: 420px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
        }
        .classlist-title {
          font-size: clamp(1.3rem, 2.5vw, 2rem);
          font-weight: 800;
          margin-bottom: 1.5rem;
        }
        .classlist-message {
          color: #2196f3;
          margin-bottom: 1rem;
        }
        .classlist-empty {
          color: #64748b;
        }
        .class-card {
          background: #fff;
          border-radius: 12px;
          padding: 1.2rem 1.5rem;
          margin-bottom: 1.2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .class-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.3rem;
        }
        .class-card-title {
          font-weight: 700;
          font-size: clamp(1.05rem, 2vw, 1.2rem);
        }
        .class-card-time {
          color: #64748b;
          font-size: clamp(0.95rem, 1.5vw, 1.05rem);
        }
        .class-card-desc {
          color: #64748b;
          font-size: clamp(0.98rem, 1.5vw, 1.08rem);
        }
        .class-card-coach {
          color: #64748b;
          font-size: clamp(0.95rem, 1.5vw, 1.05rem);
          margin-bottom: 0.5rem;
        }
        .class-card-btn {
          width: 120px;
          height: 36px;
          align-self: flex-end;
        }
        .class-day-highlight {
          background: #e0e7ff !important;
          color: #18181b !important;
          border-radius: 12px !important;
        }
        @media (max-width: 1100px) {
          .schedule-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
            padding: 2rem 2vw;
          }
          .calendar-col, .classlist-col {
            max-width: 100% !important;
            margin: 0 auto 1.5rem auto !important;
          }
        }
        @media (max-width: 600px) {
          .schedule-grid {
            padding: 1rem 0.5rem;
            gap: 1.2rem;
          }
          .calendar-col, .classlist-col {
            padding: 1rem !important;
            border-radius: 10px !important;
          }
          .class-card {
            padding: 0.8rem 0.7rem;
          }
          .class-card-title {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ScheduleClasses; 