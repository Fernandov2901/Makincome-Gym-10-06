import React, { useState, useEffect, useRef } from 'react';
import supabase from '../supabaseClient';
import './OwnerDashboard.css';
import logoHandshake from '../assets/logo-handshake.png';
import logoMakincome from '../assets/logo-makincome-new.png';
import { Chart } from 'chart.js/auto';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// Helper for euro formatting
const euro = (value) => `€${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const OwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [coaches, setCoaches] = useState([]);
  const [newCoach, setNewCoach] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    style: '',
    days: [],
    salary: ''
  });
  const [coachMessage, setCoachMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddCoach, setShowAddCoach] = useState(false);

  // Client management state
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    planId: ''
  });
  const [clientMessage, setClientMessage] = useState('');
  const [clientLoading, setClientLoading] = useState(false);

  // Plan management state
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(null); // plan id or null
  const [planForm, setPlanForm] = useState({ name: '', price: '', duration: '', description: '', category: '', auto_renew: false, access_type: 'all', benefits: '', status: 'active' });
  const [planMessage, setPlanMessage] = useState('');
  const [planLoading, setPlanLoading] = useState(false);
  const [showArchivedPlans, setShowArchivedPlans] = useState(false);
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('desc');

  // New state for owner name
  const [ownerName, setOwnerName] = useState('');

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const revenueChartRef = useRef(null);
  const revenueChartInstance = useRef(null);
  const revenueYearChartRef = useRef(null);
  const revenueYearChartInstance = useRef(null);

  // Classes calendar state
  const [classDates, setClassDates] = useState([]); // Dates with classes
  const [allClasses, setAllClasses] = useState([]); // All class objects
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showBatchAddClass, setShowBatchAddClass] = useState(false);
  const [classForm, setClassForm] = useState({
    name: '',
    description: '',
    start_time: '',
    coach_id: '',
    capacity: '',
    duration: ''
  });
  const [batchClassForm, setBatchClassForm] = useState({
    name: '',
    description: '',
    start_time: '',
    coach_id: '',
    capacity: '',
    duration: '',
    start_date: '',
    end_date: '',
    days_of_week: [],
    frequency: 'weekly' // weekly or daily
  });
  const [classMessage, setClassMessage] = useState('');

  // State for editing a client
  const [showEditClient, setShowEditClient] = useState(null); // user_id or null
  const [editClientForm, setEditClientForm] = useState({ firstName: '', lastName: '', email: '', phone: '', planId: '' });
  const [editClientLoading, setEditClientLoading] = useState(false);
  const [editClientMessage, setEditClientMessage] = useState('');

  // State for editing a coach
  const [showEditCoach, setShowEditCoach] = useState(null); // user_id or null
  const [editCoachForm, setEditCoachForm] = useState({ firstName: '', lastName: '', email: '', phone: '', style: '', days: [], salary: '' });
  const [editCoachLoading, setEditCoachLoading] = useState(false);
  const [editCoachMessage, setEditCoachMessage] = useState('');

  // Add new state for editing classes
  const [showEditClass, setShowEditClass] = useState(null);
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

  // Add handler for updating class
  const handleUpdateClass = async (e) => {
    e.preventDefault();
    setLoading(true);
    setClassMessage('');

    try {
      const [datePart, timePart] = editClassForm.start_time.split('T');
      const [hours, minutes] = timePart.split(':');
      
      const date = datePart;
      const start_time = `${hours}:${minutes}:00`;
      
      const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
      const endMinutes = startMinutes + parseInt(editClassForm.duration);
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const end_time = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;

      const { error } = await supabase
        .from('classes')
        .update({
          name: editClassForm.name,
          description: editClassForm.description,
          date,
          start_time,
          end_time,
          coach_id: editClassForm.coach_id,
          capacity: parseInt(editClassForm.capacity)
        })
        .eq('id', showEditClass);

      if (error) throw error;

      setClassMessage('Class updated successfully!');
      setShowEditClass(null);
      fetchAllClasses();
    } catch (error) {
      setClassMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add handler for removing class
  const handleRemoveClass = async (classId) => {
    if (!window.confirm('Are you sure you want to remove this class?')) return;
    
    setLoading(true);
    setClassMessage('');

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;

      setClassMessage('Class removed successfully!');
      fetchAllClasses();
    } catch (error) {
      setClassMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add handler for editing class
  const handleEditClass = (cls) => {
    setShowEditClass(cls.id);
    setEditClassForm({
      name: cls.name,
      description: cls.description || '',
      start_time: `${cls.date}T${cls.start_time}`,
      coach_id: cls.coach_id,
      capacity: cls.capacity,
      duration: cls.end_time ? 
        ((new Date('1970-01-01T' + cls.end_time) - new Date('1970-01-01T' + cls.start_time)) / 60000).toString() : 
        '60'
    });
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
    if (activeTab === 'revenue' && chartRef.current && plans.length > 0) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      const ctx = chartRef.current.getContext('2d');
      const planData = plans.map(plan => ({
        label: plan.name,
        value: getClientCount(plan.id)
      }));
      // Only show chart if there is at least one value > 0
      if (planData.some(p => p.value > 0)) {
        chartInstance.current = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: planData.map(plan => plan.label),
            datasets: [{
              data: planData.map(plan => plan.value),
              backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
            }]
          },
          options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom' }
            }
          }
        });
      } else {
        ctx.clearRect(0, 0, 300, 220);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText('No data to display', 150, 110);
      }
    }

    if (activeTab === 'revenue' && revenueChartRef.current && clients.length > 0 && plans.length > 0) {
      if (revenueChartInstance.current) {
        revenueChartInstance.current.destroy();
      }
      const ctx = revenueChartRef.current.getContext('2d');
      
      // Get last 6 months of data
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return d;
      }).reverse();
      
      const labels = months.map(d => d.toLocaleString('default', { month: 'short' }));
      const revenueData = months.map(month => {
        return plans.reduce((sum, plan) => {
          const count = clients.filter(c =>
            c.payment_plan_id === plan.id &&
            (!c.plan_end_date || new Date(c.plan_end_date) >= month) &&
            (!c.plan_start_date || new Date(c.plan_start_date) <= month)
          ).length;
          return sum + plan.price * count;
        }, 0);
      });
      
      const expenseData = months.map(() => getMonthlyExpenses());
      const profitData = revenueData.map((rev, i) => rev - expenseData[i]);

      revenueChartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Revenue',
              data: revenueData,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Expenses',
              data: expenseData,
              borderColor: '#f87171',
              backgroundColor: 'rgba(248,113,113,0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Net Profit',
              data: profitData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16,185,129,0.1)',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: '#18181b',
                font: { size: 14, weight: 'bold' }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${euro(context.parsed.y)}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                color: '#18181b',
                font: { size: 14, weight: 'bold' },
                callback: value => euro(value)
              },
              grid: { color: '#e5e7eb', drawBorder: false }
            },
            x: {
              ticks: { color: '#18181b', font: { size: 14, weight: 'bold' } },
              grid: { color: '#e5e7eb', drawBorder: false }
            }
          }
        }
      });
    }
  }, [activeTab, plans, clients]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      if (revenueChartInstance.current) {
        revenueChartInstance.current.destroy();
      }
    };
  }, []);

  // Fetch all classes for the gym and count per coach
  const fetchCoachClassCounts = async (gymId, coachList) => {
    const { data: classes, error } = await supabase
      .from('classes')
      .select('coach_id')
      .eq('gym_id', gymId);
    if (error) return coachList;
    const classCountMap = {};
    classes.forEach(cls => {
      classCountMap[cls.coach_id] = (classCountMap[cls.coach_id] || 0) + 1;
    });
    return coachList.map(coach => ({ ...coach, total_classes: classCountMap[coach.user_id] || 0 }));
  };

  const fetchCoaches = async () => {
    setLoading(true);
    setCoachMessage('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Get owner's gym_id
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      if (!ownerProfile) throw new Error('Owner profile not found');
      // Get all coaches for this gym
      const { data: coachList, error } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, email, phone, style_of_training, available_days, salary')
        .eq('gym_id', ownerProfile.gym_id)
        .eq('user_type', 'coach');
      if (error) throw error;
      // Fetch class counts and merge
      const coachesWithCounts = await fetchCoachClassCounts(ownerProfile.gym_id, coachList || []);
      setCoaches(coachesWithCounts);
    } catch (err) {
      setCoachMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    setPlanLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      if (!ownerProfile) throw new Error('Owner profile not found');
      const { data: planList, error } = await supabase
        .from('payment_plans')
        .select('id, name, price, duration, description')
        .eq('gym_id', ownerProfile.gym_id);
      if (error) throw error;
      setPlans(planList || []);
    } catch (err) {
      setPlanMessage(err.message);
    } finally {
      setPlanLoading(false);
    }
  };

  const fetchClients = async () => {
    setClientLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      if (!ownerProfile) throw new Error('Owner profile not found');
      const { data: clientList, error } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, email, phone, payment_plan_id, plan_start_date, plan_end_date')
        .eq('gym_id', ownerProfile.gym_id)
        .eq('user_type', 'user');
      if (error) throw error;
      setClients(clientList || []);
    } catch (err) {
      setClientMessage(err.message);
    } finally {
      setClientLoading(false);
    }
  };

  const handleCoachInput = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'days') {
      setNewCoach(prev => {
        if (checked) {
          return { ...prev, days: [...prev.days, value] };
        } else {
          return { ...prev, days: prev.days.filter(day => day !== value) };
        }
      });
    } else {
      setNewCoach(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddCoach = async (e) => {
    e.preventDefault();
    setCoachMessage('');
    setLoading(true);
    try {
      // Create coach auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: newCoach.email,
        password: Math.random().toString(36).slice(-10), // random password, should be reset by coach
        options: { data: { user_type: 'coach' } }
      });
      if (signUpError) throw signUpError;
      // Get owner's gym_id
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      if (!ownerProfile) throw new Error('Owner profile not found');
      // Insert coach profile
      const gymId = ownerProfile.gym_id === '' || ownerProfile.gym_id === 'null' ? null : ownerProfile.gym_id;
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert([
          {
            user_id: signUpData.user.id,
            first_name: newCoach.firstName,
            last_name: newCoach.lastName,
            email: newCoach.email,
            phone: newCoach.phone,
            user_type: 'coach',
            gym_id: gymId,
            style_of_training: newCoach.style,
            available_days: newCoach.days,
            salary: newCoach.salary === '' ? null : parseFloat(newCoach.salary),
            payment_plan_id: '5fe154c2-8a59-4215-b440-8e761a1a1af5'
          }
        ], { onConflict: ['user_id'] });
      if (profileError) throw profileError;
      setCoachMessage('Coach added successfully!');
      setNewCoach({ email: '', firstName: '', lastName: '', phone: '', style: '', days: [], salary: '' });
      fetchCoaches();
    } catch (err) {
      setCoachMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoach = async (userId) => {
    setCoachMessage('');
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
      setCoachMessage('Coach removed.');
      fetchCoaches();
    } catch (err) {
      setCoachMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClientInput = (e) => {
    const { name, value } = e.target;
    setNewClient(prev => ({ ...prev, [name]: value }));
  };

  // Helper to add months to a date
  function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  const handleAddClient = async (e) => {
    e.preventDefault();
    setClientMessage('');
    setClientLoading(true);
    try {
      // Create client auth user with default password
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: newClient.email,
        password: "1234567890", // Use default password
        options: { data: { user_type: 'user' } }
      });
      if (signUpError) throw signUpError;
      // Get owner's gym_id
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      if (!ownerProfile) throw new Error('Owner profile not found');
      // Insert client profile
      const gymId = ownerProfile.gym_id === '' || ownerProfile.gym_id === 'null' ? null : ownerProfile.gym_id;
      const planId = newClient.planId === '' || newClient.planId === 'null' ? null : newClient.planId;
      const plan = plans.find(p => p.id === planId);
      const planStartDate = new Date().toISOString();
      const planEndDate = plan && plan.duration ? addMonths(new Date(), plan.duration).toISOString() : null;
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert([
          {
            user_id: signUpData.user.id,
            first_name: newClient.firstName,
            last_name: newClient.lastName,
            email: newClient.email,
            phone: newClient.phone,
            user_type: 'user',
            gym_id: gymId,
            payment_plan_id: planId,
            plan_start_date: planStartDate,
            plan_end_date: planEndDate
          }
        ], { onConflict: ['user_id'] });
      if (profileError) throw profileError;
      setClientMessage('Client added successfully!');
      setNewClient({ email: '', firstName: '', lastName: '', phone: '', planId: '' });
      setShowAddClient(false);
      fetchClients();
    } catch (err) {
      setClientMessage(err.message);
    } finally {
      setClientLoading(false);
    }
  };

  const handleRemoveClient = async (userId) => {
    setClientMessage('');
    setClientLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
      setClientMessage('Client removed.');
      fetchClients();
    } catch (err) {
      setClientMessage(err.message);
    } finally {
      setClientLoading(false);
    }
  };

  const handlePlanInput = (e) => {
    const { name, value } = e.target;
    setPlanForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPlan = async (e) => {
    e.preventDefault();
    setPlanMessage('');
    setPlanLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      if (!ownerProfile) throw new Error('Owner profile not found');
      const gymId = (!ownerProfile.gym_id || ownerProfile.gym_id === '' || ownerProfile.gym_id === 'null') ? null : ownerProfile.gym_id;
      if (!gymId) throw new Error('Your gym is not set up correctly. Please contact support.');
      const { error } = await supabase
        .from('payment_plans')
        .insert([
          {
            gym_id: gymId,
            name: planForm.name,
            price: parseFloat(planForm.price),
            duration: parseInt(planForm.duration),
            description: planForm.description
          }
        ]);
      if (error) throw error;
      setPlanMessage('Plan added successfully!');
      setPlanForm({ name: '', price: '', duration: '', description: '' });
      setShowAddPlan(false);
      fetchPlans();
    } catch (err) {
      setPlanMessage(err.message);
    } finally {
      setPlanLoading(false);
    }
  };

  const handleEditPlan = (plan) => {
    setShowEditPlan(plan.id);
    setPlanForm({
      name: plan.name,
      price: plan.price,
      duration: plan.duration,
      description: plan.description || ''
    });
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    setPlanMessage('');
    setPlanLoading(true);
    try {
      const { error } = await supabase
        .from('payment_plans')
        .update({
          name: planForm.name,
          price: parseFloat(planForm.price),
          duration: parseInt(planForm.duration),
          description: planForm.description
        })
        .eq('id', showEditPlan);
      if (error) throw error;
      setPlanMessage('Plan updated successfully!');
      setShowEditPlan(null);
      setPlanForm({ name: '', price: '', duration: '', description: '' });
      fetchPlans();
    } catch (err) {
      setPlanMessage(err.message);
    } finally {
      setPlanLoading(false);
    }
  };

  const handleRemovePlan = async (planId) => {
    setPlanMessage('');
    setPlanLoading(true);
    try {
      const { error } = await supabase
        .from('payment_plans')
        .delete()
        .eq('id', planId);
      if (error) throw error;
      setPlanMessage('Plan removed.');
      fetchPlans();
    } catch (err) {
      setPlanMessage(err.message);
    } finally {
      setPlanLoading(false);
    }
  };

  // Helper to get plan info for a client
  const getPlanInfo = (planId) => plans.find(p => p.id === planId);
  // getExpectedRevenue: show current monthly revenue for this plan
  const getExpectedRevenue = (plan, asEuro = false) => {
    if (!plan) return '-';
    const now = new Date();
    const count = clients.filter(c => c.payment_plan_id === plan.id && (!c.plan_end_date || new Date(c.plan_end_date) >= now) && (!c.plan_start_date || new Date(c.plan_start_date) <= now)).length;
    const value = plan.price * count;
    return asEuro ? euro(value) : value;
  };
  // getClientCount: only count clients whose plan is active now
  const getClientCount = (planId) => {
    const now = new Date();
    return clients.filter(c => c.payment_plan_id === planId && (!c.plan_end_date || new Date(c.plan_end_date) >= now) && (!c.plan_start_date || new Date(c.plan_start_date) <= now)).length;
  };
  // getMonthlyRevenue: for each month, sum plan.price for each client active in that month
  function getMonthlyRevenue(year) {
    const monthly = Array(12).fill(0);
    const today = new Date();
    for (let m = 0; m < 12; m++) {
      plans.forEach(plan => {
        let refDate;
        if (year === today.getFullYear() && m === today.getMonth()) {
          // For current month, use today
          refDate = today;
        } else {
          // For other months, use the 1st of the month
          refDate = new Date(year, m, 1);
        }
        const count = clients.filter(c =>
          c.payment_plan_id === plan.id &&
          (!c.plan_end_date || new Date(c.plan_end_date) >= refDate) &&
          (!c.plan_start_date || new Date(c.plan_start_date) <= refDate)
        ).length;
        monthly[m] += plan.price * count;
      });
    }
    return monthly;
  }

  // Fetch all classes for the gym (for calendar)
  const fetchAllClasses = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      if (!ownerProfile) throw new Error('Owner profile not found');
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, description, date, start_time, end_time, coach_id, created_at')
        .eq('gym_id', ownerProfile.gym_id);
      if (error) throw error;
      setAllClasses(classes || []);
      // Extract unique dates (YYYY-MM-DD) from class date
      const dates = Array.from(new Set((classes || []).map(cls => cls.date)));
      setClassDates(dates);
    } catch (err) {
      setCoachMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'classes') fetchAllClasses();
  }, [activeTab]);

  const handleClassInput = (e) => {
    const { name, value } = e.target;
    setClassForm(prev => ({ ...prev, [name]: value }));
  };

  // Helper to extract time from datetime-local input
  function extractTime(datetimeStr) {
    return datetimeStr.split('T')[1] || '';
  }

  // Helper to add minutes to a time string (HH:mm or HH:mm:ss)
  function addMinutesToTime(timeStr, minutesToAdd) {
    const [h, m] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(h));
    date.setMinutes(parseInt(m) + parseInt(minutesToAdd));
    return date.toTimeString().slice(0, 5); // HH:mm
  }

  const handleAddClass = async (e) => {
    e.preventDefault();
    setLoading(true);
    setClassMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Gym profile not found');

      // Parse the datetime-local input
      const [datePart, timePart] = classForm.start_time.split('T');
      const [hours, minutes] = timePart.split(':');
      
      // Create date string in YYYY-MM-DD format
      const date = datePart;
      
      // Create time string in HH:mm:ss format
      const start_time = `${hours}:${minutes}:00`;
      
      // Calculate end time
      const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
      const endMinutes = startMinutes + parseInt(classForm.duration);
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const end_time = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;

      const { error } = await supabase
        .from('classes')
        .insert([
          {
            name: classForm.name,
            description: classForm.description,
            date,
            start_time,
            end_time,
            coach_id: classForm.coach_id,
            capacity: parseInt(classForm.capacity),
            gym_id: profile.gym_id
          }
        ]);

      if (error) throw error;

      setClassMessage('Class added successfully!');
      setClassForm({
        name: '',
        description: '',
        start_time: '',
        coach_id: '',
        capacity: '',
        duration: ''
      });
      setShowAddClass(false);
      fetchAllClasses();
    } catch (error) {
      setClassMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get expected revenue per month for the year
  function getMonthlyRevenue(year) {
    const monthly = Array(12).fill(0);
    const today = new Date();
    for (let m = 0; m < 12; m++) {
      plans.forEach(plan => {
        let refDate;
        if (year === today.getFullYear() && m === today.getMonth()) {
          // For current month, use today
          refDate = today;
        } else {
          // For other months, use the 1st of the month
          refDate = new Date(year, m, 1);
        }
        const count = clients.filter(c =>
          c.payment_plan_id === plan.id &&
          (!c.plan_end_date || new Date(c.plan_end_date) >= refDate) &&
          (!c.plan_start_date || new Date(c.plan_start_date) <= refDate)
        ).length;
        monthly[m] += plan.price * count;
      });
    }
    return monthly;
  }

  // Helper for 3-month moving average
  function movingAverage(data, windowSize = 3) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i - windowSize + 1; j <= i; j++) {
        if (j >= 0) {
          sum += data[j];
          count++;
        }
      }
      result.push(count > 0 ? sum / count : null);
    }
    return result;
  }

  useEffect(() => {
    // Render yearly revenue chart
    if (revenueYearChartRef.current) {
      console.log('Chart debug:', {
        canvas: revenueYearChartRef.current,
        plans,
        clients,
        plansLength: plans.length,
        clientsLength: clients.length
      });
      if (revenueYearChartInstance.current) revenueYearChartInstance.current.destroy();
      if (plans.length > 0 && clients.length > 0) {
        const ctx = revenueYearChartRef.current.getContext('2d');
        const year = new Date().getFullYear();
        const monthly = getMonthlyRevenue(year);
        const ma = movingAverage(monthly, 3);
        console.log('Rendering revenue chart:', { monthly, movingAverage: ma });
        revenueYearChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: [
              'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ],
            datasets: [
              {
                label: 'Expected Revenue',
                data: monthly,
                backgroundColor: '#18181b',
                borderRadius: 8
              },
              {
                label: '3-Month Moving Avg',
                data: ma,
                type: 'line',
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.08)',
                borderWidth: 3,
                pointRadius: 0,
                fill: false,
                tension: 0.2
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true, position: 'top', labels: { color: '#18181b', font: { size: 15, weight: 'bold' } } },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return euro(context.parsed.y);
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  color: '#18181b',
                  font: { size: 14, weight: 'bold' },
                  callback: value => euro(value)
                },
                grid: { color: '#e5e7eb', drawBorder: false }
              },
              x: {
                ticks: { color: '#18181b', font: { size: 14, weight: 'bold' } },
                grid: { color: '#e5e7eb', drawBorder: false }
              }
            }
          }
        });
      } else {
        // No data: show fallback message
        const ctx = revenueYearChartRef.current.getContext('2d');
        ctx.clearRect(0, 0, 900, 300);
        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText('Not enough data to display chart', 450, 150);
      }
    }
  }, [plans, clients]);

  const handleEditClient = (client) => {
    setShowEditClient(client.user_id);
    setEditClientForm({
      firstName: client.first_name || '',
      lastName: client.last_name || '',
      email: client.email || '',
      phone: client.phone || '',
      planId: client.payment_plan_id || ''
    });
    setEditClientMessage('');
  };

  const handleEditClientInput = (e) => {
    const { name, value } = e.target;
    setEditClientForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    setEditClientLoading(true);
    setEditClientMessage('');
    try {
      // Find the new plan
      const plan = plans.find(p => p.id === editClientForm.planId);
      // Use the existing plan_start_date if available, otherwise today
      const client = clients.find(c => c.user_id === showEditClient);
      const planStartDate = client && client.plan_start_date ? client.plan_start_date : new Date().toISOString();
      // Calculate new plan_end_date
      const planEndDate = plan && plan.duration ? addMonths(new Date(planStartDate), plan.duration).toISOString() : null;
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: editClientForm.firstName,
          last_name: editClientForm.lastName,
          email: editClientForm.email,
          phone: editClientForm.phone,
          payment_plan_id: editClientForm.planId,
          plan_start_date: planStartDate,
          plan_end_date: planEndDate
        })
        .eq('user_id', showEditClient);
      if (error) throw error;
      setEditClientMessage('Client updated successfully!');
      setShowEditClient(null);
      fetchClients();
    } catch (err) {
      setEditClientMessage(err.message);
    } finally {
      setEditClientLoading(false);
    }
  };

  const handleEditCoach = (coach) => {
    setShowEditCoach(coach.user_id);
    setEditCoachForm({
      firstName: coach.first_name || '',
      lastName: coach.last_name || '',
      email: coach.email || '',
      phone: coach.phone || '',
      style: coach.style_of_training || '',
      days: Array.isArray(coach.available_days) ? coach.available_days : [],
      salary: coach.salary || ''
    });
    setEditCoachMessage('');
  };

  const handleEditCoachInput = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'days') {
      setEditCoachForm(prev => {
        if (checked) {
          return { ...prev, days: [...prev.days, value] };
        } else {
          return { ...prev, days: prev.days.filter(day => day !== value) };
        }
      });
    } else {
      setEditCoachForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdateCoach = async (e) => {
    e.preventDefault();
    setEditCoachLoading(true);
    setEditCoachMessage('');
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: editCoachForm.firstName,
          last_name: editCoachForm.lastName,
          email: editCoachForm.email,
          phone: editCoachForm.phone,
          style_of_training: editCoachForm.style,
          available_days: editCoachForm.days,
          salary: editCoachForm.salary === '' ? null : parseFloat(editCoachForm.salary)
        })
        .eq('user_id', showEditCoach);
      if (error) throw error;
      setEditCoachMessage('Coach updated successfully!');
      setShowEditCoach(null);
      fetchCoaches();
    } catch (err) {
      setEditCoachMessage(err.message);
    } finally {
      setEditCoachLoading(false);
    }
  };

  // Add sign out handler
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload(); // Or redirect to login page if you have routing
  };

  const handleBatchClassInput = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'days_of_week') {
      setBatchClassForm(prev => {
        if (checked) {
          return { ...prev, days_of_week: [...prev.days_of_week, value] };
        } else {
          return { ...prev, days_of_week: prev.days_of_week.filter(day => day !== value) };
        }
      });
    } else {
      setBatchClassForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddBatchClasses = async (e) => {
    e.preventDefault();
    setLoading(true);
    setClassMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Gym profile not found');

      const startDate = new Date(batchClassForm.start_date);
      const endDate = new Date(batchClassForm.end_date);
      const [hours, minutes] = batchClassForm.start_time.split(':');
      
      // Create classes for each day in the date range
      const classesToCreate = [];
      let currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
        
        if (batchClassForm.days_of_week.includes(dayOfWeek)) {
          const date = currentDate.toISOString().split('T')[0];
          const start_time = `${hours}:${minutes}:00`;
          
          // Calculate end time
          const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
          const endMinutes = startMinutes + parseInt(batchClassForm.duration);
          const endHours = Math.floor(endMinutes / 60);
          const endMins = endMinutes % 60;
          const end_time = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;

          classesToCreate.push({
            name: batchClassForm.name,
            description: batchClassForm.description,
            date,
            start_time,
            end_time,
            coach_id: batchClassForm.coach_id,
            capacity: parseInt(batchClassForm.capacity),
            gym_id: profile.gym_id
          });
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (classesToCreate.length === 0) {
        throw new Error('No classes to create. Please check your date range and selected days.');
      }

      const { error } = await supabase
        .from('classes')
        .insert(classesToCreate);

      if (error) throw error;

      setClassMessage(`Successfully created ${classesToCreate.length} classes!`);
      setBatchClassForm({
        name: '',
        description: '',
        start_time: '',
        coach_id: '',
        capacity: '',
        duration: '',
        start_date: '',
        end_date: '',
        days_of_week: [],
        frequency: 'weekly'
      });
      setShowBatchAddClass(false);
      fetchAllClasses();
    } catch (error) {
      setClassMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add a helper to check if a date is today
  function isToday(date) {
    if (!date) return false;
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  // Add state for showing class signups modal
  const [showSignupsModal, setShowSignupsModal] = useState(false);
  const [signupsLoading, setSignupsLoading] = useState(false);
  const [signupsList, setSignupsList] = useState([]);
  const [signupsClass, setSignupsClass] = useState(null);
  const [signupsCapacity, setSignupsCapacity] = useState(null);
  const [signupsCount, setSignupsCount] = useState(0);

  // Helper to get number of signups for a class
  const getClassSignupCount = async (classId) => {
    const { count } = await supabase
      .from('class_registrations')
      .select('user_id', { count: 'exact', head: true })
      .eq('class_id', classId);
    return count || 0;
  };

  // Fetch users signed up for a class
  const fetchClassSignups = async (classId) => {
    setSignupsLoading(true);
    setSignupsList([]);
    setSignupsClass(classId);
    setShowSignupsModal(true);
    setSignupsCapacity(null);
    setSignupsCount(0);
    try {
      // Fetch signups
      const { data, error } = await supabase
        .from('class_registrations')
        .select('user_id, user:user_profiles(first_name, last_name, email)')
        .eq('class_id', classId);
      if (error) throw error;
      setSignupsList(data || []);
      setSignupsCount((data || []).length);
      // Fetch class capacity
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('capacity')
        .eq('id', classId)
        .single();
      if (!classError && classData) setSignupsCapacity(classData.capacity);
    } catch (err) {
      setSignupsList([]);
    } finally {
      setSignupsLoading(false);
    }
  };

  // Helper: months between two dates
  function monthsBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    if (d2.getDate() > d1.getDate()) months++;
    return Math.max(0, months);
  }
  // Helper: total future expected revenue
  function getTotalFutureExpectedRevenue() {
    const now = new Date();
    let total = 0;
    clients.forEach(c => {
      const plan = plans.find(p => p.id === c.payment_plan_id);
      if (!plan) return;
      const start = c.plan_start_date ? new Date(c.plan_start_date) : null;
      const end = c.plan_end_date ? new Date(c.plan_end_date) : null;
      if (!start || (end && end < now)) return; // skip expired
      const from = now > start ? now : start;
      const to = end || new Date(from.getFullYear() + 10, from.getMonth(), from.getDate()); // 10 years if no end
      const months = monthsBetween(from, to);
      total += months * plan.price;
    });
    return euro(total);
  }

  // Helper: yearly expected revenue per plan
  const getYearlyExpectedRevenue = (plan) => {
    if (!plan) return '-';
    const now = new Date();
    const months = Math.min(plan.duration, 12);
    const count = clients.filter(c => c.payment_plan_id === plan.id && (!c.plan_end_date || new Date(c.plan_end_date) >= now) && (!c.plan_start_date || new Date(c.plan_start_date) <= now)).length;
    const value = plan.price * months * count;
    return euro(value);
  };

  // Helper: revenue for the current month
  function getCurrentMonthRevenue() {
    const now = new Date();
    return euro(
      plans.reduce((sum, plan) => {
        const count = clients.filter(c => c.payment_plan_id === plan.id && (!c.plan_end_date || new Date(c.plan_end_date) >= now) && (!c.plan_start_date || new Date(c.plan_start_date) <= now)).length;
        return sum + plan.price * count;
      }, 0)
    );
  }

  // Helper: total coach salary for the current month
  function getCurrentMonthCoachSalary() {
    // If salary is per month, sum all coach salaries
    return euro(coaches.reduce((sum, c) => sum + (c.salary ? Number(c.salary) : 0), 0));
  }
  // Helper: net revenue for the current month
  function getCurrentMonthNetRevenue() {
    // Net = revenue this month - coach salary this month
    const revenue = plans.reduce((sum, plan) => {
      const now = new Date();
      const count = clients.filter(c => c.payment_plan_id === plan.id && (!c.plan_end_date || new Date(c.plan_end_date) >= now) && (!c.plan_start_date || new Date(c.plan_start_date) <= now)).length;
      return sum + plan.price * count;
    }, 0);
    const coachSalary = coaches.reduce((sum, c) => sum + (c.salary ? Number(c.salary) : 0), 0);
    return euro(revenue - coachSalary);
  }

  // Add state for class management panel
  const [showClassModal, setShowClassModal] = useState(false);
  const [classModalMode, setClassModalMode] = useState('add'); // 'add' or 'edit'
  const [classModalData, setClassModalData] = useState({
    id: null,
    name: '',
    type: '',
    date: '',
    time: '',
    coach_id: '',
    capacity: ''
  });
  const classTypes = ['CrossFit', 'Powerlift', 'Yoga', 'HIIT', 'Cardio', 'Other'];

  function openAddClassModal() {
    setClassModalMode('add');
    setClassModalData({ id: null, name: '', type: '', date: '', time: '', coach_id: '', capacity: '' });
    setShowClassModal(true);
  }
  function openEditClassModal(cls) {
    setClassModalMode('edit');
    setClassModalData({
      id: cls.id,
      name: cls.name,
      type: cls.type || '',
      date: cls.date,
      time: cls.start_time ? cls.start_time.slice(0,5) : '',
      coach_id: cls.coach_id,
      capacity: cls.capacity
    });
    setShowClassModal(true);
  }
  function closeClassModal() {
    setShowClassModal(false);
  }
  async function handleClassModalSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (classModalMode === 'add') {
        // Add class
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('gym_id')
          .eq('user_id', user.id)
          .single();
        if (!profile) throw new Error('Gym profile not found');
        const date = classModalData.date;
        const start_time = classModalData.time + ':00';
        await supabase.from('classes').insert([
          {
            name: classModalData.type,
            type: classModalData.type,
            date,
            start_time,
            end_time: null,
            coach_id: classModalData.coach_id,
            capacity: parseInt(classModalData.capacity),
            gym_id: profile.gym_id
          }
        ]);
      } else if (classModalMode === 'edit') {
        // Edit class
        const date = classModalData.date;
        const start_time = classModalData.time + ':00';
        await supabase.from('classes').update({
          name: classModalData.type,
          type: classModalData.type,
          date,
          start_time,
          coach_id: classModalData.coach_id,
          capacity: parseInt(classModalData.capacity)
        }).eq('id', classModalData.id);
      }
      setShowClassModal(false);
      fetchAllClasses();
    } catch (err) {
      setClassMessage(err.message);
    } finally {
      setLoading(false);
    }
  }
  async function handleCancelClass(cls) {
    if (!window.confirm('Cancel this class?')) return;
    setLoading(true);
    try {
      await supabase.from('classes').delete().eq('id', cls.id);
      fetchAllClasses();
    } catch (err) {
      setClassMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Leaderboard state
  const [leaderboardMode, setLeaderboardMode] = useState('attendance'); // 'attendance' or 'prs'
  // Dummy attendance and PRs data (replace with real data if available)
  const attendanceMap = Object.fromEntries(clients.map(c => [c.user_id, Math.floor(Math.random() * 20)]));
  const prsMap = Object.fromEntries(clients.map(c => [c.user_id, Math.floor(Math.random() * 200) + 50]));
  const leaderboardList = clients
    .map(c => ({
      ...c,
      points: leaderboardMode === 'attendance' ? attendanceMap[c.user_id] : prsMap[c.user_id]
    }))
    .sort((a, b) => b.points - a.points);
  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

  // Add new helper functions for revenue metrics
  const calculateMRR = (clients, plans) => {
    const now = new Date();
    return clients.reduce((sum, client) => {
      const plan = plans.find(p => p.id === client.payment_plan_id);
      if (plan && (!client.plan_end_date || new Date(client.plan_end_date) >= now)) {
        return sum + plan.price;
      }
      return sum;
    }, 0);
  };

  const calculateARPU = (clients, plans) => {
    const mrr = calculateMRR(clients, plans);
    const activeClients = clients.filter(c => !c.plan_end_date || new Date(c.plan_end_date) >= new Date()).length;
    return activeClients > 0 ? mrr / activeClients : 0;
  };

  const calculateChurnRate = (clients) => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const activeLastMonth = clients.filter(c => 
      (!c.plan_end_date || new Date(c.plan_end_date) >= lastMonth) && 
      (!c.plan_start_date || new Date(c.plan_start_date) <= lastMonth)
    ).length;
    
    const churnedThisMonth = clients.filter(c => 
      c.plan_end_date && 
      new Date(c.plan_end_date) >= lastMonth && 
      new Date(c.plan_end_date) < thisMonth
    ).length;
    
    return activeLastMonth > 0 ? (churnedThisMonth / activeLastMonth) * 100 : 0;
  };

  const calculateConversionRate = (clients) => {
    // This is a simplified version - you might want to track trial users separately
    const totalClients = clients.length;
    const activeClients = clients.filter(c => !c.plan_end_date || new Date(c.plan_end_date) >= new Date()).length;
    return totalClients > 0 ? (activeClients / totalClients) * 100 : 0;
  };

  // Add dummy data for expenses
  const getMonthlyExpenses = (month) => {
    // Dummy data - replace with real data if available
    const baseExpense = 5000;
    const randomVariation = Math.random() * 1000 - 500;
    return baseExpense + randomVariation;
  };

  // Helper: get plan badge/icon
  function getPlanBadge(plan) {
    if (plan.access_type === 'coach') return <span style={{ background: '#e0e7ff', color: '#2563eb', borderRadius: 8, padding: '2px 8px', fontWeight: 700, fontSize: 12, marginRight: 6 }}>Coach</span>;
    if (plan.price === 0) return <span style={{ background: '#d1fae5', color: '#059669', borderRadius: 8, padding: '2px 8px', fontWeight: 700, fontSize: 12, marginRight: 6 }}>Free</span>;
    return <span style={{ background: '#fef3c7', color: '#b45309', borderRadius: 8, padding: '2px 8px', fontWeight: 700, fontSize: 12, marginRight: 6 }}>Paid</span>;
  }

  // Helper: highlight active plans
  function isActivePlan(plan) {
    return getClientCount(plan.id) > 0;
  }

  // Helper: plan status color
  function getStatusBadge(status) {
    const map = { active: ['#d1fae5', '#059669'], archived: ['#f3f4f6', '#64748b'], draft: ['#fef3c7', '#b45309'] };
    const [bg, color] = map[status] || ['#f3f4f6', '#64748b'];
    return <span style={{ background: bg, color, borderRadius: 8, padding: '2px 8px', fontWeight: 700, fontSize: 12 }}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  }

  // Helper: plan category badge
  function getCategoryBadge(category) {
    if (!category) return null;
    const colorMap = { General: '#3b82f6', Student: '#10b981', Premium: '#f59e42', Coach: '#6366f1' };
    return <span style={{ background: '#e0e7ff', color: colorMap[category] || '#2563eb', borderRadius: 8, padding: '2px 8px', fontWeight: 700, fontSize: 12, marginLeft: 6 }}>{category}</span>;
  }

  // Helper: benefits preview popover
  function PlanBenefitsPopover({ benefits }) {
    const [show, setShow] = useState(false);
    if (!benefits) return null;
    const list = Array.isArray(benefits) ? benefits : (benefits.split('\n').filter(Boolean));
    return (
      <span style={{ position: 'relative', marginLeft: 8 }}>
        <button type="button" style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 16 }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
          🛈
        </button>
        {show && (
          <div style={{ position: 'absolute', left: 0, top: 28, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 12, zIndex: 10, minWidth: 180 }}>
            <ul style={{ margin: 0, padding: 0, listStyle: 'disc inside', color: '#18181b', fontSize: 14 }}>
              {list.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        )}
      </span>
    );
  }

  // Helper: description tooltip
  function DescriptionTooltip({ text }) {
    const [show, setShow] = useState(false);
    if (!text) return null;
    const isLong = text.length > 32;
    return isLong ? (
      <span style={{ position: 'relative', cursor: 'pointer', color: '#64748b' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {text.slice(0, 32)}... <span style={{ color: '#3b82f6', fontWeight: 600 }}>ⓘ</span>
        {show && (
          <div style={{ position: 'absolute', left: 0, top: 24, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 10, zIndex: 10, minWidth: 220, color: '#18181b' }}>{text}</div>
        )}
      </span>
    ) : <span style={{ color: '#64748b' }}>{text}</span>;
  }

  // Helper: sparkline (dummy data for now)
  function Sparkline({ data }) {
    // Simple SVG sparkline
    if (!data || data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const points = data.map((v, i) => `${(i/(data.length-1))*100},${100-((v-min)/(max-min||1))*100}`).join(' ');
    return (
      <svg width="80" height="24" viewBox="0 0 100 100" style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 8 }}>
        <polyline fill="none" stroke="#3b82f6" strokeWidth="4" points={points} />
      </svg>
    );
  }

  // Sorting logic
  function sortPlans(plans) {
    let sorted = [...plans];
    if (sortBy === 'revenue') {
      sorted.sort((a, b) => (getClientCount(b.id)*b.price) - (getClientCount(a.id)*a.price));
    } else if (sortBy === 'price') {
      sorted.sort((a, b) => sortDir === 'asc' ? a.price - b.price : b.price - a.price);
    } else if (sortBy === 'clients') {
      sorted.sort((a, b) => sortDir === 'asc' ? getClientCount(a.id) - getClientCount(b.id) : getClientCount(b.id) - getClientCount(a.id));
    }
    return sorted;
  }

  // Add new state for client search/filter/sort
  const [clientSearch, setClientSearch] = useState('');
  const [clientFilterPlan, setClientFilterPlan] = useState('');
  const [clientFilterCoach, setClientFilterCoach] = useState('');
  const [clientFilterAttendance, setClientFilterAttendance] = useState('');
  const [clientSortBy, setClientSortBy] = useState('');
  const [clientSortDir, setClientSortDir] = useState('desc');
  const [showClientProfile, setShowClientProfile] = useState(null); // user_id or null
  const [showMessageModal, setShowMessageModal] = useState(null); // user_id or null

  // Dummy attendance/check-in data (replace with real data if available)
  function getAttendanceRate(client) {
    // Simulate: 0-100%
    return Math.floor(Math.random() * 100);
  }
  function getLastCheckin(client) {
    // Simulate: date string
    const daysAgo = Math.floor(Math.random() * 30);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }
  function getAssignedCoach(client) {
    // Simulate: random coach
    if (!coaches.length) return null;
    return coaches[Math.floor(Math.random() * coaches.length)];
  }
  function getClientStatus(client) {
    const now = new Date();
    if (client.plan_end_date && new Date(client.plan_end_date) < now) return 'Cancelled';
    if (client.frozen) return 'Frozen'; // Add frozen logic if available
    return 'Active';
  }
  function isAtRisk(client) {
    return getAttendanceRate(client) < 30;
  }
  function isVIP(client) {
    // VIP if >12 months or high spend
    const plan = getPlanInfo(client.payment_plan_id);
    const months = plan ? plan.duration : 0;
    return months >= 12 || (plan && plan.price > 150);
  }
  function getClientRevenue(client) {
    const plan = getPlanInfo(client.payment_plan_id);
    return plan ? plan.price : 0;
  }
  // Sorting logic
  function sortClients(list) {
    let sorted = [...list];
    if (clientSortBy === 'revenue') {
      sorted.sort((a, b) => clientSortDir === 'asc' ? getClientRevenue(a) - getClientRevenue(b) : getClientRevenue(b) - getClientRevenue(a));
    } else if (clientSortBy === 'join') {
      sorted.sort((a, b) => clientSortDir === 'asc' ? new Date(a.plan_start_date) - new Date(b.plan_start_date) : new Date(b.plan_start_date) - new Date(a.plan_start_date));
    } else if (clientSortBy === 'attendance') {
      sorted.sort((a, b) => clientSortDir === 'asc' ? getAttendanceRate(a) - getAttendanceRate(b) : getAttendanceRate(b) - getAttendanceRate(a));
    }
    return sorted;
  }
  // Filter logic
  function filterClients(list) {
    return list.filter(client => {
      const plan = getPlanInfo(client.payment_plan_id);
      const coach = getAssignedCoach(client);
      if (clientSearch && !(`${client.first_name} ${client.last_name} ${client.email}`.toLowerCase().includes(clientSearch.toLowerCase()))) return false;
      if (clientFilterPlan && plan && plan.id !== clientFilterPlan) return false;
      if (clientFilterCoach && coach && coach.user_id !== clientFilterCoach) return false;
      if (clientFilterAttendance) {
        const rate = getAttendanceRate(client);
        if (clientFilterAttendance === 'low' && rate >= 50) return false;
        if (clientFilterAttendance === 'high' && rate < 50) return false;
      }
      return true;
    });
  }
  // Export CSV
  function exportClientsCSV() {
    const header = ['Name','Email','Phone','Plan','Price','Join Date','Attendance Rate','Last Check-in','Coach','Status'];
    const rows = filterClients(sortClients(clients)).map(client => {
      const plan = getPlanInfo(client.payment_plan_id);
      const coach = getAssignedCoach(client);
      return [
        `${client.first_name} ${client.last_name}`,
        client.email,
        client.phone,
        plan ? plan.name : '-',
        plan ? euro(plan.price) : '-',
        client.plan_start_date ? client.plan_start_date.slice(0,10) : '-',
        getAttendanceRate(client) + '%',
        getLastCheckin(client),
        coach ? coach.first_name + ' ' + coach.last_name : '-',
        getClientStatus(client)
      ];
    });
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Add new state for coach filters, view toggle, and modals
  const [coachView, setCoachView] = useState('list');
  const [coachFilterStyle, setCoachFilterStyle] = useState('');
  const [coachFilterCert, setCoachFilterCert] = useState('');
  const [coachFilterStatus, setCoachFilterStatus] = useState('');
  const [coachFilterRating, setCoachFilterRating] = useState('');
  const [showCoachProfile, setShowCoachProfile] = useState(null); // user_id or null
  const [showCoachMessage, setShowCoachMessage] = useState(null); // user_id or null

  // Dummy data helpers (replace with real data if available)
  function getHireDate(coach) {
    // Simulate: random date in last 5 years
    const d = new Date();
    d.setFullYear(d.getFullYear() - Math.floor(Math.random() * 5));
    d.setMonth(Math.floor(Math.random() * 12));
    return d.toISOString().slice(0, 10);
  }
  function getSpecialties(coach) {
    // Simulate: random specialties
    const all = ['Weightlifting','Conditioning','Mobility','Endurance','Gymnastics'];
    return all.filter(() => Math.random() > 0.5);
  }
  function getCertifications(coach) {
    // Simulate: random certs
    const all = ['CrossFit L1','CrossFit L2','CPR','First Aid','Nutrition'];
    return all.filter(() => Math.random() > 0.6);
  }
  function getCoachRating(coach) {
    // Simulate: 3.5-5.0
    return (Math.random() * 1.5 + 3.5).toFixed(2);
  }
  function getCoachStatus(coach) {
    // Simulate: Active, On Leave, Resigned
    const all = ['Active','On Leave','Resigned'];
    return all[Math.floor(Math.random() * all.length)];
  }
  function getMonthlyClasses(coach) {
    // Simulate: 0-20
    return Array.from({length: 6}, () => Math.floor(Math.random() * 20));
  }
  function getUtilization(coach) {
    // Simulate: 0-100%
    return Math.floor(Math.random() * 100);
  }
  function getCostPerClass(coach) {
    // Simulate: salary / total classes
    const salary = coach.salary ? Number(coach.salary) : 0;
    const total = Math.floor(Math.random() * 100) + 1;
    return salary && total ? euro(salary / total) : '-';
  }
  // Filter logic
  function filterCoaches(list) {
    return list.filter(coach => {
      if (coachFilterStyle && !(coach.style_of_training || '').toLowerCase().includes(coachFilterStyle.toLowerCase())) return false;
      if (coachFilterCert && !getCertifications(coach).includes(coachFilterCert)) return false;
      if (coachFilterStatus && getCoachStatus(coach) !== coachFilterStatus) return false;
      if (coachFilterRating && Number(getCoachRating(coach)) < Number(coachFilterRating)) return false;
      return true;
    });
  }
  // Export CSV
  function exportCoachesCSV() {
    const header = ['Name','Email','Phone','Hire Date','Specialties','Certifications','Rating','Status','Salary'];
    const rows = filterCoaches(coaches).map(coach => [
      `${coach.first_name} ${coach.last_name}`,
      coach.email,
      coach.phone,
      getHireDate(coach),
      getSpecialties(coach).join('; '),
      getCertifications(coach).join('; '),
      getCoachRating(coach),
      getCoachStatus(coach),
      coach.salary ? euro(coach.salary) : '-'
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coaches.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  // Sparkline for coach analytics
  function CoachSparkline({ data }) {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const points = data.map((v, i) => `${(i/(data.length-1))*100},${100-((v-min)/(max-min||1))*100}`).join(' ');
    return (
      <svg width="60" height="18" viewBox="0 0 100 100" style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }}>
        <polyline fill="none" stroke="#3b82f6" strokeWidth="4" points={points} />
      </svg>
    );
  }

  // Add new state for class filters, view toggle, and templates
  const [classView, setClassView] = useState('calendar');
  const [classFilterCoach, setClassFilterCoach] = useState('');
  const [classFilterType, setClassFilterType] = useState('');
  const [classFilterTime, setClassFilterTime] = useState('');
  const [hoveredDate, setHoveredDate] = useState(null);
  const [showClassTemplate, setShowClassTemplate] = useState('');
  const classTemplates = [
    { name: 'Week A', type: 'Metcon', description: 'Classic CrossFit Metcon', duration: 60, target_level: 'All', location: 'Main Box' },
    { name: 'Week B', type: 'Strength', description: 'Strength focus', duration: 60, target_level: 'Intermediate', location: 'Main Box' }
  ];
  const classLevels = ['Beginner', 'Intermediate', 'RX', 'All'];
  const classLocations = ['Main Box', 'Outdoor Area', 'Annex', 'Online'];

  // Dummy: get class type, level, location
  function getClassType(cls) { return cls.type || 'Metcon'; }
  function getClassLevel(cls) { return cls.target_level || 'All'; }
  function getClassLocation(cls) { return cls.location || 'Main Box'; }
  // Dummy: get client list for class
  function getClassClients(cls) { return clients.slice(0, Math.floor(Math.random()*5)+1); }
  // Dummy: get class notes/zoom
  function getClassNotes(cls) { return cls.notes || null; }
  function getClassZoom(cls) { return cls.zoom_link || null; }
  // Helper: is class full
  function isClassFull(cls) { return (cls.capacity && getClassClients(cls).length >= cls.capacity); }
  function isClassToday(cls) { return cls.date === new Date().toISOString().slice(0,10); }
  function isClassPast(cls) { return new Date(cls.date + 'T' + (cls.start_time||'00:00')) < new Date(); }
  function isClassOpen(cls) { return cls.capacity && getClassClients(cls).length < cls.capacity; }
  // Filter logic
  function filterClasses(list) {
    return list.filter(cls => {
      if (classFilterCoach && cls.coach_id !== classFilterCoach) return false;
      if (classFilterType && getClassType(cls) !== classFilterType) return false;
      if (classFilterTime) {
        const hour = Number((cls.start_time||'00:00').split(':')[0]);
        if (classFilterTime === 'morning' && (hour < 5 || hour >= 12)) return false;
        if (classFilterTime === 'afternoon' && (hour < 12 || hour >= 17)) return false;
        if (classFilterTime === 'evening' && (hour < 17 || hour >= 22)) return false;
      }
      return true;
    });
  }

  return (
    <div className="owner-dashboard-fullscreen" style={{ minHeight: '100vh', background: '#fff', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        /* Remove all default margins/paddings from body, html, #root */
        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box;
        }
        .owner-dashboard-nav {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          background: #fff !important;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: none !important;
          padding: 0.5rem 2rem !important;
          min-height: 64px;
          position: relative;
          width: 100vw;
        }
        .nav-logo {
          justify-self: start;
          display: flex;
          align-items: center;
          min-width: 0;
        }
        .nav-center {
          justify-self: center;
          display: flex;
          justify-content: center;
          align-items: center;
          min-width: 0;
        }
        .nav-actions {
          justify-self: end;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          min-width: 0;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .nav-links button {
          background: none;
          border: none;
          padding: 0.5rem 1.2rem;
          border-radius: 2rem;
          font-size: 1rem;
          font-weight: 600;
          color: #222;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          transition: background 0.15s, color 0.15s;
          cursor: pointer;
          outline: none;
        }
        .nav-links button.active, .nav-links button:focus {
          background: #3b82f6;
          color: #fff;
        }
        .nav-links button:hover:not(.active) {
          background: #e0e7ff;
          color: #2563eb;
        }
        .signout-btn {
          background: #f87171 !important;
          color: #fff !important;
          font-weight: 700;
          border-radius: 2rem;
          margin-left: 1rem;
          padding: 0.5rem 1.5rem;
          transition: background 0.15s, color 0.15s;
        }
        .signout-btn:hover {
          background: #ef4444 !important;
          color: #fff !important;
        }
        .owner-dashboard-main {
          background: #fff;
          box-shadow: none;
          border-radius: 0;
          padding: 1.5rem 0 0 0;
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          min-height: 80vh;
          transition: none;
        }
        .dashboard-section {
          width: 100%;
          max-width: 100vw;
          background: #fff;
          border-radius: 0;
          box-shadow: none;
          padding: 2.5rem 0 2rem 0;
          margin-bottom: 2rem;
        }
        .dashboard-stats-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 2rem;
          margin-bottom: 2.5rem;
          width: 100%;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }
        .dashboard-stat-card {
          background: #f8fafc;
          border-radius: 1rem;
          padding: 1.5rem 2.5rem;
          min-width: 180px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .dashboard-stat-card .stat-value {
          font-size: 2.2rem;
          font-weight: 700;
        }
        .dashboard-stat-card .stat-label {
          color: #64748b;
          font-weight: 500;
        }
        .dashboard-upcoming-classes {
          margin: 2.5rem auto 0 auto;
          max-width: 1200px;
          width: 100%;
        }
        .dashboard-upcoming-list {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
          margin-top: 1rem;
        }
        .dashboard-upcoming-card {
          background: #f8fafc;
          border-radius: 1rem;
          padding: 1.2rem 1.5rem;
          min-width: 220px;
          flex: 1 1 220px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          /* box-shadow: none; */
        }
        @media (max-width: 900px) {
          .dashboard-stats-grid, .dashboard-upcoming-classes {
            max-width: 98vw !important;
            padding: 0 0.5rem !important;
          }
        }
        @media (max-width: 600px) {
          .dashboard-section h2 {
            font-size: 1.5rem;
          }
          .dashboard-stats-grid, .dashboard-upcoming-classes {
            max-width: 100vw !important;
            padding: 0 0.2rem !important;
          }
        }
        .react-calendar {
          font-size: 1.3rem !important;
          width: 100% !important;
          max-width: 480px !important;
          border-radius: 16px !important;
          /* box-shadow: 0 2px 8px rgba(0,0,0,0.04); */
          margin: 0 auto 1.5rem auto;
          border: none !important;
        }
        .react-calendar__tile {
          font-size: 1.3rem !important;
          height: 48px !important;
          width: 48px !important;
          border-radius: 12px !important;
          transition: background 0.15s;
          color: #18181b !important;
        }
        .react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus {
          background: #e0e7ff !important;
          color: #18181b !important;
        }
        .react-calendar__month-view__days__day {
          font-size: 1.3rem !important;
          color: #18181b !important;
        }
        .react-calendar__navigation__label, .react-calendar__navigation__arrow {
          color: #18181b !important;
          font-weight: 700;
        }
      `}</style>
      <nav className="owner-dashboard-nav">
        <div className="nav-logo">
          <img src={logoMakincome} alt="Makincome Logo" style={{ height: 48, marginRight: 16 }} />
        </div>
        <div className="nav-center">
          <div className="nav-links">
            <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
            <button className={activeTab === 'revenue' ? 'active' : ''} onClick={() => setActiveTab('revenue')}>Revenue</button>
            <button className={activeTab === 'plans' ? 'active' : ''} onClick={() => setActiveTab('plans')}>Plans</button>
            <button className={activeTab === 'clients' ? 'active' : ''} onClick={() => setActiveTab('clients')}>Clients</button>
            <button className={activeTab === 'coaches' ? 'active' : ''} onClick={() => setActiveTab('coaches')}>Coaches</button>
            <button className={activeTab === 'classes' ? 'active' : ''} onClick={() => setActiveTab('classes')}>Classes</button>
          </div>
        </div>
        <div className="nav-actions">
          <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>
      <div className="owner-dashboard-content-center">
        <main className="owner-dashboard-main">
          {activeTab === 'dashboard' && (
            <section className="dashboard-section" style={{ display: 'flex', flexDirection: 'row', gap: 32, alignItems: 'flex-start' }}>
              {/* Leaderboard panel */}
              <aside style={{ flex: 1, minWidth: 260, maxWidth: 320, background: '#f8fafc', borderRadius: 16, padding: 24, boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, marginBottom: 8, textAlign: 'center' }}>Leaderboard</h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
                  <button className={`submit-btn${leaderboardMode === 'attendance' ? ' active' : ''}`} style={{ minWidth: 60, height: 32, background: leaderboardMode === 'attendance' ? '#3b82f6' : '#e0e7ff', color: leaderboardMode === 'attendance' ? '#fff' : '#222', fontWeight: 600 }} onClick={() => setLeaderboardMode('attendance')}>Attendance</button>
                  <button className={`submit-btn${leaderboardMode === 'prs' ? ' active' : ''}`} style={{ minWidth: 60, height: 32, background: leaderboardMode === 'prs' ? '#3b82f6' : '#e0e7ff', color: leaderboardMode === 'prs' ? '#fff' : '#222', fontWeight: 600 }} onClick={() => setLeaderboardMode('prs')}>PRs</button>
                </div>
                <div style={{ overflowY: 'auto', maxHeight: 400 }}>
                  {leaderboardList.length === 0 ? (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>No clients found.</div>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {leaderboardList.map((c, idx) => (
                        <li key={c.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: idx < 3 ? medalColors[idx] + '22' : '#fff', borderRadius: 8, marginBottom: 8, padding: '0.6rem 0.8rem', boxShadow: 'none' }}>
                          <div style={{ fontWeight: 700, fontSize: '1.1rem', width: 24, textAlign: 'center', color: idx < 3 ? medalColors[idx] : '#64748b' }}>{idx + 1}</div>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#3b82f6' }}>{(c.first_name?.[0] || '') + (c.last_name?.[0] || '')}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.first_name} {c.last_name}</div>
                            <div style={{ color: '#64748b', fontSize: '0.95rem' }}>{leaderboardMode === 'attendance' ? 'Check-ins' : 'PRs'}</div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: idx < 3 ? medalColors[idx] : '#18181b', minWidth: 32, textAlign: 'right' }}>{c.points}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </aside>
              {/* Main dashboard content */}
              <div style={{ flex: 2, minWidth: 0 }}>
                <h2 style={{ 
                  marginBottom: '1.5rem', 
                  textAlign: 'center', 
                  fontSize: '3rem', 
                  fontWeight: 900, 
                  letterSpacing: '-0.03em', 
                  color: '#18181b' 
                }}>
                  Good morning, {ownerName.split(' ')[0] || 'Owner'}!
                </h2>
                <div className="dashboard-stats-grid">
                  <div className="dashboard-stat-card">
                    <div className="stat-value">{clients.length}</div>
                    <div className="stat-label">Clients</div>
                  </div>
                  <div className="dashboard-stat-card">
                    <div className="stat-value">{coaches.length}</div>
                    <div className="stat-label">Coaches</div>
                  </div>
                  <div className="dashboard-stat-card">
                    <div className="stat-value">{plans.length}</div>
                    <div className="stat-label">Plans</div>
                  </div>
                  <div className="dashboard-stat-card">
                    <div className="stat-value">{allClasses.filter(cls => {
                      const d = new Date(cls.date);
                      const now = new Date();
                      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    }).length}</div>
                    <div className="stat-label">Classes This Month</div>
                  </div>
                  <div className="dashboard-stat-card">
                    <div className="stat-value">{getCurrentMonthRevenue()}</div>
                    <div className="stat-label">Revenue This Month</div>
                  </div>
                </div>
                <div style={{ maxWidth: 1200, margin: '2.5rem auto 0 auto', width: '100%' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>Forecasted Revenue (Year)</h3>
                  <div style={{ background: '#f8fafc', borderRadius: 16, padding: 24, minHeight: 340, width: '100%', height: 340 /*, boxShadow: 'none'*/ }}>
                    <canvas ref={revenueYearChartRef} width={900} height={300} style={{ background: 'transparent' }} />
                  </div>
                </div>
              </div>
              {/* Class management panel */}
              <aside style={{ flex: 1, minWidth: 320, maxWidth: 400, background: '#f8fafc', borderRadius: 16, padding: 24, boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, marginBottom: 8, textAlign: 'center' }}>Class Management</h3>
                <button className="submit-btn" style={{ minWidth: 100, height: 36, marginBottom: 12 }} onClick={openAddClassModal}>Add Class</button>
                <div style={{ overflowY: 'auto', maxHeight: 400 }}>
                  {allClasses.filter(cls => new Date(cls.date + 'T' + (cls.start_time || '00:00')) >= new Date()).length === 0 ? (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>No upcoming classes.</div>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {allClasses
                        .filter(cls => new Date(cls.date + 'T' + (cls.start_time || '00:00')) >= new Date())
                        .sort((a, b) => new Date(a.date + 'T' + (a.start_time || '00:00')) - new Date(b.date + 'T' + (b.start_time || '00:00')))
                        .map(cls => (
                          <li key={cls.id} style={{ background: '#fff', borderRadius: 8, marginBottom: 10, padding: '0.7rem 1rem', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{cls.type || cls.name}</div>
                            <div style={{ color: '#64748b', fontSize: '0.95rem' }}>{cls.date} {cls.start_time}</div>
                            <div style={{ color: '#64748b', fontSize: '0.95rem' }}>Coach: {coaches.find(c => c.user_id === cls.coach_id)?.first_name} {coaches.find(c => c.user_id === cls.coach_id)?.last_name}</div>
                            <div style={{ color: '#64748b', fontSize: '0.95rem' }}>Capacity: {cls.capacity}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                              <button className="submit-btn" style={{ minWidth: 60, height: 32 }} onClick={() => openEditClassModal(cls)}>Edit</button>
                            </div>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </aside>
              {/* Modal for add/edit class */}
              {showClassModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <form onSubmit={handleClassModalSubmit} style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <h3 style={{ marginTop: 0, marginBottom: 8, fontWeight: 700, fontSize: '1.2rem' }}>{classModalMode === 'add' ? 'Add Class' : 'Edit Class'}</h3>
                    <label style={{ fontWeight: 600 }}>Class Type</label>
                    <select value={classModalData.type} onChange={e => setClassModalData(d => ({ ...d, type: e.target.value }))} required>
                      <option value="">Select type</option>
                      {classTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <label style={{ fontWeight: 600 }}>Date</label>
                    <input type="date" value={classModalData.date} onChange={e => setClassModalData(d => ({ ...d, date: e.target.value }))} required />
                    <label style={{ fontWeight: 600 }}>Time</label>
                    <input type="time" value={classModalData.time} onChange={e => setClassModalData(d => ({ ...d, time: e.target.value }))} required />
                    <label style={{ fontWeight: 600 }}>Coach</label>
                    <select value={classModalData.coach_id} onChange={e => setClassModalData(d => ({ ...d, coach_id: e.target.value }))} required>
                      <option value="">Select coach</option>
                      {coaches.map(coach => <option key={coach.user_id} value={coach.user_id}>{coach.first_name} {coach.last_name}</option>)}
                    </select>
                    <label style={{ fontWeight: 600 }}>Capacity</label>
                    <input type="number" min={1} value={classModalData.capacity} onChange={e => setClassModalData(d => ({ ...d, capacity: e.target.value }))} required />
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'flex-end' }}>
                      <button type="submit" className="submit-btn" style={{ minWidth: 80 }} disabled={loading}>{classModalMode === 'add' ? 'Add' : 'Save'}</button>
                      <button type="button" className="remove-btn" style={{ minWidth: 80 }} onClick={closeClassModal}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}
            </section>
          )}
          {activeTab === 'clients' && (
            <section className="dashboard-section">
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#18181b', margin: 0, lineHeight: 1 }}>Client Management</h2>
                <button className="submit-btn" style={{ height: 48, minWidth: 160, fontSize: '1.1rem', fontWeight: 700, marginTop: 18 }} onClick={() => setShowAddClient(true)}>
                  + Add Client
                </button>
                <button className="submit-btn" style={{ height: 48, minWidth: 160, fontSize: '1.1rem', fontWeight: 700, marginTop: 18, marginLeft: 16, background: '#e0e7ff', color: '#222' }} onClick={exportClientsCSV}>
                  Export CSV
                </button>
              </div>
              {/* Search and Filters */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
                <input type="text" placeholder="Search clients..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.5rem 1rem', minWidth: 180 }} />
                <select value={clientFilterPlan} onChange={e => setClientFilterPlan(e.target.value)} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.5rem 1rem' }}>
                  <option value="">All Plans</option>
                  {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </select>
                <select value={clientFilterCoach} onChange={e => setClientFilterCoach(e.target.value)} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.5rem 1rem' }}>
                  <option value="">All Coaches</option>
                  {coaches.map(coach => <option key={coach.user_id} value={coach.user_id}>{coach.first_name} {coach.last_name}</option>)}
                </select>
                <select value={clientFilterAttendance} onChange={e => setClientFilterAttendance(e.target.value)} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.5rem 1rem' }}>
                  <option value="">All Attendance</option>
                  <option value="high">High (&ge;50%)</option>
                  <option value="low">Low (&lt;50%)</option>
                </select>
              </div>
              <div className="section-content" style={{ flexDirection: 'column', alignItems: 'center' }}>
                {showAddClient && (
                  <form className="client-form" onSubmit={handleAddClient}>
                    <div className="client-form-row">
                      <input type="text" name="firstName" value={newClient.firstName} onChange={handleClientInput} placeholder="First Name" required />
                      <input type="text" name="lastName" value={newClient.lastName} onChange={handleClientInput} placeholder="Last Name" required />
                    </div>
                    <div className="client-form-row">
                      <input type="email" name="email" value={newClient.email} onChange={handleClientInput} placeholder="Email" required />
                      <input type="tel" name="phone" value={newClient.phone} onChange={handleClientInput} placeholder="Phone" />
                    </div>
                    <div className="client-form-row">
                      <select name="planId" value={newClient.planId} onChange={handleClientInput} required>
                        <option value="">Select Plan</option>
                        {plans.map(plan => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} ({euro(plan.price)}/{plan.duration}mo)
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="submit-btn" disabled={clientLoading}>Add Client</button>
                    <button type="button" className="remove-btn" style={{ marginLeft: 8 }} onClick={() => setShowAddClient(false)}>Cancel</button>
                  </form>
                )}
                {clientMessage && <div className="coach-message">{clientMessage}</div>}
                <div className="client-list" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  {clientLoading ? <div className="placeholder">Loading...</div> : (
                    clients.length === 0 ? <div className="placeholder">No clients found.</div> : (
                      <table className="client-table" style={{ background: '#f8fafc', borderRadius: 16, boxShadow: 'none', width: '100%', maxWidth: 1100, margin: '0 auto', borderCollapse: 'separate', borderSpacing: 0, fontSize: 15 }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ padding: '0.7rem', fontWeight: 700, color: '#18181b' }}>Name</th>
                            <th style={{ padding: '0.7rem', fontWeight: 700, color: '#18181b' }}>Email</th>
                            <th style={{ padding: '0.7rem', fontWeight: 700, color: '#18181b' }}>Phone</th>
                            <th style={{ padding: '0.7rem', fontWeight: 700, color: '#18181b' }}>Plan</th>
                            <th style={{ padding: '0.7rem', fontWeight: 700, color: '#18181b', cursor: 'pointer' }} onClick={() => { setClientSortBy('revenue'); setClientSortDir(clientSortDir === 'asc' ? 'desc' : 'asc'); }}>Price</th>
                            <th style={{ padding: '0.7rem', fontWeight: 700, color: '#18181b', cursor: 'pointer' }} onClick={() => { setClientSortBy('join'); setClientSortDir(clientSortDir === 'asc' ? 'desc' : 'asc'); }}>Join Date</th>
                            <th style={{ padding: '0.7rem', fontWeight: 700, color: '#18181b', cursor: 'pointer' }} onClick={() => { setClientSortBy('attendance'); setClientSortDir(clientSortDir === 'asc' ? 'desc' : 'asc'); }}>Attendance Rate</th>
                            <th style={{ padding: '0.7rem', fontWeight: 700, color: '#18181b' }}>Last Check-in</th>
                            <th style={{ padding: '0.7rem', fontWeight: 700, color: '#18181b' }}>Coach</th>
                            <th style={{ padding: '0.7rem', fontWeight: 700, color: '#18181b' }}>Status</th>
                            <th style={{ padding: '0.7rem', fontWeight: 700, color: '#18181b' }}>Insights</th>
                            <th style={{ padding: '0.7rem', fontWeight: 700, color: '#18181b' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filterClients(sortClients(clients)).map((client, idx) => {
                            const plan = getPlanInfo(client.payment_plan_id);
                            const coach = getAssignedCoach(client);
                            return (
                              <tr key={client.user_id} style={{ background: idx % 2 === 0 ? '#f8fafc' : '#fff', borderLeft: isAtRisk(client) ? '4px solid #f87171' : isVIP(client) ? '4px solid #3b82f6' : 'none' }}>
                                <td style={{ padding: '0.7rem', fontWeight: 600 }}>{client.first_name} {client.last_name}</td>
                                <td style={{ padding: '0.7rem' }}>{client.email}</td>
                                <td style={{ padding: '0.7rem' }}>{client.phone}</td>
                                <td style={{ padding: '0.7rem' }}>{plan ? plan.name : '-'}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'right' }}>{plan ? euro(plan.price) : '-'}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>{client.plan_start_date ? client.plan_start_date.slice(0,10) : '-'}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>{getAttendanceRate(client)}%</td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>{getLastCheckin(client)}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>{coach ? coach.first_name + ' ' + coach.last_name : '-'}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>{getClientStatus(client)}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                                  {isAtRisk(client) && <span style={{ background: '#fef3c7', color: '#b45309', borderRadius: 8, padding: '2px 8px', fontWeight: 700, fontSize: 12, marginRight: 4 }} title="Low attendance this month">At Risk</span>}
                                  {isVIP(client) && <span style={{ background: '#e0e7ff', color: '#2563eb', borderRadius: 8, padding: '2px 8px', fontWeight: 700, fontSize: 12 }} title="VIP: Long-term or high spend">VIP</span>}
                                </td>
                                <td style={{ padding: '0.7rem', textAlign: 'right', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  <button className="submit-btn" style={{ minWidth: 60, fontSize: 14, padding: '0.3rem 0.7rem' }} onClick={() => setShowMessageModal(client.user_id)}>Message</button>
                                  <button className="submit-btn" style={{ minWidth: 60, fontSize: 14, padding: '0.3rem 0.7rem', background: '#e0e7ff', color: '#2563eb' }} onClick={() => setShowClientProfile(client.user_id)}>View Profile</button>
                                  <button type="button" className="remove-btn" style={{ minWidth: 60, fontSize: 14, padding: '0.3rem 0.7rem' }} onClick={() => handleRemoveClient(client.user_id)} disabled={clientLoading}>Remove</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )
                  )}
                </div>
                {/* Message Modal (dummy) */}
                {showMessageModal && (
                  <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
                      <h3 style={{ marginTop: 0, marginBottom: 16, fontWeight: 700, fontSize: '1.3rem' }}>Send Message</h3>
                      <div style={{ marginBottom: 12 }}>This would open an email or SMS modal for client ID: {showMessageModal}</div>
                      <button className="remove-btn" style={{ marginTop: 24, minWidth: 100 }} onClick={() => setShowMessageModal(null)}>Close</button>
                    </div>
                  </div>
                )}
                {/* View Profile Modal (dummy) */}
                {showClientProfile && (
                  <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, maxWidth: 500, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
                      <h3 style={{ marginTop: 0, marginBottom: 16, fontWeight: 700, fontSize: '1.3rem' }}>Client Profile</h3>
                      <div style={{ marginBottom: 12 }}>This would show a detailed profile for client ID: {showClientProfile} (history, payments, check-ins, etc.)</div>
                      <button className="remove-btn" style={{ marginTop: 24, minWidth: 100 }} onClick={() => setShowClientProfile(null)}>Close</button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
          {activeTab === 'revenue' && (
            <section className="dashboard-section">
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#18181b', margin: 0, lineHeight: 1, marginBottom: '1.2rem', textAlign: 'center' }}>Revenue Analytics</h2>
              
              {/* New Metrics Grid */}
              <div className="dashboard-stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="dashboard-stat-card">
                  <div className="stat-value">{euro(calculateMRR(clients, plans))}</div>
                  <div className="stat-label">Monthly Recurring Revenue</div>
                </div>
                <div className="dashboard-stat-card">
                  <div className="stat-value">{euro(calculateARPU(clients, plans))}</div>
                  <div className="stat-label">Average Revenue Per User</div>
                </div>
                <div className="dashboard-stat-card">
                  <div className="stat-value">{calculateChurnRate(clients).toFixed(1)}%</div>
                  <div className="stat-label">Client Churn Rate</div>
                </div>
                <div className="dashboard-stat-card">
                  <div className="stat-value">{calculateConversionRate(clients).toFixed(1)}%</div>
                  <div className="stat-label">Plan Conversion Rate</div>
                </div>
              </div>

              {/* Enhanced Charts Section */}
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2.5rem' }}>
                <div style={{ background: '#f8fafc', borderRadius: '1rem', padding: '1.5rem 2.5rem', minWidth: 180, flex: 1, textAlign: 'center', minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 16 }}>Revenue & Expenses</div>
                  <canvas ref={revenueChartRef} width={600} height={300} style={{ maxWidth: '100%', maxHeight: 300 }}></canvas>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '1rem', padding: '1.5rem 2.5rem', minWidth: 180, flex: 1, textAlign: 'center', minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 16 }}>Plan Distribution</div>
                  <canvas ref={chartRef} width={300} height={220} style={{ maxWidth: '100%', maxHeight: 220 }}></canvas>
                </div>
              </div>

              {/* Revenue Breakdown Table */}
              <div style={{ background: '#f8fafc', borderRadius: 16, padding: 24, marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>Revenue Breakdown by Plan</h3>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '1rem', fontSize: 16, fontWeight: 700, color: '#18181b', textAlign: 'left', borderTopLeftRadius: 8 }}>Plan Name</th>
                      <th style={{ padding: '1rem', fontSize: 16, fontWeight: 700, color: '#18181b', textAlign: 'center' }}>Active Users</th>
                      <th style={{ padding: '1rem', fontSize: 16, fontWeight: 700, color: '#18181b', textAlign: 'right', borderTopRightRadius: 8 }}>Monthly Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan, idx) => {
                      const activeUsers = getClientCount(plan.id);
                      const monthlyRevenue = plan.price * activeUsers;
                      return (
                        <tr key={plan.id} style={{ background: idx % 2 === 0 ? '#f8fafc' : '#fff' }}>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>{plan.name}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{activeUsers}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{euro(monthlyRevenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Smart Suggestions Panel */}
              <div style={{ background: '#f8fafc', borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>Smart Suggestions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {calculateChurnRate(clients) > 5 && (
                    <div style={{ background: '#fff', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: '#e11d48', fontSize: 24 }}>⚠️</span>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>High Churn Rate Detected</div>
                        <div style={{ color: '#64748b' }}>Consider implementing a loyalty reward program or sending reactivation emails to recent churners.</div>
                      </div>
                    </div>
                  )}
                  {calculateARPU(clients, plans) < 100 && (
                    <div style={{ background: '#fff', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: '#f59e0b', fontSize: 24 }}>💡</span>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Low ARPU Opportunity</div>
                        <div style={{ color: '#64748b' }}>Consider introducing premium add-ons or upselling existing clients to higher-tier plans.</div>
                      </div>
                    </div>
                  )}
                  {calculateConversionRate(clients) < 70 && (
                    <div style={{ background: '#fff', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: '#3b82f6', fontSize: 24 }}>🎯</span>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Conversion Rate Optimization</div>
                        <div style={{ color: '#64748b' }}>Review your onboarding process and consider offering a trial-to-paid conversion incentive.</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
          {activeTab === 'plans' && (
            <section className="dashboard-section">
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#18181b', margin: 0, lineHeight: 1 }}>Plan Management</h2>
                <button className="submit-btn" style={{ height: 48, minWidth: 160, fontSize: '1.1rem', fontWeight: 700, marginTop: 18 }} onClick={() => { setShowAddPlan(true); setShowEditPlan(null); }}>
                  + Add Plan
                </button>
                <button className="submit-btn" style={{ height: 48, minWidth: 160, fontSize: '1.1rem', fontWeight: 700, marginTop: 18, marginLeft: 16, background: showArchivedPlans ? '#3b82f6' : '#e0e7ff', color: showArchivedPlans ? '#fff' : '#222' }} onClick={() => setShowArchivedPlans(v => !v)}>
                  {showArchivedPlans ? 'Hide Archived' : 'Show Archived'}
                </button>
              </div>
              <div className="section-content" style={{ flexDirection: 'column', alignItems: 'center' }}>
                {/* Add/Edit Plan Form */}
                {(showAddPlan || showEditPlan) && (
                  <form className="plan-form" onSubmit={showAddPlan ? handleAddPlan : handleUpdatePlan}>
                    <div className="plan-form-row">
                      <input type="text" name="name" value={planForm.name} onChange={handlePlanInput} placeholder="Plan Name" required />
                      <input type="number" name="price" value={planForm.price} onChange={handlePlanInput} placeholder="Price" min={planForm.access_type === 'coach' ? 0 : 1} step="0.01" required />
                    </div>
                    <div className="plan-form-row">
                      <input type="number" name="duration" value={planForm.duration} onChange={handlePlanInput} placeholder="Duration (months)" min="1" required />
                      <input type="text" name="description" value={planForm.description} onChange={handlePlanInput} placeholder="Description" />
                    </div>
                    <button type="submit" className="submit-btn" disabled={planLoading}>Add Plan</button>
                    <button type="button" className="remove-btn" style={{ marginLeft: 8 }} onClick={() => setShowAddPlan(false)}>Cancel</button>
                  </form>
                )}
                {showEditPlan && (
                  <form className="plan-form" onSubmit={handleUpdatePlan}>
                    <div className="plan-form-row">
                      <input type="text" name="name" value={planForm.name} onChange={handlePlanInput} placeholder="Plan Name" required />
                      <input type="number" name="price" value={planForm.price} onChange={handlePlanInput} placeholder="Price" min="0" step="0.01" required />
                    </div>
                    <div className="plan-form-row">
                      <input type="number" name="duration" value={planForm.duration} onChange={handlePlanInput} placeholder="Duration (months)" min="1" required />
                      <input type="text" name="description" value={planForm.description} onChange={handlePlanInput} placeholder="Description" />
                    </div>
                    <button type="submit" className="submit-btn" disabled={planLoading}>Update Plan</button>
                    <button type="button" className="remove-btn" style={{ marginLeft: 8 }} onClick={() => setShowEditPlan(null)}>Cancel</button>
                  </form>
                )}
                {planMessage && <div className="coach-message">{planMessage}</div>}
                <div className="plan-list" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  {planLoading ? <div className="placeholder">Loading...</div> : (
                    plans.length === 0 ? <div className="placeholder">No plans found.</div> : (
                      <table className="plan-table" style={{ background: '#f8fafc', borderRadius: 16, /*boxShadow: 'none',*/ width: '100%', maxWidth: 900, margin: '0 auto', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ padding: '1rem', fontSize: 18, fontWeight: 700, color: '#18181b', borderTopLeftRadius: 16 }}>Name</th>
                            <th style={{ padding: '1rem', fontSize: 18, fontWeight: 700, color: '#18181b' }}>Price</th>
                            <th style={{ padding: '1rem', fontSize: 18, fontWeight: 700, color: '#18181b' }}>Duration (mo)</th>
                            <th style={{ padding: '1rem', fontSize: 18, fontWeight: 700, color: '#18181b' }}>Description</th>
                            <th style={{ padding: '1rem', fontSize: 18, fontWeight: 700, color: '#18181b' }}>Clients</th>
                            <th style={{ padding: '1rem', fontSize: 18, fontWeight: 700, color: '#18181b' }}>Expected Revenue/Year</th>
                            <th style={{ padding: '1rem', borderTopRightRadius: 16 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {plans
                            .slice()
                            .sort((a, b) => getClientCount(b.id) - getClientCount(a.id))
                            .map((plan, idx) => (
                              <tr key={plan.id} style={{ background: idx % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                <td style={{ padding: '1rem', fontWeight: 600 }}>{plan.name}</td>
                                <td style={{ padding: '1rem' }}>{euro(plan.price)}</td>
                                <td style={{ padding: '1rem' }}>{plan.duration}</td>
                                <td style={{ padding: '1rem', color: '#64748b' }}>{plan.description}</td>
                                <td style={{ padding: '1rem' }}>{getClientCount(plan.id)}</td>
                                <td style={{ padding: '1rem' }}>{getYearlyExpectedRevenue(plan)}</td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                                    <button className="submit-btn" style={{ width: 80 }} onClick={() => handleEditPlan(plan)}>Edit</button>
                                    <button type="button" className="remove-btn" style={{ width: 80 }} onClick={() => handleRemovePlan(plan.id)} disabled={planLoading}>Remove</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )
                  )}
                </div>
              </div>
            </section>
          )}
          {activeTab === 'coaches' && (
            <section className="dashboard-section">
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#18181b', margin: 0, lineHeight: 1 }}>Coach Management</h2>
                <button className="submit-btn" style={{ marginBottom: '1rem', maxWidth: 180 }} onClick={() => setShowAddCoach(true)}>
                  + Add Coach
                </button>
                <button className="submit-btn" style={{ marginBottom: '1rem', maxWidth: 180, marginLeft: 16, background: '#e0e7ff', color: '#222' }} onClick={exportCoachesCSV}>
                  Export CSV
                </button>
                <button className="submit-btn" style={{ marginBottom: '1rem', maxWidth: 180, marginLeft: 16, background: coachView === 'card' ? '#3b82f6' : '#e0e7ff', color: coachView === 'card' ? '#fff' : '#222' }} onClick={() => setCoachView(v => v === 'list' ? 'card' : 'list')}>
                  {coachView === 'card' ? 'List View' : 'Card View'}
                </button>
              </div>
              {/* Filters */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
                <input type="text" placeholder="Filter by style..." value={coachFilterStyle} onChange={e => setCoachFilterStyle(e.target.value)} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.5rem 1rem', minWidth: 120 }} />
                <select value={coachFilterCert} onChange={e => setCoachFilterCert(e.target.value)} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.5rem 1rem' }}>
                  <option value="">All Certifications</option>
                  {['CrossFit L1','CrossFit L2','CPR','First Aid','Nutrition'].map(cert => <option key={cert} value={cert}>{cert}</option>)}
                </select>
                <select value={coachFilterStatus} onChange={e => setCoachFilterStatus(e.target.value)} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.5rem 1rem' }}>
                  <option value="">All Status</option>
                  {['Active','On Leave','Resigned'].map(status => <option key={status} value={status}>{status}</option>)}
                </select>
                <select value={coachFilterRating} onChange={e => setCoachFilterRating(e.target.value)} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.5rem 1rem' }}>
                  <option value="">All Ratings</option>
                  <option value="4">4+</option>
                  <option value="4.5">4.5+</option>
                </select>
              </div>
              <div className="section-content" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                {coachView === 'list' ? (
                  <table className="client-table" style={{ background: '#f8fafc', borderRadius: 16, width: '100%', maxWidth: 1100, margin: '0 auto', borderCollapse: 'separate', borderSpacing: 0, fontSize: 15 }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Hire Date</th>
                        <th>Specialties</th>
                        <th>Certifications</th>
                        <th>Rating</th>
                        <th>Status</th>
                        <th>Salary</th>
                        <th>Monthly Classes</th>
                        <th>Utilization</th>
                        <th>Cost/Class</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterCoaches(coaches).map((coach, idx) => {
                        const monthlyClasses = getMonthlyClasses(coach);
                        return (
                          <tr key={coach.user_id} style={{ background: idx % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={{ fontWeight: 600 }}>{coach.first_name} {coach.last_name}</td>
                            <td>{coach.email}</td>
                            <td>{coach.phone}</td>
                            <td>{getHireDate(coach)}</td>
                            <td>{getSpecialties(coach).map(s => <span key={s} style={{ background: '#e0e7ff', color: '#2563eb', borderRadius: 8, padding: '2px 8px', fontWeight: 700, fontSize: 12, marginRight: 4 }}>{s}</span>)}</td>
                            <td>{getCertifications(coach).map(c => <span key={c} style={{ background: '#fef3c7', color: '#b45309', borderRadius: 8, padding: '2px 8px', fontWeight: 700, fontSize: 12, marginRight: 4 }}>{c}</span>)}</td>
                            <td>{getCoachRating(coach)}</td>
                            <td>{(() => { const st = getCoachStatus(coach); const color = st==='Active'?'#10b981':st==='On Leave'?'#f59e42':'#64748b'; return <span style={{ background: '#f3f4f6', color, borderRadius: 8, padding: '2px 8px', fontWeight: 700, fontSize: 12 }}>{st}</span>; })()}</td>
                            <td>{coach.salary ? euro(coach.salary) : '-'}</td>
                            <td>{monthlyClasses[monthlyClasses.length-1]} <CoachSparkline data={monthlyClasses} /></td>
                            <td>{getUtilization(coach)}%</td>
                            <td>{getCostPerClass(coach)}</td>
                            <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button className="submit-btn" style={{ minWidth: 60, fontSize: 14, padding: '0.3rem 0.7rem' }} onClick={() => setShowCoachMessage(coach.user_id)}>Message</button>
                              <button className="submit-btn" style={{ minWidth: 60, fontSize: 14, padding: '0.3rem 0.7rem', background: '#e0e7ff', color: '#2563eb' }} onClick={() => setShowCoachProfile(coach.user_id)}>View Profile</button>
                              <button type="button" className="remove-btn" style={{ minWidth: 60, fontSize: 14, padding: '0.3rem 0.7rem' }} onClick={() => handleRemoveCoach(coach.user_id)} disabled={loading}>Remove</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center' }}>
                    {filterCoaches(coaches).map((coach, idx) => {
                      const monthlyClasses = getMonthlyClasses(coach);
                      return (
                        <div key={coach.user_id} style={{ background: '#f8fafc', borderRadius: 16, boxShadow: 'none', padding: 20, minWidth: 260, maxWidth: 320, flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                          <div style={{ fontWeight: 700, fontSize: 18 }}>{coach.first_name} {coach.last_name}</div>
                          <div style={{ color: '#64748b', fontSize: 14 }}>{coach.email}</div>
                          <div style={{ color: '#64748b', fontSize: 14 }}>{coach.phone}</div>
                          <div style={{ fontSize: 14 }}>Hire: {getHireDate(coach)}</div>
                          <div style={{ fontSize: 14 }}>Specialties: {getSpecialties(coach).map(s => <span key={s} style={{ background: '#e0e7ff', color: '#2563eb', borderRadius: 8, padding: '2px 8px', fontWeight: 700, fontSize: 12, marginRight: 4 }}>{s}</span>)}</div>
                          <div style={{ fontSize: 14 }}>Certs: {getCertifications(coach).map(c => <span key={c} style={{ background: '#fef3c7', color: '#b45309', borderRadius: 8, padding: '2px 8px', fontWeight: 700, fontSize: 12, marginRight: 4 }}>{c}</span>)}</div>
                          <div style={{ fontSize: 14 }}>Rating: {getCoachRating(coach)}</div>
                          <div style={{ fontSize: 14 }}>Status: {(() => { const st = getCoachStatus(coach); const color = st==='Active'?'#10b981':st==='On Leave'?'#f59e42':'#64748b'; return <span style={{ background: '#f3f4f6', color, borderRadius: 8, padding: '2px 8px', fontWeight: 700, fontSize: 12 }}>{st}</span>; })()}</div>
                          <div style={{ fontSize: 14 }}>Salary: {coach.salary ? euro(coach.salary) : '-'}</div>
                          <div style={{ fontSize: 14 }}>Classes: {monthlyClasses[monthlyClasses.length-1]} <CoachSparkline data={monthlyClasses} /></div>
                          <div style={{ fontSize: 14 }}>Utilization: {getUtilization(coach)}%</div>
                          <div style={{ fontSize: 14 }}>Cost/Class: {getCostPerClass(coach)}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                            <button className="submit-btn" style={{ minWidth: 60, fontSize: 14, padding: '0.3rem 0.7rem' }} onClick={() => setShowCoachMessage(coach.user_id)}>Message</button>
                            <button className="submit-btn" style={{ minWidth: 60, fontSize: 14, padding: '0.3rem 0.7rem', background: '#e0e7ff', color: '#2563eb' }} onClick={() => setShowCoachProfile(coach.user_id)}>View Profile</button>
                            <button type="button" className="remove-btn" style={{ minWidth: 60, fontSize: 14, padding: '0.3rem 0.7rem' }} onClick={() => handleRemoveCoach(coach.user_id)} disabled={loading}>Remove</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Message Modal (dummy) */}
                {showCoachMessage && (
                  <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
                      <h3 style={{ marginTop: 0, marginBottom: 16, fontWeight: 700, fontSize: '1.3rem' }}>Send Message</h3>
                      <div style={{ marginBottom: 12 }}>This would open an email or SMS modal for coach ID: {showCoachMessage}</div>
                      <button className="remove-btn" style={{ marginTop: 24, minWidth: 100 }} onClick={() => setShowCoachMessage(null)}>Close</button>
                    </div>
                  </div>
                )}
                {/* View Profile Modal (dummy) */}
                {showCoachProfile && (
                  <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, maxWidth: 500, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
                      <h3 style={{ marginTop: 0, marginBottom: 16, fontWeight: 700, fontSize: '1.3rem' }}>Coach Profile</h3>
                      <div style={{ marginBottom: 12 }}>This would show a detailed profile for coach ID: {showCoachProfile} (class history, assigned clients, attendance trends, certificates, etc.)</div>
                      <button className="remove-btn" style={{ marginTop: 24, minWidth: 100 }} onClick={() => setShowCoachProfile(null)}>Close</button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
          {activeTab === 'classes' && (
            <section className="dashboard-section" style={{ paddingTop: '1rem' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#18181b', margin: 0, lineHeight: 1, marginBottom: '1.2rem', textAlign: 'center' }}>Class Management</h2>
              {/* Filters and View Toggle */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
                <select value={classFilterCoach} onChange={e => setClassFilterCoach(e.target.value)} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.5rem 1rem' }}>
                  <option value="">All Coaches</option>
                  {coaches.map(coach => <option key={coach.user_id} value={coach.user_id}>{coach.first_name} {coach.last_name}</option>)}
                </select>
                <select value={classFilterType} onChange={e => setClassFilterType(e.target.value)} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.5rem 1rem' }}>
                  <option value="">All Types</option>
                  {['Metcon','Strength','WOD','HIIT','Yoga'].map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <select value={classFilterTime} onChange={e => setClassFilterTime(e.target.value)} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.5rem 1rem' }}>
                  <option value="">All Times</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
                <button className="submit-btn" style={{ background: classView==='calendar'?'#3b82f6':'#e0e7ff', color: classView==='calendar'?'#fff':'#222', minWidth: 100 }} onClick={() => setClassView('calendar')}>Calendar</button>
                <button className="submit-btn" style={{ background: classView==='list'?'#3b82f6':'#e0e7ff', color: classView==='list'?'#fff':'#222', minWidth: 100 }} onClick={() => setClassView('list')}>List</button>
              </div>
              <div className="section-content" style={{ flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 1200, margin: '0 auto' }}>
                {/* Add Class Buttons and Templates */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <button className="submit-btn" style={{ maxWidth: 180 }} onClick={() => { setShowAddClass(true); setShowBatchAddClass(false); }}>
                    + Add Single Class
                  </button>
                  <button className="submit-btn" style={{ maxWidth: 180 }} onClick={() => { setShowBatchAddClass(true); setShowAddClass(false); }}>
                    + Add Multiple Classes
                  </button>
                  <select value={showClassTemplate} onChange={e => setShowClassTemplate(e.target.value)} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.5rem 1rem', minWidth: 140 }}>
                    <option value="">Use Template</option>
                    {classTemplates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                {/* Calendar or List View */}
                {classView === 'calendar' ? (
                  <div style={{ display: 'flex', gap: '2rem', width: '100%', alignItems: 'flex-start' }}>
                    <div style={{ flex: '0 0 480px', position: 'relative' }}>
                      <Calendar
                        onChange={setSelectedDate}
                        value={selectedDate}
                        tileClassName={({ date, view }) => {
                          const dstr = date.toISOString().slice(0, 10);
                          const classes = allClasses.filter(cls => cls.date === dstr);
                          if (isClassToday({date: dstr})) return 'class-day-today';
                          if (classes.some(isClassFull)) return 'class-day-full';
                          if (classes.some(isClassOpen)) return 'class-day-open';
                          if (classes.some(isClassPast)) return 'class-day-past';
                          return null;
                        }}
                        tileContent={({ date, view }) => {
                          const dstr = date.toISOString().slice(0, 10);
                          const classes = allClasses.filter(cls => cls.date === dstr);
                          if (classes.length === 0) return null;
                          return (
                            <span style={{ display: 'inline-block', marginLeft: 2 }}>
                              {classes.some(isClassFull) && <span style={{ color: '#e11d48', fontSize: 18 }}>●</span>}
                              {classes.some(isClassOpen) && <span style={{ color: '#10b981', fontSize: 18 }}>●</span>}
                            </span>
                          );
                        }}
                        onMouseOver={e => {
                          if (e.target && e.target.closest('.react-calendar__tile')) {
                            const date = e.target.closest('.react-calendar__tile').getAttribute('aria-label');
                            if (date) setHoveredDate(date);
                          }
                        }}
                        onMouseOut={() => setHoveredDate(null)}
                      />
                      {/* Hover Preview */}
                      {hoveredDate && (
                        <div style={{ position: 'absolute', left: 500, top: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 16, zIndex: 10, minWidth: 220 }}>
                          <div style={{ fontWeight: 700, marginBottom: 8 }}>{hoveredDate}</div>
                          {(allClasses.filter(cls => cls.date === hoveredDate).length === 0) ? (
                            <div style={{ color: '#64748b' }}>No classes</div>
                          ) : (
                            allClasses.filter(cls => cls.date === hoveredDate).map(cls => (
                              <div key={cls.id} style={{ marginBottom: 6 }}>
                                <div style={{ fontWeight: 600 }}>{cls.name}</div>
                                <div style={{ color: '#64748b', fontSize: 13 }}>{getClassType(cls)} | {cls.start_time}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {/* Today & Upcoming Classes Section */}
                    <div style={{ flex: '1', minWidth: 0, background: '#f8fafc', borderRadius: 16, padding: 24 }}>
                      {/* Today's Lessons */}
                      <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 16 }}>
                        <h4 style={{ marginBottom: 8, fontSize: '1.1rem', fontWeight: 700, position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>Today's Lessons</h4>
                        {filterClasses(allClasses.filter(cls => cls.date === new Date().toISOString().slice(0, 10))).length === 0 ? (
                          <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>No lessons today.</div>
                        ) : (
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {filterClasses(allClasses.filter(cls => cls.date === new Date().toISOString().slice(0, 10))).map(cls => {
                              const clients = getClassClients(cls);
                              return (
                                <li key={cls.id} style={{ background: '#fff', borderRadius: 8, marginBottom: 8, padding: '0.7rem 1rem', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{cls.name} <span style={{ color: isClassFull(cls)?'#e11d48':isClassOpen(cls)?'#10b981':'#64748b', fontWeight: 700, fontSize: 13, marginLeft: 8 }}>{isClassFull(cls)?'FULL':isClassOpen(cls)?'OPEN':''}</span></div>
                                  <div style={{ color: '#64748b', fontSize: '0.95rem' }}>{cls.start_time} - {cls.end_time} | {getClassType(cls)} | {getClassLevel(cls)} | {getClassLocation(cls)}</div>
                                  <div style={{ color: '#64748b', fontSize: '0.95rem' }}>Capacity: {cls.capacity} | Spots left: {cls.capacity - clients.length}</div>
                                  <div style={{ color: '#64748b', fontSize: '0.95rem' }}>Clients: {clients.slice(0,3).map(c => c.first_name).join(', ')}{clients.length > 3 ? ` +${clients.length-3} more` : ''}</div>
                                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                    <button className="submit-btn" style={{ minWidth: 60, height: 32 }} onClick={() => openEditClassModal(cls)}>Edit</button>
                                    <button className="remove-btn" style={{ minWidth: 60, height: 32 }} onClick={() => handleRemoveClass(cls.id)}>Cancel</button>
                                    {getClassZoom(cls) && <button className="submit-btn" style={{ minWidth: 60, height: 32, background: '#2563eb', color: '#fff' }} onClick={() => window.open(getClassZoom(cls), '_blank')}>Join Zoom</button>}
                                    {getClassNotes(cls) && <button className="submit-btn" style={{ minWidth: 60, height: 32, background: '#e0e7ff', color: '#2563eb' }} onClick={() => alert(getClassNotes(cls))}>View Notes</button>}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      {/* Upcoming Lessons */}
                      <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 0 }}>
                        <h4 style={{ marginBottom: 8, fontSize: '1.1rem', fontWeight: 700, position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>Upcoming Lessons</h4>
                        {filterClasses(allClasses.filter(cls => new Date(cls.date + 'T' + cls.start_time) > new Date())).length === 0 ? (
                          <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>No upcoming lessons.</div>
                        ) : (
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {filterClasses(allClasses.filter(cls => new Date(cls.date + 'T' + cls.start_time) > new Date())).map(cls => {
                              const clients = getClassClients(cls);
                              return (
                                <li key={cls.id} style={{ background: '#fff', borderRadius: 8, marginBottom: 8, padding: '0.7rem 1rem', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{cls.name} <span style={{ color: isClassFull(cls)?'#e11d48':isClassOpen(cls)?'#10b981':'#64748b', fontWeight: 700, fontSize: 13, marginLeft: 8 }}>{isClassFull(cls)?'FULL':isClassOpen(cls)?'OPEN':''}</span></div>
                                  <div style={{ color: '#64748b', fontSize: '0.95rem' }}>{cls.date} {cls.start_time} | {getClassType(cls)} | {getClassLevel(cls)} | {getClassLocation(cls)}</div>
                                  <div style={{ color: '#64748b', fontSize: '0.95rem' }}>Capacity: {cls.capacity} | Spots left: {cls.capacity - clients.length}</div>
                                  <div style={{ color: '#64748b', fontSize: '0.95rem' }}>Clients: {clients.slice(0,3).map(c => c.first_name).join(', ')}{clients.length > 3 ? ` +${clients.length-3} more` : ''}</div>
                                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                    <button className="submit-btn" style={{ minWidth: 60, height: 32 }} onClick={() => openEditClassModal(cls)}>Edit</button>
                                    <button className="remove-btn" style={{ minWidth: 60, height: 32 }} onClick={() => handleRemoveClass(cls.id)}>Cancel</button>
                                    {getClassZoom(cls) && <button className="submit-btn" style={{ minWidth: 60, height: 32, background: '#2563eb', color: '#fff' }} onClick={() => window.open(getClassZoom(cls), '_blank')}>Join Zoom</button>}
                                    {getClassNotes(cls) && <button className="submit-btn" style={{ minWidth: 60, height: 32, background: '#e0e7ff', color: '#2563eb' }} onClick={() => alert(getClassNotes(cls))}>View Notes</button>}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // List View
                  <div style={{ width: '100%', background: '#f8fafc', borderRadius: 16, padding: 24, marginTop: 12 }}>
                    <h4 style={{ marginBottom: 8, fontSize: '1.1rem', fontWeight: 700 }}>All Classes</h4>
                    {filterClasses(allClasses).length === 0 ? (
                      <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>No classes found.</div>
                    ) : (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {filterClasses(allClasses).map(cls => {
                          const clients = getClassClients(cls);
                          return (
                            <li key={cls.id} style={{ background: '#fff', borderRadius: 8, marginBottom: 8, padding: '0.7rem 1rem', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{cls.name} <span style={{ color: isClassFull(cls)?'#e11d48':isClassOpen(cls)?'#10b981':'#64748b', fontWeight: 700, fontSize: 13, marginLeft: 8 }}>{isClassFull(cls)?'FULL':isClassOpen(cls)?'OPEN':''}</span></div>
                              <div style={{ color: '#64748b', fontSize: '0.95rem' }}>{cls.date} {cls.start_time} | {getClassType(cls)} | {getClassLevel(cls)} | {getClassLocation(cls)}</div>
                              <div style={{ color: '#64748b', fontSize: '0.95rem' }}>Capacity: {cls.capacity} | Spots left: {cls.capacity - clients.length}</div>
                              <div style={{ color: '#64748b', fontSize: '0.95rem' }}>Clients: {clients.slice(0,3).map(c => c.first_name).join(', ')}{clients.length > 3 ? ` +${clients.length-3} more` : ''}</div>
                              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                <button className="submit-btn" style={{ minWidth: 60, height: 32 }} onClick={() => openEditClassModal(cls)}>Edit</button>
                                <button className="remove-btn" style={{ minWidth: 60, height: 32 }} onClick={() => handleRemoveClass(cls.id)}>Cancel</button>
                                {getClassZoom(cls) && <button className="submit-btn" style={{ minWidth: 60, height: 32, background: '#2563eb', color: '#fff' }} onClick={() => window.open(getClassZoom(cls), '_blank')}>Join Zoom</button>}
                                {getClassNotes(cls) && <button className="submit-btn" style={{ minWidth: 60, height: 32, background: '#e0e7ff', color: '#2563eb' }} onClick={() => alert(getClassNotes(cls))}>View Notes</button>}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
                {/* Add Class Forms: Add recurring, templates, new fields */}
                {showAddClass && (
                  <form className="client-form" onSubmit={handleAddClass} style={{ marginBottom: 24 }}>
                    <div className="client-form-row">
                      <input type="text" name="name" value={classForm.name} onChange={handleClassInput} placeholder="Class Name" required />
                      <input type="text" name="description" value={classForm.description} onChange={handleClassInput} placeholder="Description" />
                    </div>
                    <div className="client-form-row">
                      <input type="datetime-local" name="start_time" value={classForm.start_time} onChange={handleClassInput} required />
                      <input type="number" name="duration" value={classForm.duration} onChange={handleClassInput} placeholder="Duration (minutes)" min="1" required />
                    </div>
                    <div className="client-form-row">
                      <select name="coach_id" value={classForm.coach_id} onChange={handleClassInput} required>
                        <option value="">Select Coach</option>
                        {coaches.map(coach => (
                          <option key={coach.user_id} value={coach.user_id}>
                            {coach.first_name} {coach.last_name}
                          </option>
                        ))}
                      </select>
                      <input type="number" name="capacity" value={classForm.capacity} onChange={handleClassInput} placeholder="Capacity" min="1" required />
                      <select name="target_level" value={classForm.target_level || ''} onChange={handleClassInput} style={{ minWidth: 120 }}>
                        <option value="">Target Level</option>
                        {classLevels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                      </select>
                      <select name="location" value={classForm.location || ''} onChange={handleClassInput} style={{ minWidth: 120 }}>
                        <option value="">Location</option>
                        {classLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      </select>
                    </div>
                    <div className="client-form-row">
                      <label style={{ fontWeight: 600, marginRight: 8 }}>Recurring?</label>
                      <input type="checkbox" name="recurring" checked={!!classForm.recurring} onChange={e => setClassForm(f => ({ ...f, recurring: e.target.checked }))} />
                      {classForm.recurring && (
                        <>
                          <label style={{ fontWeight: 600, marginLeft: 16, marginRight: 8 }}>Repeat:</label>
                          <select name="recurring_day" value={classForm.recurring_day || ''} onChange={handleClassInput} style={{ minWidth: 100 }}>
                            <option value="">Day</option>
                            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <option key={day} value={day}>{day}</option>)}
                          </select>
                          <input type="number" name="recurring_weeks" value={classForm.recurring_weeks || ''} onChange={handleClassInput} placeholder="Weeks" min="1" max="12" style={{ minWidth: 60 }} />
                        </>
                      )}
                    </div>
                    <button type="submit" className="submit-btn" disabled={loading}>Add Class</button>
                    <button type="button" className="remove-btn" style={{ marginLeft: 8 }} onClick={() => setShowAddClass(false)}>Cancel</button>
                  </form>
                )}
                {showBatchAddClass && (
                  <form className="client-form" onSubmit={handleAddBatchClasses} style={{ marginBottom: 24, width: '100%', maxWidth: 800 }}>
                    <div className="client-form-row">
                      <input type="text" name="name" value={batchClassForm.name} onChange={handleBatchClassInput} placeholder="Class Name" required />
                      <input type="text" name="description" value={batchClassForm.description} onChange={handleBatchClassInput} placeholder="Description" />
                    </div>
                    <div className="client-form-row">
                      <input type="time" name="start_time" value={batchClassForm.start_time} onChange={handleBatchClassInput} required />
                      <input type="number" name="duration" value={batchClassForm.duration} onChange={handleBatchClassInput} placeholder="Duration (minutes)" min="1" required />
                    </div>
                    <div className="client-form-row">
                      <select name="coach_id" value={batchClassForm.coach_id} onChange={handleBatchClassInput} required>
                        <option value="">Select Coach</option>
                        {coaches.map(coach => (
                          <option key={coach.user_id} value={coach.user_id}>
                            {coach.first_name} {coach.last_name}
                          </option>
                        ))}
                      </select>
                      <input type="number" name="capacity" value={batchClassForm.capacity} onChange={handleBatchClassInput} placeholder="Capacity" min="1" required />
                      <select name="target_level" value={batchClassForm.target_level || ''} onChange={handleBatchClassInput} style={{ minWidth: 120 }}>
                        <option value="">Target Level</option>
                        {classLevels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                      </select>
                      <select name="location" value={batchClassForm.location || ''} onChange={handleBatchClassInput} style={{ minWidth: 120 }}>
                        <option value="">Location</option>
                        {classLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      </select>
                    </div>
                    <div className="client-form-row">
                      <input type="date" name="start_date" value={batchClassForm.start_date} onChange={handleBatchClassInput} required />
                      <input type="date" name="end_date" value={batchClassForm.end_date} onChange={handleBatchClassInput} required />
                    </div>
                    <div className="client-form-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                      <label style={{ fontWeight: 600, marginRight: 8 }}>Days of Week:</label>
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
                        <label key={day} style={{ marginRight: 8 }}>
                          <input
                            type="checkbox"
                            name="days_of_week"
                            value={day}
                            checked={batchClassForm.days_of_week.includes(day)}
                            onChange={handleBatchClassInput}
                          /> {day}
                        </label>
                      ))}
                    </div>
                    <div className="client-form-row">
                      <label style={{ fontWeight: 600, marginRight: 8 }}>Template:</label>
                      <select value={showClassTemplate} onChange={e => setShowClassTemplate(e.target.value)} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.5rem 1rem', minWidth: 140 }}>
                        <option value="">None</option>
                        {classTemplates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                      <button type="submit" className="submit-btn" disabled={loading}>Create Classes</button>
                      <button type="button" className="remove-btn" onClick={() => setShowBatchAddClass(false)}>Cancel</button>
                    </div>
                  </form>
                )}
                {classMessage && <div className="coach-message">{classMessage}</div>}
              </div>
            </section>
          )}
        </main>
      </div>
      {showSignupsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontWeight: 700, fontSize: '1.3rem' }}>Class Signups</h3>
            {signupsLoading ? (
              <div>Loading...</div>
            ) : signupsList.length === 0 ? (
              <div style={{ color: '#64748b' }}>No users have signed up for this class.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {signupsList.map((signup, idx) => (
                  <li key={signup.user_id} style={{ padding: '0.5rem 0', borderBottom: idx !== signupsList.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                    <div style={{ fontWeight: 600 }}>{signup.user?.first_name} {signup.user?.last_name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.95rem' }}>{signup.user?.email}</div>
                  </li>
                ))}
              </ul>
            )}
            <button className="remove-btn" style={{ marginTop: 24, minWidth: 100 }} onClick={() => setShowSignupsModal(false)}>Close</button>
            {signupsCapacity !== null && (
              <div style={{ marginBottom: 12, color: '#18181b', fontWeight: 500 }}>
                Capacity: {signupsCount} / {signupsCapacity} ({signupsCapacity - signupsCount} spots left)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard; 