import { useState } from 'react'
import supabase from '../supabaseClient'
import './OwnerRegistration.css'
import logoMakincome from '../assets/logo-makincome.png';
import { Link } from 'react-router-dom';

function OwnerRegistration() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    gymName: '',
    gymAddress: '',
    gymPhone: ''
  })
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            user_type: 'owner'
          }
        }
      })

      if (authError) throw authError

      // Wait for the user to be authenticated and get the correct user_id
      let userId = null
      for (let i = 0; i < 10; i++) {
        const { data: userData } = await supabase.auth.getUser()
        if (userData && userData.user && userData.user.id) {
          userId = userData.user.id
          break
        }
        await new Promise(res => setTimeout(res, 300))
      }
      if (!userId) throw new Error('Could not get authenticated user after sign up.')

      // Upsert the owner profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert([
          {
            user_id: userId,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            user_type: 'owner'
          }
        ], { onConflict: ['user_id'] })

      if (profileError) {
        setMessage('Profile creation failed: ' + profileError.message);
        return;
      }

      // Create the gym profile
      const { error: gymError } = await supabase
        .from('gyms')
        .insert([
          {
            owner_id: userId,
            gym_name: formData.gymName,
            address: formData.gymAddress,
            phone: formData.gymPhone
          }
        ])

      if (gymError) {
        setMessage('Gym creation failed: ' + gymError.message);
        return;
      }

      setMessage('Registration successful! You can now log in.')
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        phone: '',
        gymName: '',
        gymAddress: '',
        gymPhone: ''
      })
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <div className="register-bg">
      <style>{`
        .register-bg {
          min-height: 100vh;
          width: 100vw;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .register-card {
          background: #fff;
          border-radius: 1.5rem;
          box-shadow: 0 4px 32px 0 rgba(31, 38, 135, 0.08);
          padding: 2.5rem 2.5rem 2rem 2.5rem;
          max-width: 420px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .register-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 0 1.5rem 0;
          width: 100%;
        }
        .register-logo img {
          height: 44px;
          margin: 0;
          display: block;
        }
        .register-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 2rem;
          color: #18181b;
          text-align: center;
          width: 100%;
        }
        .register-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }
        .form-section {
          margin-bottom: 1.5rem;
        }
        .form-section h2 {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #2563eb;
        }
        .form-group {
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
        }
        .form-group label {
          font-size: 1rem;
          font-weight: 500;
          margin-bottom: 0.3rem;
          color: #222;
        }
        .form-group input {
          width: 100%;
          padding: 0.8rem 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.8rem;
          font-size: 1rem;
          transition: border 0.18s;
          outline: none;
        }
        .form-group input:focus {
          border: 1.5px solid #2563eb;
        }
        .register-btn {
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
          width: 100%;
        }
        .register-btn:hover {
          background: #1d4ed8;
        }
        .register-message {
          margin-top: 1rem;
          text-align: center;
          font-size: 1rem;
          border-radius: 0.7rem;
          padding: 0.7rem 1rem;
        }
        .register-message.error {
          background: #fee2e2;
          color: #b91c1c;
        }
        .register-message.success {
          background: #dcfce7;
          color: #166534;
        }
        .register-login-link {
          margin-top: 1.5rem;
          text-align: center;
          width: 100%;
          color: #64748b;
          font-size: 1rem;
        }
        .register-login-link a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
          margin-left: 0.3rem;
          transition: color 0.15s;
        }
        .register-login-link a:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }
        @media (max-width: 600px) {
          .register-card {
            padding: 1.2rem 0.5rem 1.2rem 0.5rem;
            max-width: 98vw;
          }
          .register-title {
            font-size: 1.1rem;
          }
        }
      `}</style>
      <div className="register-card">
        <div className="register-logo">
          <img src={logoMakincome} alt="Makincome Logo" />
        </div>
        <div className="register-title">Sign up for Makincome</div>
        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>Owner Information</h2>
            <div className="form-group">
              <label>First Name:</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name:</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Phone Number:</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
              />
            </div>
            <div className="form-group">
              <label>Confirm Password:</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength="6"
              />
            </div>
          </div>
          <div className="form-section">
            <h2>Gym Information</h2>
            <div className="form-group">
              <label>Gym Name:</label>
              <input
                type="text"
                name="gymName"
                value={formData.gymName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Gym Address:</label>
              <input
                type="text"
                name="gymAddress"
                value={formData.gymAddress}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Gym Phone:</label>
              <input
                type="tel"
                name="gymPhone"
                value={formData.gymPhone}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <button className="register-btn" type="submit">Sign Up</button>
        </form>
        {message && (
          <div className={`register-message${message.toLowerCase().includes('success') ? ' success' : message ? ' error' : ''}`}>{message}</div>
        )}
        <div className="register-login-link">
          Already have an account? <Link to="/">Back to login</Link>
        </div>
      </div>
    </div>
  )
}

export default OwnerRegistration 