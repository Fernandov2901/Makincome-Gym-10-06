import React, { useState } from "react";
import supabase from "../../supabaseClient";
import ChangePasswordModal from "./ChangePasswordModal";

export default function OwnerProfileSection({ userData }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: userData?.first_name || '',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    gymName: userData?.gym_name || '',
    address: userData?.address || '',
    timezone: userData?.timezone || 'UTC'
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          timezone: formData.timezone
        })
        .eq('user_id', userData.id);
      
      if (profileError) throw profileError;
      
      // Update gym details if owner
      if (userData.gym_id) {
        const { error: gymError } = await supabase
          .from('gyms')
          .update({
            gym_name: formData.gymName,
            address: formData.address
          })
          .eq('id', userData.gym_id);
        
        if (gymError) throw gymError;
      }
      
      // Update email if changed (requires re-authentication)
      if (formData.email !== userData.email) {
        const { error: emailError } = await supabase.auth.updateUser({ 
          email: formData.email 
        });
        
        if (emailError) throw emailError;
      }
      
      setMessage({
        text: 'Profile updated successfully!',
        type: 'success'
      });
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({
        text: `Error: ${error.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h3>Owner Profile</h3>
        <p>Update your profile information and business details</p>
      </div>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form className="settings-form" onSubmit={handleSave}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              disabled={!editing}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              disabled={!editing}
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={!editing}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            disabled={!editing}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="gymName">Business Name</label>
          <input
            type="text"
            id="gymName"
            name="gymName"
            value={formData.gymName}
            onChange={handleChange}
            disabled={!editing}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="address">Business Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            disabled={!editing}
            rows="3"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="timezone">Timezone</label>
          <select
            id="timezone"
            name="timezone"
            value={formData.timezone}
            onChange={handleChange}
            disabled={!editing}
          >
            <option value="UTC">UTC (Coordinated Universal Time)</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Australia/Sydney">Sydney (AEST)</option>
          </select>
        </div>
        
        <div className="form-actions">
          {editing ? (
            <>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setEditing(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setEditing(true)}
              >
                Edit Profile
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowPasswordModal(true)}
              >
                Change Password
              </button>
            </>
          )}
        </div>
      </form>
      
      {showPasswordModal && (
        <ChangePasswordModal 
          onClose={() => setShowPasswordModal(false)} 
        />
      )}
    </div>
  );
} 