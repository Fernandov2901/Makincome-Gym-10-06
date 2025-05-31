import React, { useState, useEffect } from 'react'
import supabase from '../supabaseClient'
import './UserRegistration.css'

const UserRegistration = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    userType: 'user',
    paymentPlanId: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [paymentPlans, setPaymentPlans] = useState([])

  useEffect(() => {
    fetchPaymentPlans()
  }, [])

  const fetchPaymentPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        const { data: plans } = await supabase
          .from('payment_plans')
          .select('*')
          .eq('gym_id', profile.gym_id)

        if (plans) {
          setPaymentPlans(plans)
        }
      }
    } catch (error) {
      console.error('Error fetching payment plans:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      // Get current user (gym owner)
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', currentUser.id)
        .single()

      if (!currentProfile) throw new Error('Gym owner profile not found')

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          {
            user_id: authData.user.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            user_type: formData.userType,
            gym_id: currentProfile.gym_id,
            payment_plan_id: formData.paymentPlanId,
            plan_start_date: new Date().toISOString(),
            plan_end_date: formData.paymentPlanId ? new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString() : null
          }
        ])

      if (profileError) throw profileError

      setMessage({
        type: 'success',
        text: 'User registered successfully!'
      })
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        userType: 'user',
        paymentPlanId: ''
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="registration-container">
      <div className="registration-box">
        <h2>Register New User</h2>
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
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
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="userType">User Type</label>
            <select
              id="userType"
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              required
            >
              <option value="user">User</option>
              <option value="coach">Coach</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="paymentPlanId">Payment Plan</label>
            <select
              id="paymentPlanId"
              name="paymentPlanId"
              value={formData.paymentPlanId}
              onChange={handleChange}
            >
              <option value="">Select a plan</option>
              {paymentPlans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - ${plan.price}/month ({plan.duration} months)
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Registering...' : 'Register User'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default UserRegistration 