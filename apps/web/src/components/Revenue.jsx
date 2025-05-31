import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import './Revenue.css';

const Revenue = () => {
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    activeSubscriptions: 0,
    plans: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Gym profile not found');

      // Fetch all payment plans for the gym
      const { data: plans } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('gym_id', profile.gym_id);

      if (!plans) throw new Error('No payment plans found');

      // Fetch all users with active subscriptions
      const { data: users } = await supabase
        .from('user_profiles')
        .select(`
          payment_plan_id,
          plan_start_date,
          plan_end_date,
          payment_plans (
            price,
            name
          )
        `)
        .eq('gym_id', profile.gym_id)
        .not('payment_plan_id', 'is', null);

      if (!users) throw new Error('No users found');

      // Calculate revenue data
      const now = new Date();
      const activeUsers = users.filter(user => 
        new Date(user.plan_end_date) > now
      );

      const planStats = plans.map(plan => {
        const planUsers = activeUsers.filter(user => 
          user.payment_plan_id === plan.id
        );
        return {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          subscribers: planUsers.length,
          revenue: planUsers.length * plan.price
        };
      });

      const totalRevenue = planStats.reduce((sum, plan) => sum + plan.revenue, 0);

      setRevenueData({
        totalRevenue,
        activeSubscriptions: activeUsers.length,
        plans: planStats
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="revenue-container">
        <div className="loading">Loading revenue data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="revenue-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="revenue-container">
      <div className="revenue-header">
        <h2>Revenue Overview</h2>
        <div className="revenue-stats">
          <div className="stat-card">
            <h3>Total Monthly Revenue</h3>
            <p className="stat-value">${revenueData.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <h3>Active Subscriptions</h3>
            <p className="stat-value">{revenueData.activeSubscriptions}</p>
          </div>
        </div>
      </div>

      <div className="plans-overview">
        <h3>Plans Overview</h3>
        <div className="plans-grid">
          {revenueData.plans.map(plan => (
            <div key={plan.id} className="plan-card">
              <h4>{plan.name}</h4>
              <div className="plan-stats">
                <div className="plan-stat">
                  <span className="stat-label">Price</span>
                  <span className="stat-value">${plan.price}/month</span>
                </div>
                <div className="plan-stat">
                  <span className="stat-label">Subscribers</span>
                  <span className="stat-value">{plan.subscribers}</span>
                </div>
                <div className="plan-stat">
                  <span className="stat-label">Revenue</span>
                  <span className="stat-value">${plan.revenue.toFixed(2)}/month</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Revenue; 