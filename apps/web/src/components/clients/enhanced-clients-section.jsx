import React, { useState, useEffect } from 'react';
import supabase from '../../supabaseClient';
import ClientsTable from './clients-table';
import { UserAddIcon } from '../icons/icons';
import ClientProfileModal from '../client-profile-view';

const EnhancedClientsSection = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [viewClientProfile, setViewClientProfile] = useState(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showEditClient, setShowEditClient] = useState(null);
  const [clientMessage, setClientMessage] = useState('');
  const [clientLoading, setClientLoading] = useState(false);
  
  // New client form state
  const [newClient, setNewClient] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    planId: '',
  });
  
  // Edit client form state
  const [editClientForm, setEditClientForm] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '', 
    planId: '' 
  });
  const [editClientLoading, setEditClientLoading] = useState(false);
  const [editClientMessage, setEditClientMessage] = useState('');
  
  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchPlans(), fetchClients()]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Fetch plans
  const fetchPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      
      if (!ownerProfile) {
        throw new Error('Owner profile not found');
      }
      
      const { data: plans, error } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('gym_id', ownerProfile.gym_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPlans(plans || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };
  
  // Fetch clients
  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
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
  
  // Edit client useEffect
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
  
  // Handle add client
  const handleAddClient = async (e) => {
    e.preventDefault();
    setClientLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();
      
      // Create auth user
      const password = Math.random().toString(36).slice(-8);
      const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
        email: newClient.email,
        password,
        email_confirm: true
      });
      
      if (authError) throw authError;
      
      // Create profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: newUser.user.id,
          first_name: newClient.firstName,
          last_name: newClient.lastName,
          email: newClient.email,
          phone: newClient.phone,
          payment_plan_id: newClient.planId || null,
          plan_start_date: new Date().toISOString(),
          gym_id: ownerProfile.gym_id,
          user_type: 'user'
        });
      
      if (profileError) throw profileError;
      
      // Log the action
      await supabase.from('audit_logs').insert({
        action: 'create_client',
        user_id: user.id,
        details: JSON.stringify({ 
          client_id: newUser.user.id,
          timestamp: new Date().toISOString()
        })
      });
      
      setClientMessage('Client added successfully! Temporary password: ' + password);
      
      // Reset form and refresh client list
      setTimeout(() => {
        setClientMessage('');
        setShowAddClient(false);
        setNewClient({
          email: '',
          firstName: '',
          lastName: '',
          phone: '',
          planId: ''
        });
        fetchClients();
      }, 3000);
      
    } catch (error) {
      console.error('Error adding client:', error);
      setClientMessage(`Error: ${error.message}`);
    } finally {
      setClientLoading(false);
    }
  };
  
  // Handle edit client
  const handleEditClient = async (e) => {
    e.preventDefault();
    setEditClientLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update profile
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: editClientForm.firstName,
          last_name: editClientForm.lastName,
          email: editClientForm.email,
          phone: editClientForm.phone,
          payment_plan_id: editClientForm.planId || null
        })
        .eq('user_id', showEditClient);
      
      if (error) throw error;
      
      // Log the action
      await supabase.from('audit_logs').insert({
        action: 'update_client',
        user_id: user.id,
        details: JSON.stringify({ 
          client_id: showEditClient,
          timestamp: new Date().toISOString()
        })
      });
      
      setEditClientMessage('Client updated successfully!');
      
      // Refresh client list
      setTimeout(() => {
        setEditClientMessage('');
        setShowEditClient(null);
        fetchClients();
      }, 1500);
      
    } catch (error) {
      console.error('Error updating client:', error);
      setEditClientMessage(`Error: ${error.message}`);
    } finally {
      setEditClientLoading(false);
    }
  };
  
  // Handle delete client
  const handleDeleteClient = async (clientId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Delete user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', clientId);
        
      if (profileError) throw profileError;
      
      // Log the action
      await supabase.from('audit_logs').insert({
        action: 'delete_client',
        user_id: user.id,
        details: JSON.stringify({ 
          client_id: clientId,
          timestamp: new Date().toISOString()
        })
      });
      
      // Refresh client list
      fetchClients();
      
    } catch (error) {
      console.error('Error deleting client:', error);
      alert(`Error: ${error.message}`);
    }
  };
  
  return (
    <div className="dashboard-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Clients</h2>
        <button
          className="submit-btn"
          onClick={() => setShowAddClient(true)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
            border: 'none',
            color: 'white',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
        >
          <UserAddIcon className="icon-sm" />
          Add New Client
        </button>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          Loading clients...
        </div>
      ) : (
        <ClientsTable 
          clients={clients}
          plans={plans}
          onViewClient={(clientId) => setViewClientProfile(clientId)}
          onEditClient={(clientId) => setShowEditClient(clientId)}
          onDeleteClient={handleDeleteClient}
          onRefresh={fetchClients}
        />
      )}
      
      {/* Client profile modal */}
      {viewClientProfile && (
        <ClientProfileModal 
          clientId={viewClientProfile} 
          onClose={() => setViewClientProfile(null)} 
          clients={clients}
          plans={plans}
        />
      )}
      
      {/* Add client modal */}
      {showAddClient && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3>Add New Client</h3>
            <form onSubmit={handleAddClient}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={newClient.firstName}
                    onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={newClient.lastName}
                    onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Payment Plan
                </label>
                <select
                  name="planId"
                  value={newClient.planId}
                  onChange={(e) => setNewClient({ ...newClient, planId: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                >
                  <option value="">No Plan</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - €{Number(plan.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>
              
              {clientMessage && (
                <div className={`message ${clientMessage.includes('Error') ? 'error' : 'success'}`}>
                  {clientMessage}
                </div>
              )}
              
              <div className="modal-buttons">
                <button 
                  type="button" 
                  className="remove-btn"
                  onClick={() => setShowAddClient(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={clientLoading}
                >
                  {clientLoading ? 'Adding...' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit client modal */}
      {showEditClient && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3>Edit Client</h3>
            <form onSubmit={handleEditClient}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={editClientForm.email}
                  onChange={(e) => setEditClientForm({ ...editClientForm, email: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={editClientForm.firstName}
                    onChange={(e) => setEditClientForm({ ...editClientForm, firstName: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={editClientForm.lastName}
                    onChange={(e) => setEditClientForm({ ...editClientForm, lastName: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={editClientForm.phone}
                  onChange={(e) => setEditClientForm({ ...editClientForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Payment Plan
                </label>
                <select
                  name="planId"
                  value={editClientForm.planId}
                  onChange={(e) => setEditClientForm({ ...editClientForm, planId: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                >
                  <option value="">No Plan</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - €{Number(plan.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>
              
              {editClientMessage && (
                <div className={`message ${editClientMessage.includes('Error') ? 'error' : 'success'}`}>
                  {editClientMessage}
                </div>
              )}
              
              <div className="modal-buttons">
                <button 
                  type="button" 
                  className="remove-btn"
                  onClick={() => setShowEditClient(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={editClientLoading}
                >
                  {editClientLoading ? 'Updating...' : 'Update Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedClientsSection; 