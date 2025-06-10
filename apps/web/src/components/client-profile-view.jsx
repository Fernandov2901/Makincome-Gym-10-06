import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';

// Helper for euro formatting
const euro = (value) => `€${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ClientProfileView({ clientId, onClose, clients, plans }) {
  const [loading, setLoading] = useState(true);
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [clientStats, setClientStats] = useState({
    totalClassesAttended: 0,
    totalPayments: 0,
    paymentsAmount: 0
  });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!clientId) return;
    
    const fetchClientData = async () => {
      setLoading(true);
      try {
        // Fetch client's enrolled classes
        const { data: signups, error: signupsError } = await supabase
          .from('class_signups')
          .select(`
            id,
            created_at,
            classes (
              id,
              name,
              description,
              date,
              start_time,
              end_time,
              capacity,
              category,
              coaches (
                first_name,
                last_name
              )
            )
          `)
          .eq('user_id', clientId);
          
        if (signupsError) throw signupsError;
        
        // Fetch payment history
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', clientId);
          
        if (paymentsError) throw paymentsError;
        
        // Calculate statistics
        const stats = {
          totalClassesAttended: signups?.length || 0,
          totalPayments: payments?.length || 0,
          paymentsAmount: payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
        };
        
        // Format classes data
        const classesData = signups?.map(signup => signup.classes).filter(Boolean) || [];
        
        // Combine history
        const historyItems = [
          ...(signups || []).map(signup => ({
            date: signup.created_at,
            type: 'class-signup',
            details: `Enrolled in ${signup.classes?.name || 'a class'}`,
            data: signup.classes
          })),
          ...(payments || []).map(payment => ({
            date: payment.created_at,
            type: 'payment',
            details: `Payment of ${euro(payment.amount)} for ${payment.description || 'services'}`,
            data: payment
          }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setEnrolledClasses(classesData);
        setClientStats(stats);
        setHistory(historyItems);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching client data:', error);
        setLoading(false);
      }
    };
    
    fetchClientData();
  }, [clientId]);
  
  const client = clients.find(c => c.user_id === clientId);
  const clientPlan = client?.payment_plan_id ? plans.find(p => p.id === client.payment_plan_id) : null;
  
  if (!client) return null;
  
  const planStartDate = client.plan_start_date ? new Date(client.plan_start_date) : null;
  const planEndDate = client.plan_end_date ? new Date(client.plan_end_date) : null;
  const today = new Date();
  
  // Calculate the progress percentage for the timeline
  const calculateProgress = () => {
    if (!planStartDate || !planEndDate) return 0;
    const totalDuration = planEndDate.getTime() - planStartDate.getTime();
    const elapsed = today.getTime() - planStartDate.getTime();
    return Math.min(Math.max(0, Math.floor((elapsed / totalDuration) * 100)), 100);
  };
  
  const progress = calculateProgress();
  const isActive = planEndDate ? today < planEndDate : false;
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      background: 'rgba(0,0,0,0.4)', 
      zIndex: 1000, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{ 
        background: '#fff', 
        borderRadius: 16, 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', 
        width: '90%', 
        maxWidth: 960, 
        maxHeight: '90vh', 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: '1.75rem' }}>Client Profile</h2>
          <button 
            className="remove-btn" 
            onClick={onClose}
            style={{ minWidth: 80 }}
          >
            Close
          </button>
        </div>
        
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            Loading client data...
          </div>
        ) : (
          <div style={{ padding: '1.5rem 2rem' }}>
            {/* Profile Header */}
            <div style={{ 
              display: 'flex', 
              gap: 24, 
              alignItems: 'center', 
              marginBottom: 36,
              flexWrap: 'wrap'
            }}>
              <div style={{ 
                width: 96, 
                height: 96, 
                borderRadius: '50%', 
                background: '#e0e7ff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: 36,
                fontWeight: 700,
                color: '#4f46e5'
              }}>
                {client.first_name?.[0]}{client.last_name?.[0]}
              </div>
              
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '1.75rem', 
                  fontWeight: 700 
                }}>
                  {client.first_name} {client.last_name}
                </h3>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ color: '#6b7280' }}>
                    <span style={{ marginRight: 8 }}>📧</span>
                    {client.email}
                  </div>
                  <div style={{ color: '#6b7280' }}>
                    <span style={{ marginRight: 8 }}>📱</span>
                    {client.phone || 'No phone'}
                  </div>
                </div>
                <div style={{ 
                  marginTop: 12, 
                  display: 'inline-block', 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: 20, 
                  background: isActive ? '#dcfce7' : '#fee2e2', 
                  color: isActive ? '#166534' : '#b91c1c',
                  fontSize: 14,
                  fontWeight: 500
                }}>
                  {isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
            
            {/* Timeline Section */}
            {planStartDate && planEndDate && (
              <div style={{ marginBottom: 36 }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>Membership Timeline</h4>
                <div style={{ background: '#f3f4f6', borderRadius: 12, padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 500 }}>{planStartDate.toLocaleDateString()}</div>
                    <div style={{ fontWeight: 500 }}>{planEndDate.toLocaleDateString()}</div>
                  </div>
                  <div style={{ position: 'relative', height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: 0, 
                      top: 0, 
                      height: '100%', 
                      width: `${progress}%`, 
                      background: '#4f46e5', 
                      borderRadius: 4 
                    }} />
                    {progress > 5 && progress < 95 && (
                      <div style={{ 
                        position: 'absolute', 
                        left: `${progress}%`, 
                        top: -24, 
                        transform: 'translateX(-50%)',
                        background: '#18181b',
                        color: 'white',
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 4
                      }}>
                        Today
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 600 }}>
                      {clientPlan?.name || 'Unknown Plan'} - {euro(clientPlan?.price || 0)}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
                      {progress}% complete
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Two-column layout for the rest */}
            <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap' }}>
              {/* Left column */}
              <div style={{ flex: '1 1 400px' }}>
                {/* Enrolled Classes */}
                <div style={{ marginBottom: 32 }}>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>Registered Classes</h4>
                  {enrolledClasses.length === 0 ? (
                    <div style={{ padding: '1.5rem', background: '#f9fafb', borderRadius: 8, color: '#6b7280', textAlign: 'center' }}>
                      Not enrolled in any classes
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {enrolledClasses.map((cls, index) => (
                        <div key={index} style={{ 
                          padding: '12px 16px', 
                          background: '#f9fafb', 
                          borderRadius: 8,
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ fontWeight: 600, fontSize: 16 }}>{cls.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: 14, marginTop: 4 }}>
                            <span>{cls.date} • {cls.start_time} - {cls.end_time}</span>
                            <span>{cls.coaches?.first_name} {cls.coaches?.last_name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Weight Progression Placeholder */}
                <div style={{ marginBottom: 32 }}>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>Weight Progression</h4>
                  <div style={{ 
                    padding: '2rem', 
                    background: '#f9fafb', 
                    borderRadius: 8, 
                    border: '1px dashed #d1d5db',
                    color: '#6b7280',
                    textAlign: 'center'
                  }}>
                    <p>Weight progression will appear once logged in client app</p>
                  </div>
                </div>
              </div>
              
              {/* Right column */}
              <div style={{ flex: '1 1 300px' }}>
                {/* Statistics Panel */}
                <div style={{ marginBottom: 32 }}>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>Statistics</h4>
                  <div style={{ 
                    background: '#f9fafb', 
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                      <div style={{ padding: '16px', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: 14, color: '#6b7280' }}>Classes Attended</div>
                        <div style={{ fontSize: 24, fontWeight: 700 }}>{clientStats.totalClassesAttended}</div>
                      </div>
                      <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: 14, color: '#6b7280' }}>Total Payments</div>
                        <div style={{ fontSize: 24, fontWeight: 700 }}>{clientStats.totalPayments}</div>
                      </div>
                      <div style={{ padding: '16px', borderRight: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: 14, color: '#6b7280' }}>Status</div>
                        <div style={{ 
                          fontSize: 18, 
                          fontWeight: 600, 
                          color: isActive ? '#166534' : '#b91c1c' 
                        }}>
                          {isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      <div style={{ padding: '16px' }}>
                        <div style={{ fontSize: 14, color: '#6b7280' }}>Total Spent</div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{euro(clientStats.paymentsAmount)}</div>
                      </div>
                    </div>
                    <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Plan Period</div>
                      <div style={{ fontSize: 15 }}>
                        <span style={{ fontWeight: 500 }}>
                          {planStartDate ? planStartDate.toLocaleDateString() : 'N/A'}
                        </span> 
                        {' to '}
                        <span style={{ fontWeight: 500 }}>
                          {planEndDate ? planEndDate.toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Custom Client Page Button */}
                <div style={{ marginBottom: 32 }}>
                  <button
                    className="submit-btn"
                    style={{ width: '100%', padding: '12px', fontSize: 16 }}
                    onClick={() => {
                      // This would navigate to a custom page for the client
                      alert('This would open a custom page for this client');
                    }}
                  >
                    Open Custom Client Page
                  </button>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                    Create a personalized page with notes, messages, and progress
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>Recent Activity</h4>
                  {history.length === 0 ? (
                    <div style={{ padding: '1.5rem', background: '#f9fafb', borderRadius: 8, color: '#6b7280', textAlign: 'center' }}>
                      No recent activity
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto' }}>
                      {history.slice(0, 10).map((item, index) => (
                        <div key={index} style={{ 
                          padding: '12px 16px', 
                          background: '#f9fafb', 
                          borderRadius: 8,
                          borderLeft: `4px solid ${item.type === 'payment' ? '#4ade80' : '#60a5fa'}`,
                        }}>
                          <div style={{ fontSize: 14, color: '#6b7280' }}>
                            {new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <div style={{ fontWeight: 500, marginTop: 4 }}>{item.details}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientProfileView; 