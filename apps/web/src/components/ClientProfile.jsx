import React, { useEffect, useState } from 'react';
import supabase from '../supabaseClient';

const ClientProfile = () => {
  const [client, setClient] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setClient(profile);
      if (profile && profile.payment_plan_id) {
        const { data: planData } = await supabase
          .from('payment_plans')
          .select('*')
          .eq('id', profile.payment_plan_id)
          .single();
        setPlan(planData);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', background: '#f8fafc', borderRadius: 16, padding: '2.5rem 2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 24, textAlign: 'center', color: '#18181b' }}>Profile</h2>
      <div style={{ marginBottom: 18 }}><strong>Name:</strong> {client?.first_name} {client?.last_name}</div>
      <div style={{ marginBottom: 18 }}><strong>Email:</strong> {client?.email}</div>
      <div style={{ marginBottom: 18 }}><strong>Phone:</strong> {client?.phone || '-'}</div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '2rem 0 1rem 0', color: '#2196f3' }}>Your Plan</h3>
      {plan ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 8 }}>
          <div><strong>Name:</strong> {plan.name}</div>
          <div><strong>Price:</strong> €{plan.price}</div>
          <div><strong>Duration:</strong> {plan.duration} months</div>
          <div><strong>Start:</strong> {client.plan_start_date?.slice(0,10)}</div>
          <div><strong>End:</strong> {client.plan_end_date?.slice(0,10) || 'Ongoing'}</div>
        </div>
      ) : (
        <div style={{ color: '#e11d48' }}>No plan assigned.</div>
      )}
    </div>
  );
};

export default ClientProfile; 