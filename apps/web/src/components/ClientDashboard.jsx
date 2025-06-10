import React, { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import logoMakincome from '../assets/logo-makincome-new.png';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';

const ClientDashboard = () => {
  const [client, setClient] = useState(null);
  const [plan, setPlan] = useState(null);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allRegisteredClasses, setAllRegisteredClasses] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchClientData = async () => {
      setLoading(true);
      // Fetch client profile
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoading(false);
        return;
      }
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        setClient(profile);
        // Fetch plan info
        if (profile && profile.payment_plan_id) {
          const { data: planData } = await supabase
            .from('payment_plans')
            .select('*')
            .eq('id', profile.payment_plan_id)
            .single();
          setPlan(planData);
        }
        // Fetch all class registrations for this user (for dashboard stats)
        const { data: allRegs } = await supabase
          .from('class_registrations')
          .select('*, class:classes(*)')
          .eq('user_id', user.id);
        setAllRegisteredClasses((allRegs || []).map(r => r.class));
        // Fetch upcoming classes the client is registered for (future only)
        const { data: registeredClasses } = await supabase
          .from('class_registrations')
          .select('*, class:classes(*)')
          .eq('user_id', user.id)
          .order('class.date', { ascending: true });
        const nowDate = new Date();
        setUpcomingClasses(
          (registeredClasses || [])
            .map(r => r.class)
            .filter(cls => cls && new Date(cls.date) >= nowDate)
        );
        // Fetch all available classes
        const { data: allClasses } = await supabase
          .from('classes')
          .select('*')
          .gte('date', new Date().toISOString().slice(0, 10))
          .order('date', { ascending: true });
        setAvailableClasses(allClasses || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClientData();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
      window.location.reload(); // Force reload to clear state
    } catch (error) {
      alert('Sign out failed: ' + (error.message || error));
    }
  };

  // Calculate number of classes taken this month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const classesThisMonth = allRegisteredClasses.filter(cls => {
    if (!cls || !cls.date) return false;
    const d = new Date(cls.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && d < now;
  }).length;

  // Group available classes by date and sort by time
  const availableClassesByDate = availableClasses.reduce((acc, cls) => {
    if (!acc[cls.date]) acc[cls.date] = [];
    acc[cls.date].push(cls);
    return acc;
  }, {});
  Object.keys(availableClassesByDate).forEach(date => {
    availableClassesByDate[date].sort((a, b) => a.start_time.localeCompare(b.start_time));
  });
  const sortedAvailableDates = Object.keys(availableClassesByDate).sort();

  // Placeholder evolution stats
  const evolutionStats = [
    { label: 'Workouts this week', value: 4 },
    { label: 'Personal Best (Squat)', value: '120kg' },
    { label: 'Personal Best (Bench)', value: '85kg' },
    { label: 'Personal Best (Deadlift)', value: '150kg' },
  ];

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', width: '100%', margin: 0, padding: 0, background: '#fff' }}>
      {/* Header */}
      <header style={{
        width: '100%',
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: 0,
        minHeight: 64,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        left: 0,
        right: 0,
        margin: 0
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={logoMakincome} alt="Makincome Logo" style={{ height: 40 }} />
          </div>
          
          {/* Mobile menu button */}
          <button 
            className="mobile-nav-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{ display: 'none' }}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>

          {/* Navigation menu */}
          <nav className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`} style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <Link 
              to="/client" 
              style={{ 
                fontWeight: 600, 
                color: location.pathname === '/client' ? '#2196f3' : '#222', 
                textDecoration: 'none', 
                fontSize: '1.1rem',
                padding: '0.5rem'
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              to="/client/schedule" 
              style={{ 
                fontWeight: 600, 
                color: location.pathname.startsWith('/client/schedule') ? '#2196f3' : '#222', 
                textDecoration: 'none', 
                fontSize: '1.1rem',
                padding: '0.5rem'
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Schedule Classes
            </Link>
            <Link 
              to="/client/evolution" 
              style={{ 
                fontWeight: 600, 
                color: location.pathname.startsWith('/client/evolution') ? '#2196f3' : '#222', 
                textDecoration: 'none', 
                fontSize: '1.1rem',
                padding: '0.5rem'
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Evolution Tracker
            </Link>
            <button 
              onClick={handleSignOut} 
              style={{ 
                background: '#f87171', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 20, 
                padding: '0.5rem 1.2rem', 
                fontWeight: 700, 
                fontSize: '1rem', 
                cursor: 'pointer',
                margin: '0.5rem'
              }}
            >
              Sign Out
            </button>
            <div
              onClick={() => {
                navigate('/client/profile');
                setIsMobileMenuOpen(false);
              }}
              style={{ 
                width: 36, 
                height: 36, 
                borderRadius: '50%', 
                background: '#e0e7ff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 700, 
                color: '#2196f3', 
                fontSize: 18, 
                cursor: 'pointer', 
                border: location.pathname.startsWith('/client/profile') ? '2px solid #2196f3' : 'none', 
                transition: 'border 0.2s',
                margin: '0.5rem'
              }}
              title="Profile"
            >
              {client?.first_name?.[0] || '?'}
            </div>
          </nav>
        </div>
      </header>

      {/* Main content */}
      {location.pathname === '/client' ? (
        <div className="container" style={{ padding: '2rem 1rem' }}>
          <h1 style={{ 
            fontSize: 'clamp(2rem, 5vw, 3rem)', 
            fontWeight: 900, 
            marginBottom: '2rem', 
            color: '#18181b', 
            textAlign: 'center', 
            letterSpacing: '-0.03em' 
          }}>
            {now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'}, {client?.first_name}!
          </h1>

          {/* Stats cards */}
          <div className="stats-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1.5rem', 
            marginBottom: '2.5rem' 
          }}>
            <div style={{ background: '#f8fafc', borderRadius: 16, padding: '1.5rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 700, color: '#2196f3' }}>{classesThisMonth}</div>
              <div style={{ color: '#64748b', fontWeight: 500 }}>Classes This Month</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 16, padding: '1.5rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 700, color: '#2196f3' }}>{plan ? plan.name : '-'}</div>
              <div style={{ color: '#64748b', fontWeight: 500 }}>Plan</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 16, padding: '1.5rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 700, color: '#2196f3' }}>{plan ? `€${plan.price}` : '-'}</div>
              <div style={{ color: '#64748b', fontWeight: 500 }}>Plan Price</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 16, padding: '1.5rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 700, color: '#2196f3' }}>{evolutionStats[0].value}</div>
              <div style={{ color: '#64748b', fontWeight: 500 }}>{evolutionStats[0].label}</div>
            </div>
          </div>

          {/* Upcoming Classes */}
          <div style={{ width: '100%', marginBottom: '2.5rem' }}>
            <h2 style={{ 
              fontSize: 'clamp(1.5rem, 4vw, 2rem)', 
              fontWeight: 800, 
              marginBottom: '1.5rem', 
              textAlign: 'center', 
              color: '#18181b' 
            }}>
              Upcoming Classes
            </h2>
            {upcomingClasses.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center' }}>No upcoming classes registered.</div>
            ) : (
              <div className="classes-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: '1.5rem' 
              }}>
                {upcomingClasses.map(cls => (
                  <div key={cls.id} style={{ 
                    background: '#fff', 
                    borderRadius: 12, 
                    padding: '1.2rem', 
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'flex-start' 
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>{cls.name}</div>
                    <div style={{ color: '#64748b', fontSize: 15, marginBottom: 6 }}>{cls.date} {cls.start_time}</div>
                    {cls.description && <div style={{ color: '#64748b', fontSize: 15, marginBottom: 6 }}>{cls.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : <Outlet />}
    </div>
  );
};

export default ClientDashboard; 