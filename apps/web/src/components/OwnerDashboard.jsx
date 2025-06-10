import React, { useState, useEffect, useRef, useMemo } from 'react';
import supabase from '../supabaseClient';
import './OwnerDashboard.css';
import logoHandshake from '../assets/logo-handshake.png';
import logoMakincome from '../assets/logo-makincome-new.png';
import { Chart } from 'chart.js/auto';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { startOfWeek, addDays, format, isSameDay } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import ClientProfileView from './client-profile-view';

// Import our enhanced clients section
import EnhancedClientsSection from './clients/enhanced-clients-section';

import CoachesPage from './coaches/coaches-page';
import PaymentPlans from './payment-plans/payment-plans';

// Helper for euro formatting
const euro = (value) => `€${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Insert a fallback (stub) for getPlanInfo so that the mapping (in JSX) does not crash
const getPlanInfo = (plan) => ({});

// --- ClientProfileModal component (top-level, before OwnerDashboard) ---
function ClientProfileModal({ clientId, onClose, clients, plans }) {
  const [history, setHistory] = React.useState([]);
  const [payments, setPayments] = React.useState([]);
  const [checkins, setCheckins] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  async function fetchClientHistory(clientId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      if (!ownerProfile) throw new Error('Owner profile not found');
      const { data: checkins, error: checkinsError } = await supabase
        .from('class_signups')
        .select(`
          created_at,
          classes (
            name,
            start_time,
            coaches (
              first_name,
              last_name
            )
          )
        `)
        .eq('user_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (checkinsError) throw checkinsError;
      const { data: planChanges, error: planChangesError } = await supabase
        .from('user_profiles')
        .select(`
          payment_plan_id,
          plan_start_date,
          plan_end_date,
          payment_plans (
            name
          )
        `)
        .eq('user_id', clientId)
        .order('plan_start_date', { ascending: false })
        .limit(5);
      if (planChangesError) throw planChangesError;
      const history = [
        ...(checkins || []).map(checkin => ({
          date: checkin.created_at,
          type: 'check-in',
          details: `${checkin.classes?.name || ''} with ${checkin.classes?.coaches?.first_name || ''} ${checkin.classes?.coaches?.last_name || ''}`
        })),
        ...(planChanges || []).map(change => ({
          date: change.plan_start_date,
          type: 'plan-change',
          details: `Changed to ${change.payment_plans?.name || ''}`
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      return history;
    } catch (error) {
      console.error('Error fetching client history:', error);
      return [];
    }
  }
  async function fetchClientPayments(clientId) {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          created_at,
          amount,
          status,
          payment_plans (
            name
          )
        `)
        .eq('user_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (payments || []).map(payment => ({
        date: payment.created_at,
        amount: payment.amount,
        status: payment.status,
        plan: payment.payment_plans?.name || ''
      }));
    } catch (error) {
      console.error('Error fetching client payments:', error);
      return [];
    }
  }
  async function fetchClientCheckins(clientId) {
    try {
      const { data: checkins, error } = await supabase
        .from('class_signups')
        .select(`
          created_at,
          classes (
            name,
            start_time,
            coaches (
              first_name,
              last_name
            )
          )
        `)
        .eq('user_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (checkins || []).map(checkin => ({
        date: checkin.created_at,
        time: new Date(checkin.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        class: checkin.classes?.name || '',
        coach: `${checkin.classes?.coaches?.first_name || ''} ${checkin.classes?.coaches?.last_name || ''}`
      }));
    } catch (error) {
      console.error('Error fetching client check-ins:', error);
      return [];
    }
  }

  React.useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    Promise.all([
      fetchClientHistory(clientId),
      fetchClientPayments(clientId),
      fetchClientCheckins(clientId)
    ]).then(([historyData, paymentsData, checkinsData]) => {
      setHistory(historyData);
      setPayments(paymentsData);
      setCheckins(checkinsData);
      setLoading(false);
    });
  }, [clientId]);

  const client = clients.find(c => c.user_id === clientId);
  function getPlanInfo(planId) {
    return plans.find(p => p.id === planId);
  }
  if (!clientId) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, maxWidth: 800, width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.5rem' }}>Client Profile</h3>
          <button className="remove-btn" style={{ minWidth: 80 }} onClick={onClose}>Close</button>
        </div>
        {!client ? (
          <div>Client not found</div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading client data...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Basic Info */}
            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 600 }}>Basic Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>Name</div>
                  <div style={{ fontWeight: 600 }}>{client.first_name} {client.last_name}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>Email</div>
                  <div>{client.email}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>Phone</div>
                  <div>{client.phone || '-'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>Current Plan</div>
                  <div>{getPlanInfo(client.payment_plan_id)?.name || '-'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>Plan Start</div>
                  <div>{client.plan_start_date ? new Date(client.plan_start_date).toLocaleDateString() : '-'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>Plan End</div>
                  <div>{client.plan_end_date ? new Date(client.plan_end_date).toLocaleDateString() : '-'}</div>
                </div>
              </div>
            </div>
            {/* Recent Activity */}
            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 600 }}>Recent Activity</h4>
              {history.length === 0 ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>No recent activity</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {history.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, padding: 12, background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                      <div style={{ minWidth: 100, color: '#64748b' }}>{new Date(item.date).toLocaleDateString()}</div>
                      <div style={{ fontWeight: 500 }}>{item.details}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Payment History */}
            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 600 }}>Payment History</h4>
              {payments.length === 0 ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>No payment history</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {payments.map((payment, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, padding: 12, background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                      <div style={{ minWidth: 100, color: '#64748b' }}>{new Date(payment.date).toLocaleDateString()}</div>
                      <div style={{ fontWeight: 600 }}>{euro(payment.amount)}</div>
                      <div style={{ color: '#64748b' }}>{payment.plan}</div>
                      <div style={{ marginLeft: 'auto', color: payment.status === 'paid' ? '#059669' : '#e11d48' }}>
                        {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1) || 'Unknown'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Check-in History */}
            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 600 }}>Check-in History</h4>
              {checkins.length === 0 ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>No check-in history</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {checkins.map((checkin, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, padding: 12, background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                      <div style={{ minWidth: 100, color: '#64748b' }}>{new Date(checkin.date).toLocaleDateString()}</div>
                      <div style={{ minWidth: 80 }}>{checkin.time}</div>
                      <div style={{ fontWeight: 500 }}>{checkin.class}</div>
                      <div style={{ color: '#64748b' }}>with {checkin.coach}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OwnerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gym, setGym] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [viewClientProfile, setViewClientProfile] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [classDates, setClassDates] = useState([]);
  const [plans, setPlans] = useState([]);
  const [gymName, setGymName] = useState('Your Gym');
  const [ownerName, setOwnerName] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  
  const [showAddCoach, setShowAddCoach] = useState(false);
  const [showEditCoach, setShowEditCoach] = useState(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showEditClient, setShowEditClient] = useState(null);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showEditClass, setShowEditClass] = useState(null);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showArchivedPlans, setShowArchivedPlans] = useState(false);
  
  // Move these state declarations from below the conditional returns to here
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    userId: '',
    amount: '',
    paymentPlanId: '',
    status: 'paid',
    serviceType: 'membership',
    paymentMethod: 'card',
    notes: ''
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  
  const [showAddProductSale, setShowAddProductSale] = useState(false);
  const [productForm, setProductForm] = useState({
    userId: '',
    productId: '',
    quantity: 1,
    pricePerUnit: '',
    discount: 0,
    paymentMethod: 'card',
    paymentStatus: 'paid',
    notes: ''
  });
  const [products, setProducts] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productMessage, setProductMessage] = useState('');
  
  const [showManageProducts, setShowManageProducts] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    cost: '',
    category: '',
    inventory_count: 0
  });
  const [productFormError, setProductFormError] = useState('');
  
  // Add the missing state declarations
  const [gymId, setGymId] = useState(null);
  
  // States for professions
  const [professions, setProfessions] = useState(() => {
    const stored = localStorage.getItem('professions');
    return stored ? JSON.parse(stored) : [{ name: 'Coach' }];
  });
  const [newProfession, setNewProfession] = useState('');
  
  // States for week navigation and assignments
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [assignments, setAssignments] = useState({});
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [modalState, setModalState] = useState({ open: false, profession: '', date: null });
  
  // State for stat cards
  const [activeClientsThisWeek, setActiveClientsThisWeek] = useState(0);
  const [classFillRate, setClassFillRate] = useState(0);
  const [avgCheckinsPerClient, setAvgCheckinsPerClient] = useState(0);
  
  // State for charts
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const revenueChartRef = useRef(null);
  const revenueChartInstance = useRef(null);
  const revenueYearChartRef = useRef(null);
  const revenueYearChartInstance = useRef(null);
  const barChartRef = useRef(null);
  const lineChartRef = useRef(null);
  const pieChartRef = useRef(null);
  
  const [revenueData, setRevenueData] = useState({
    months: [],
    monthlyRevenue: [],
    trendRevenue: [],
    serviceLabels: [],
    serviceData: [],
    recentPayments: []
  });
  const [revenueLoading, setRevenueLoading] = useState(false);
  
  // State for coach and calendar
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [selectedCoachDate, setSelectedCoachDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  // Client management state
  const [newCoach, setNewCoach] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    style: '',
    days: [],
    salary: ''
  });
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachMessage, setCoachMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [classMessage, setClassMessage] = useState('');

  const [newClient, setNewClient] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    planId: '',
  });
  const [clientLoading, setClientLoading] = useState(false);
  const [clientMessage, setClientMessage] = useState('');

  // State for editing a client
  const [editClientForm, setEditClientForm] = useState({ firstName: '', lastName: '', email: '', phone: '', planId: '' });
  const [editClientLoading, setEditClientLoading] = useState(false);
  const [editClientMessage, setEditClientMessage] = useState('');

  // State for editing a coach
  const [editCoachForm, setEditCoachForm] = useState({ firstName: '', lastName: '', email: '', phone: '', style: '', days: [], salary: '' });
  const [editCoachLoading, setEditCoachLoading] = useState(false);
  const [editCoachMessage, setEditCoachMessage] = useState('');

  // State for editing plans
  const [showEditPlan, setShowEditPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    duration: '',
    description: '',
    category: '',
    auto_renew: false,
    access_type: 'all',
    benefits: '',
    status: 'active'
  });

  // Add new state for editing classes
  const [editClassForm, setEditClassForm] = useState({
    name: '',
    description: '',
    start_time: '',
    coach_id: '',
    capacity: '',
    duration: ''
  });

  // Add handler for editing class input
  const handleEditClassInput = (e) => {
    const { name, value } = e.target;
    setEditClassForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle click outside of user menu to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    
    // Add event listener when menu is open
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
      console.log("Fetching plans for user:", user.id);
      
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      
      if (!ownerProfile) {
        console.error('Owner profile not found');
        throw new Error('Owner profile not found');
      }
      
      const { data: plans, error } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('gym_id', ownerProfile.gym_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      console.log("Fetched plans:", plans?.length || 0);
      setPlans(plans || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
      const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      
      if (!ownerProfile) throw new Error('Owner profile not found');
      
      const { data: clients, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          payment_plans (
            name,
            price,
            duration
          )
        `)
        .eq('gym_id', ownerProfile.gym_id)
        .eq('user_type', 'user')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setClients(clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchCoaches = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      
      if (!ownerProfile) throw new Error('Owner profile not found');
      
      const { data: coaches, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          coach_profiles (
            style,
            days,
            salary
          )
        `)
        .eq('gym_id', ownerProfile.gym_id)
        .eq('user_type', 'coach')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCoaches(coaches || []);
    } catch (error) {
      console.error('Error fetching coaches:', error);
    }
  };

  const fetchAllClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      
      if (!ownerProfile) throw new Error('Owner profile not found');
      
      const { data: classes, error } = await supabase
        .from('classes')
        .select(`
          *,
          coaches (
            first_name,
            last_name
          )
        `)
        .eq('gym_id', ownerProfile.gym_id)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      
      setAllClasses(classes || []);
      
      // Update class dates for calendar
      const dates = [...new Set((classes || []).map(c => c.date))];
      setClassDates(dates);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  // Helper function to count clients per plan
  const getClientCount = (planId) => {
    return clients.filter(client => client.payment_plan_id === planId).length;
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchPlans();
      fetchClients();
      fetchCoaches();
      fetchAllClasses();
    }
    if (activeTab === 'coaches') fetchCoaches();
    if (activeTab === 'clients') {
      fetchPlans();
      fetchClients();
    }
    if (activeTab === 'plans') {
      fetchPlans();
      fetchClients();
    }
    // Fetch owner name on mount
    const fetchOwnerName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();
      if (ownerProfile) {
        setOwnerName(`${ownerProfile.first_name} ${ownerProfile.last_name}`);
      }
    };
    fetchOwnerName();
    // eslint-disable-next-line
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'revenue') {
      fetchPayments();
    }
    // eslint-disable-next-line
  }, [activeTab]);

  useEffect(() => {
    // Only execute chart logic if we're on the revenue tab and charts are available
    if (activeTab !== 'revenue') return;
    
    // Bar chart
    if (barChartRef.current && revenueData.months.length > 0) {
      const barChart = new Chart(barChartRef.current, {
        type: 'bar',
          data: {
          labels: revenueData.months,
            datasets: [{
            label: 'Monthly Revenue',
            data: revenueData.monthlyRevenue,
            backgroundColor: '#2563eb',
          }],
        },
        options: { responsive: true, plugins: { legend: { display: false } } },
      });
      
      // Clean up chart on unmount
      return () => barChart.destroy();
    }
  }, [activeTab, revenueData]);
  
  useEffect(() => {
    // Only execute chart logic if we're on the revenue tab and charts are available
    if (activeTab !== 'revenue') return;
    
    // Line chart
    if (lineChartRef.current && revenueData.months.length > 0) {
      const lineChart = new Chart(lineChartRef.current, {
        type: 'line',
        data: {
          labels: revenueData.months,
          datasets: [{
            label: 'Revenue Trend',
            data: revenueData.trendRevenue,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37,99,235,0.1)',
            fill: true,
          }],
        },
        options: { responsive: true, plugins: { legend: { display: false } } },
      });
      
      // Clean up chart on unmount
      return () => lineChart.destroy();
    }
  }, [activeTab, revenueData]);
  
  useEffect(() => {
    // Only execute chart logic if we're on the revenue tab and charts are available
    if (activeTab !== 'revenue') return;
    
    // Pie chart
    if (pieChartRef.current && revenueData.serviceLabels.length > 0) {
      const pieChart = new Chart(pieChartRef.current, {
        type: 'pie',
        data: {
          labels: revenueData.serviceLabels,
          datasets: [{
            data: revenueData.serviceData,
            backgroundColor: ['#2563eb', '#64748b', '#e0e7ff', '#10b981', '#f59e42', '#e11d48'],
          }],
        },
        options: { responsive: true },
      });
      
      // Clean up chart on unmount
      return () => pieChart.destroy();
    }
  }, [activeTab, revenueData]);

  // --- Professions state and handlers ---
  useEffect(() => {
    localStorage.setItem('professions', JSON.stringify(professions));
  }, [professions]);
  const handleAddProfession = () => {
    if (newProfession.trim() && !professions.some(p => p.name === newProfession.trim())) {
      setProfessions([...professions, { name: newProfession.trim() }]);
      setNewProfession('');
    }
  };
  const handleRemoveProfession = (idx) => {
    if (professions.length > 1) {
      setProfessions(professions.filter((_, i) => i !== idx));
    }
  };

  // --- Week navigation and date columns ---
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const goToPrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // --- Assignments state and Supabase sync ---
  useEffect(() => {
    async function fetchAssignments() {
      setLoadingSchedule(true);
      const fromDate = format(days[0], 'yyyy-MM-dd');
      const toDate = format(days[6], 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('coach_schedule')
        .select('id, date, role, coach_id')
        .gte('date', fromDate)
        .lte('date', toDate);
      if (!error && data) {
        const map = {};
        data.forEach(row => {
          map[`${row.role}_${row.date}`] = row.coach_id;
        });
        setAssignments(map);
      }
      setLoadingSchedule(false);
    }
    fetchAssignments();
    // eslint-disable-next-line
  }, [weekStart, professions]);

  // Add at the top of OwnerDashboard function:
  useEffect(() => {
    async function fetchGymId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      setGymId(ownerProfile?.gym_id || null);
    }
    fetchGymId();
  }, []);

  // Update handleAssignCoach:
  async function handleAssignCoach(profession, date, coachId) {
    if (!gymId) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const { error } = await supabase.from('coach_schedule').upsert({
      gym_id: gymId,
      date: dateStr,
      role: profession,
      coach_id: coachId
    }, { onConflict: ['gym_id', 'date', 'role'] });
    if (!error) {
      setAssignments(prev => ({ ...prev, [`${profession}_${dateStr}`]: coachId }));
    }
    setModalState({ open: false, profession: '', date: null });
  }
  // Update handleRemoveCoach:
  async function handleRemoveCoach(profession, date) {
    if (!gymId) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    await supabase.from('coach_schedule').delete().match({
      gym_id: gymId,
      date: dateStr,
      role: profession
    });
    setAssignments(prev => {
      const copy = { ...prev };
      delete copy[`${profession}_${dateStr}`];
      return copy;
    });
  }

  // --- Stat Card Logic ---
  useEffect(() => {
    // Calculate active clients this week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const activeClients = clients.filter(c => {
      const checkins = c.checkins || [];
      return checkins.some(chk => {
        const d = new Date(chk.date);
        return d >= weekStart && d < weekEnd;
      });
    });
    setActiveClientsThisWeek(activeClients.length);

    // Calculate class fill rate
    let totalCapacity = 0, totalFilled = 0;
    allClasses.forEach(cls => {
      if (cls.capacity && cls.signups) {
        totalCapacity += cls.capacity;
        totalFilled += cls.signups.length;
      }
    });
    setClassFillRate(totalCapacity ? Math.round((totalFilled / totalCapacity) * 100) : 0);

    // Calculate avg check-ins per client
    const totalCheckins = clients.reduce((sum, c) => sum + ((c.checkins || []).length), 0);
    setAvgCheckinsPerClient(clients.length ? (totalCheckins / clients.length).toFixed(1) : 0);
  }, [clients, allClasses]);

  // Add these useEffect hooks to populate edit forms when modals are opened
  useEffect(() => {
    if (showEditClient) {
      const client = clients.find(c => c.user_id === showEditClient);
      if (client) {
        setEditClientForm({
          firstName: client.first_name,
          lastName: client.last_name,
          email: client.email,
          phone: client.phone || '',
          planId: client.payment_plan_id || ''
        });
      }
    }
  }, [showEditClient, clients]);

  useEffect(() => {
    if (showEditCoach) {
      const coach = coaches.find(c => c.user_id === showEditCoach);
      if (coach) {
        setEditCoachForm({
          firstName: coach.first_name,
          lastName: coach.last_name,
          email: coach.email,
          phone: coach.phone || '',
          style: coach.coach_profiles?.style || '',
          days: coach.coach_profiles?.days || [],
          salary: coach.coach_profiles?.salary || ''
        });
      }
    }
  }, [showEditCoach, coaches]);

  useEffect(() => {
    if (showEditPlan) {
      const plan = plans.find(p => p.id === showEditPlan);
      if (plan) {
        setPlanForm({
          name: plan.name,
          price: plan.price,
          duration: plan.duration,
          description: plan.description || '',
          category: plan.category || '',
          auto_renew: plan.auto_renew || false,
          access_type: plan.access_type || 'all',
          benefits: plan.benefits || '',
          status: plan.status || 'active'
        });
      }
    }
  }, [showEditPlan, plans]);

  // Helper: get classes for selected coach
  const coachClasses = selectedCoachId
    ? allClasses.filter(cls => cls.coach_id === selectedCoachId)
    : [];

  // Helper: get unique dates for calendar highlight
  const coachClassDates = Array.from(new Set(coachClasses.map(cls => cls.date)));

  // Helper: get classes for selected day
  const selectedDateStr = selectedCoachDate.toISOString().slice(0, 10);
  const classesForDay = coachClasses.filter(cls => cls.date === selectedDateStr);

  // Helper: get selected coach object
  const selectedCoach = coaches.find(c => c.user_id === selectedCoachId);

  // Helper: get enrolled count for a class (if signups available)
  const getEnrolledCount = (cls) => Array.isArray(cls.signups) ? cls.signups.length : (cls.enrolled || 0);

  // Helper: get color for class type/category
  const getClassColor = (cls) => {
    if (!cls.category) return '#2563eb';
    const map = {
      yoga: '#10b981',
      pilates: '#f59e42',
      hiit: '#e11d48',
      dance: '#a21caf',
      strength: '#2563eb',
      cardio: '#fbbf24',
      cycling: '#64748b',
      boxing: '#ef4444',
      other: '#64748b',
    };
    return map[cls.category.toLowerCase()] || '#2563eb';
  };

  // Calculate filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Filter by search query
      const matchesSearch = !clientSearchQuery || 
        client.first_name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) || 
        client.last_name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) || 
        client.email?.toLowerCase().includes(clientSearchQuery.toLowerCase());
      
      // Filter by plan
      const matchesPlan = !planFilter || client.payment_plan_id === planFilter;
      
      return matchesSearch && matchesPlan;
    });
  }, [clients, clientSearchQuery, planFilter]);
  
  // Calculate top clients, today's classes, and upcoming classes for dashboard
  const topClients = useMemo(() => {
    // Sort clients by attendance (would be calculated based on check-ins)
    return [...clients]
      .map(client => ({
        ...client,
        attendance: Math.floor(Math.random() * 20) // Placeholder - replace with actual attendance calculation
      }))
      .sort((a, b) => b.attendance - a.attendance)
      .slice(0, 5); // Get top 5 clients
  }, [clients]);
  
  const todaysClasses = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return allClasses.filter(cls => cls.date === today)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .slice(0, 4); // Get first 4 classes
  }, [allClasses]);
  
  const upcomingClasses = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return allClasses.filter(cls => cls.date > today || 
      (cls.date === today && cls.start_time > new Date().toTimeString().substring(0, 8)))
      .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
      .slice(0, 6); // Get next 6 classes
  }, [allClasses]);
  
  // Generate sample recent payments for Revenue section
  const recentPayments = useMemo(() => {
    if (!clients.length || !plans.length) return [];
    
    // Create sample payment data
    return Array(8).fill().map((_, i) => {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const plan = plans[Math.floor(Math.random() * plans.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      
      return {
        customer_name: `${client.first_name} ${client.last_name}`,
        date: date.toISOString(),
        amount: plan.price,
        plan: plan.name,
        status: Math.random() > 0.2 ? 'paid' : Math.random() > 0.5 ? 'pending' : 'failed'
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [clients, plans]);

  // Debug logging for component state
  useEffect(() => {
    console.log("OwnerDashboard rendering with state:", {
      activeTab,
      clients: clients.length,
      coaches: coaches.length,
      plans: plans.length,
      allClasses: allClasses.length,
      error
    });
  }, [activeTab, clients, coaches, plans, allClasses, error]);

  // Add handler for removing plan
  const handleRemovePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to remove this plan?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('payment_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      
      await fetchPlans();
    } catch (error) {
      console.error('Error removing plan:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add handler for payment form input
  const handlePaymentInput = (e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({ ...prev, [name]: value }));
  };

  // Add handler for submitting payment
  const handleAddPayment = async (e) => {
    e.preventDefault();
    setPaymentLoading(true);
    setPaymentMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerProfile, error: ownerError } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();

      if (ownerError) throw ownerError;

      const { error } = await supabase
        .from('payments')
        .insert({
          gym_id: ownerProfile.gym_id,
          user_id: paymentForm.userId,
          payment_plan_id: paymentForm.paymentPlanId || null,
          amount: parseFloat(paymentForm.amount),
          status: paymentForm.status,
          service_type: paymentForm.serviceType,
          payment_method: paymentForm.paymentMethod,
          payment_date: new Date().toISOString(),
          notes: paymentForm.notes
        });

      if (error) throw error;

      setPaymentMessage('Payment added successfully!');
      setTimeout(() => {
        setShowAddPayment(false);
        fetchPayments();
      }, 1500);
    } catch (error) {
      console.error('Error adding payment:', error);
      setPaymentMessage(`Error: ${error.message}`);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Add handler for product form input
  const handleProductInput = (e) => {
    const { name, value } = e.target;
    setProductForm(prev => ({ ...prev, [name]: value }));
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerProfile, error: ownerError } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();

      if (ownerError) throw ownerError;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('gym_id', ownerProfile.gym_id)
        .eq('status', 'active');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Add handler for submitting product sale
  const handleAddProductSale = async (e) => {
    e.preventDefault();
    setProductLoading(true);
    setProductMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerProfile, error: ownerError } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();

      if (ownerError) throw ownerError;

      const pricePerUnit = parseFloat(productForm.pricePerUnit);
      const quantity = parseInt(productForm.quantity);
      const discount = parseFloat(productForm.discount || 0);
      const totalPrice = (pricePerUnit * quantity) - discount;

      const { error } = await supabase
        .from('product_sales')
        .insert({
          gym_id: ownerProfile.gym_id,
          user_id: productForm.userId,
          product_id: productForm.productId,
          quantity: quantity,
          price_per_unit: pricePerUnit,
          total_price: totalPrice,
          discount: discount,
          payment_method: productForm.paymentMethod,
          payment_status: productForm.paymentStatus,
          notes: productForm.notes
        });

      if (error) throw error;

      setProductMessage('Product sale added successfully!');
      setTimeout(() => {
        setShowAddProductSale(false);
        fetchPayments();
      }, 1500);
    } catch (error) {
      console.error('Error adding product sale:', error);
      setProductMessage(`Error: ${error.message}`);
    } finally {
      setProductLoading(false);
    }
  };

  // Add handler for new product input
  const handleNewProductInput = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
  };

  // Fetch all products
  const fetchAllProducts = async () => {
    setProductsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerProfile, error: ownerError } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();

      if (ownerError) throw ownerError;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('gym_id', ownerProfile.gym_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProductsList(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  // Add a new product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setProductFormError('');
    setProductsLoading(true);

    try {
      if (!newProduct.name || !newProduct.price) {
        throw new Error('Name and price are required');
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerProfile, error: ownerError } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();

      if (ownerError) throw ownerError;

      const { error } = await supabase
        .from('products')
        .insert({
          gym_id: ownerProfile.gym_id,
          name: newProduct.name,
          description: newProduct.description,
          price: parseFloat(newProduct.price),
          cost: newProduct.cost ? parseFloat(newProduct.cost) : null,
          category: newProduct.category,
          inventory_count: parseInt(newProduct.inventory_count) || 0,
          status: 'active'
        });

      if (error) throw error;

      setNewProduct({
        name: '',
        description: '',
        price: '',
        cost: '',
        category: '',
        inventory_count: 0
      });

      fetchAllProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      setProductFormError(error.message);
    } finally {
      setProductsLoading(false);
    }
  };

  // Update product status (active/archived)
  const toggleProductStatus = async (productId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'archived' : 'active';
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', productId);

      if (error) throw error;
      fetchAllProducts();
    } catch (error) {
      console.error('Error updating product status:', error);
    }
  };

  // Initialize products when needed - adding back the hook that was removed
  useEffect(() => {
    // Always run this hook, but only fetch products when needed
    if (showAddProductSale) {
      fetchProducts();
    }
  }, [showAddProductSale]);

  // Use a single return statement with conditional rendering
    return (
    <>
      {/* Show error state */}
      {error ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: 'red' }}>{error}</p>
          <button 
            onClick={() => { setError(null); setActiveTab('dashboard'); }}
            style={{ padding: '0.5rem 1rem', marginTop: '1rem' }}
          >
            Try Again
          </button>
        </div>
      ) : isLoading && activeTab === 'dashboard' ? (
        /* Show loading state */
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Loading Dashboard...</h2>
        </div>
      ) : (
        /* Main dashboard UI */
    <div className="owner-dashboard-container">
      <nav className="owner-dashboard-nav">
            <div className="logo-container">
              <img src={logoMakincome} alt="Makincome Logo" className="logo" />
        </div>
          <div className="nav-links">
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''} 
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={activeTab === 'clients' ? 'active' : ''} 
            onClick={() => setActiveTab('clients')}
          >
            Clients
          </button>
          <button 
            className={activeTab === 'coaches' ? 'active' : ''} 
            onClick={() => setActiveTab('coaches')}
          >
            Coaches
          </button>
          <button 
            className={activeTab === 'plans' ? 'active' : ''} 
            onClick={() => setActiveTab('plans')}
          >
            Plans
          </button>
          <button 
            className={activeTab === 'revenue' ? 'active' : ''} 
            onClick={() => setActiveTab('revenue')}
          >
            Revenue
          </button>
            </div>
            <div className="user-dropdown" ref={userMenuRef}>
              <button className="dropdown-button" onClick={() => setShowUserMenu(!showUserMenu)}>
                <span style={{ marginRight: 8 }}>{ownerName || 'Owner'}</span>
                <span style={{ fontSize: 10 }}>▼</span>
              </button>
              {showUserMenu && (
                <div style={{ 
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  background: 'white',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  zIndex: 10,
                  width: 200
                }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 'bold' }}>{ownerName}</div>
                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Owner</div>
                  </div>
                  <div style={{ padding: '0.5rem' }}>
          <button 
                      style={{ 
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.75rem 1rem',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                      onClick={() => navigate('/settings')}
                    >
                      Settings
                    </button>
                    <button
                      style={{ 
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.75rem 1rem',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        color: '#ef4444'
                      }}
            onClick={async () => {
              await supabase.auth.signOut();
                        navigate('/');
            }}
          >
            Sign Out
          </button>
                  </div>
                </div>
              )}
        </div>
      </nav>
        <main className="owner-dashboard-main">
            {/* DASHBOARD SECTION */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-section">
                <h2>Dashboard</h2>
                <div className="dashboard-stats-grid">
                  <div className="dashboard-stat-card">
                    <div className="stat-value">{clients.length}</div>
                  <div className="stat-label">Total Clients</div>
                  </div>
                  <div className="dashboard-stat-card">
                    <div className="stat-value">{coaches.length}</div>
                    <div className="stat-label">Coaches</div>
                  </div>
                  <div className="dashboard-stat-card">
                    <div className="stat-value">{activeClientsThisWeek}</div>
                    <div className="stat-label">Active This Week</div>
                  </div>
                  <div className="dashboard-stat-card">
                    <div className="stat-value">{classFillRate}%</div>
                    <div className="stat-label">Class Fill Rate</div>
                  </div>
                </div>

            <div className="dashboard-section-flex">
              <div className="dashboard-panel">
                    <h3>Today's Classes</h3>
                    {todaysClasses.length === 0 ? (
                      <div className="empty-message">No classes scheduled for today</div>
                    ) : (
                      <div className="class-list">
                        {todaysClasses.map((cls, index) => (
                          <div key={cls.id || index} className="class-item">
                          <div className="class-header">
                            <div className="class-name">{cls.name}</div>
                            <div className="class-time">
                                {new Date(`2022-01-01T${cls.start_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
                          <div className="class-details">
                              <div>
                            Coach: {cls.coaches?.first_name} {cls.coaches?.last_name}
              </div>
                              <div>
                                {getEnrolledCount(cls)} / {cls.capacity} enrolled
                </div>
                    </div>
                  </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="dashboard-panel">
                    <h3>Top Clients</h3>
                    {topClients.length === 0 ? (
                      <div className="empty-message">No client data available</div>
                    ) : (
                      <div className="panel-scroll">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
                              <th style={{ textAlign: 'center', padding: '0.5rem' }}>Attendance</th>
                              <th style={{ textAlign: 'right', padding: '0.5rem' }}>Plan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topClients.map((client, index) => (
                              <tr key={client.user_id || index} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '0.5rem' }}>
                                  {client.first_name} {client.last_name}
                                </td>
                                <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                                  {client.attendance} classes
                                </td>
                                <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                                  {client.payment_plans?.name || 'No plan'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                </div>
                    )}
                </div>
                </div>
                
                <div className="dashboard-panel" style={{ marginTop: '1.5rem' }}>
                  <h3>Upcoming Classes</h3>
                  {upcomingClasses.length === 0 ? (
                    <div className="empty-message">No upcoming classes scheduled</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                  <tr>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Class</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Date</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Time</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Coach</th>
                            <th style={{ textAlign: 'center', padding: '0.75rem' }}>Capacity</th>
                    </tr>
                  </thead>
                  <tbody>
                          {upcomingClasses.map((cls, index) => (
                            <tr key={cls.id || index} style={{ 
                              borderBottom: '1px solid #eee',
                              background: index % 2 === 0 ? '#fff' : '#f9fafb'
                            }}>
                              <td style={{ padding: '0.75rem' }}>
                                <div style={{ 
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}>
                                  <div style={{
                                    width: '0.75rem',
                                    height: '0.75rem',
                                    borderRadius: '50%',
                                    background: getClassColor(cls)
                                  }} />
                                  {cls.name}
                                </div>
                              </td>
                              <td style={{ padding: '0.75rem' }}>
                                {new Date(cls.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </td>
                              <td style={{ padding: '0.75rem' }}>
                                {new Date(`2022-01-01T${cls.start_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td style={{ padding: '0.75rem' }}>
                                {cls.coaches?.first_name} {cls.coaches?.last_name}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                {getEnrolledCount(cls)} / {cls.capacity}
                      </td>
                        </tr>
                  ))}
                  </tbody>
                </table>
                    </div>
                  )}
                      </div>
                    </div>
                  )}

            {/* CLIENTS SECTION */}
            {activeTab === 'clients' && (
              <EnhancedClientsSection />
            )}

            {/* COACHES SECTION */}
            {activeTab === 'coaches' && (
              <CoachesPage />
            )}

            {/* PLANS SECTION */}
            {activeTab === 'plans' && (
              <PaymentPlans />
            )}

            {/* REVENUE SECTION */}
            {activeTab === 'revenue' && (
              <div className="dashboard-section revenue-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2>Revenue Analytics</h2>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      className="submit-btn"
                      onClick={() => setShowAddPayment(true)}
                    >
                      Add Payment
                    </button>
                    <button 
                      className="submit-btn"
                      style={{ backgroundColor: '#10b981' }}
                      onClick={() => setShowAddProductSale(true)}
                    >
                      Record Product Sale
                    </button>
                    <button 
                      className="submit-btn"
                      style={{ backgroundColor: '#6366f1' }}
                      onClick={() => {
                        setShowManageProducts(true);
                        fetchAllProducts();
                      }}
                    >
                      Manage Products
                    </button>
      </div>
                </div>
                
                {revenueLoading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    Loading revenue data...
                  </div>
                ) : (
                  <>
                    {/* Revenue Statistics in a single row */}
                    <div className="dashboard-stats-grid" style={{ 
                      gridTemplateColumns: 'repeat(4, 1fr)', 
                      marginBottom: '2rem' 
                    }}>
                      <div className="dashboard-stat-card">
                        <div className="stat-value">
                          {euro(revenueData.monthlyRevenue.reduce((sum, val) => sum + val, 0))}
                        </div>
                        <div className="stat-label">Last 6 Months</div>
                      </div>
                      <div className="dashboard-stat-card">
                        <div className="stat-value">
                          {euro(revenueData.monthlyRevenue[revenueData.monthlyRevenue.length - 1] || 0)}
                        </div>
                        <div className="stat-label">Current Month</div>
                      </div>
                      <div className="dashboard-stat-card">
                        <div className="stat-value">
                          {clients.length}
                        </div>
                        <div className="stat-label">Active Members</div>
                      </div>
                      <div className="dashboard-stat-card">
                        <div className="stat-value">
                          {euro(plans.reduce((sum, plan) => 
                            sum + plan.price * getClientCount(plan.id), 0)
      )}
    </div>
                        <div className="stat-label">Monthly Recurring</div>
                      </div>
                    </div>
                    
                    <div className="revenue-charts-grid">
                      <div className="revenue-chart-card">
                        <h4>Monthly Revenue</h4>
                        <div style={{ height: 250 }}>
                          <canvas ref={barChartRef}></canvas>
                        </div>
                      </div>
                      <div className="revenue-chart-card">
                        <h4>Revenue Trend</h4>
                        <div style={{ height: 250 }}>
                          <canvas ref={lineChartRef}></canvas>
                        </div>
                      </div>
                      <div className="revenue-chart-card">
                        <h4>Revenue by Service</h4>
                        <div style={{ height: 250 }}>
                          <canvas ref={pieChartRef}></canvas>
                        </div>
                      </div>
                    </div>
                    
                    {/* Recent Payments Table */}
                    <div style={{ marginTop: '2rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                        Recent Payments
                      </h3>
                      
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse', 
                          borderRadius: '8px',
                          overflow: 'hidden',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Customer</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Description</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {revenueData.recentPayments && revenueData.recentPayments.length > 0 ? (
                              revenueData.recentPayments.map((payment, idx) => (
                                <tr key={payment.id || idx} style={{ 
                                  background: idx % 2 === 0 ? '#fff' : '#f9fafb',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f9fafb'}>
                                  <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
                                    {new Date(payment.date).toLocaleDateString()}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
                                    {payment.customer}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
                                    {payment.description}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 600 }}>
                                    {euro(payment.amount)}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                                    <span style={{ 
                                      display: 'inline-block',
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      fontWeight: 500,
                                      background: payment.type === 'product' ? '#f0fdf4' : '#e0e7ff',
                                      color: payment.type === 'product' ? '#166534' : '#4f46e5'
                                    }}>
                                      {payment.type === 'product' ? 'Product' : 'Membership'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                                    <span style={{ 
                                      display: 'inline-block',
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      fontWeight: 500,
                                      background: payment.status === 'paid' ? '#dcfce7' : '#fee2e2',
                                      color: payment.status === 'paid' ? '#166534' : '#b91c1c'
                                    }}>
                                      {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1) || 'Unknown'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} style={{ textAlign: 'center' }}>No recent payments available.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </main>
        </div>
      )}
    </>
  );
}

export default OwnerDashboard; 