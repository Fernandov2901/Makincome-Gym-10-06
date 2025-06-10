import React, { useState } from 'react';
import logoHandshake from '../assets/logo-handshake.png'; // Use the handshake logo
import logoMakincome from '../assets/logo-makincome-new.png';
import './Login.css';

export default function Login({ onLogin }) {
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      if (onLogin) {
        await onLogin({ email, password, role });
        setMessage({ type: 'success', text: 'Login successful!' });
      } else {
        // fallback: just show success
        setMessage({ type: 'success', text: 'Login successful!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split-bg">
      <div className="login-split-left">
        <img src={logoHandshake} alt="Handshake Logo" className="login-gym-photo" />
        <div className="login-left-overlay">
          <img src={logoMakincome} alt="Makincome Gym" className="login-logo" />
          <h1 className="login-title">Trusted by thousands of gyms</h1>
        </div>
      </div>
      <div className="login-split-right">
        <div className="login-welcome-box">
          <h2>We're glad you're here!</h2>
          <p style={{ color: '#64748b', marginBottom: 32 }}>How will you be using Makincome Gym?</p>
          <div className="login-role-cards">
            <div className={`login-role-card${role === 'owner' ? ' selected' : ''}`} onClick={() => handleRoleSelect('owner')}>
              <div className="login-role-icon" role="img" aria-label="Owner">🏢</div>
              <div className="login-role-title">As a gym owner/manager</div>
            </div>
            <div className={`login-role-card${role === 'member' ? ' selected' : ''}`} onClick={() => handleRoleSelect('member')}>
              <div className="login-role-icon" role="img" aria-label="Member">💪</div>
              <div className="login-role-title">As a gym member/employee</div>
            </div>
          </div>
          {role && (
            <form className="login-form" onSubmit={handleSubmit} style={{ marginTop: 32 }}>
              <h3 style={{ marginBottom: 16, textAlign: 'center' }}>
                {role === 'owner' ? 'Gym Owner/Manager Login' : 'Gym Member/Employee Login'}
              </h3>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
                className="login-input"
                autoComplete="username"
                style={{ marginBottom: 16 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
                className="login-input"
                autoComplete="current-password"
                style={{ marginBottom: 16 }}
          />
              <button className="login-btn" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        {message.text && (
          <div className={`login-message ${message.type}`}>{message.text}</div>
        )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 