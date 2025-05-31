import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../supabaseClient';
import './Login.css';
import logoMakincome from '../assets/logo-makincome.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Get user profile to check user type
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('user_id', data.user.id)
        .single();

      if (profileError) throw profileError;

      setMessage({
        type: 'success',
        text: 'Login successful!'
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <style>{`
        .login-bg {
          min-height: 100vh;
          width: 100vw;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-card {
          background: #fff;
          border-radius: 1.5rem;
          box-shadow: 0 4px 32px 0 rgba(31, 38, 135, 0.08);
          padding: 2.5rem 2.5rem 2rem 2.5rem;
          max-width: 370px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-left: 0 !important;
        }
        .login-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 0 1.5rem 0;
          width: 100%;
        }
        .login-logo img {
          height: 44px;
          margin: 0;
          display: block;
        }
        .login-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 2rem;
          color: #18181b;
          text-align: center;
          width: 100%;
        }
        .login-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }
        .login-form input {
          width: 100%;
          padding: 0.8rem 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.8rem;
          font-size: 1rem;
          transition: border 0.18s;
          outline: none;
        }
        .login-form input:focus {
          border: 1.5px solid #2563eb;
        }
        .login-btn {
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 2rem;
          padding: 0.9rem 0;
          font-size: 1.1rem;
          font-weight: 700;
          margin-top: 0.5rem;
          cursor: pointer;
          transition: background 0.15s;
        }
        .login-btn:hover {
          background: #1d4ed8;
        }
        .login-message {
          margin-top: 1rem;
          text-align: center;
          font-size: 1rem;
          border-radius: 0.7rem;
          padding: 0.7rem 1rem;
        }
        .login-message.error {
          background: #fee2e2;
          color: #b91c1c;
        }
        .login-message.success {
          background: #dcfce7;
          color: #166534;
        }
        .login-signup-link {
          margin-top: 1.5rem;
          text-align: center;
          width: 100%;
          color: #64748b;
          font-size: 1rem;
        }
        .login-signup-link a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
          margin-left: 0.3rem;
          transition: color 0.15s;
        }
        .login-signup-link a:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }
        @media (max-width: 600px) {
          .login-card {
            padding: 1.2rem 0.5rem 1.2rem 0.5rem;
            max-width: 98vw;
          }
          .login-title {
            font-size: 1.1rem;
          }
        }
      `}</style>
      <div className="login-card">
        <div className="login-logo">
          <img src={logoMakincome} alt="Makincome Logo" />
        </div>
        <div className="login-title">Sign in to Makincome</div>
        <form className="login-form" onSubmit={handleAuth}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        {message.text && (
          <div className={`login-message ${message.type}`}>{message.text}</div>
        )}
        <div className="login-signup-link">
          Don&apos;t have an account? <Link to="/register-owner">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login; 