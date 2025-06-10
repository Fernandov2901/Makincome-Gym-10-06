import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'
import UserRegistration from './UserRegistration'
import PaymentPlans from './payment-plans/payment-plans'
import Revenue from './Revenue'
import './Dashboard.css'

const Dashboard = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [userType, setUserType] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    checkUser()
  }, [navigate])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('user_id', user.id)
        .single()

      setUser(user)
      setUserType(profile?.user_type)
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h1>Makincome Gym</h1>
        <div className="nav-actions">
          {userType === 'owner' && (
            <button 
              className="register-btn"
              onClick={() => navigate('/register')}
            >
              Register New User
            </button>
          )}
          <button className="sign-out-btn" onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>
      
      <div className="dashboard-content">
        {userType === 'owner' && (
          <div className="dashboard-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
              onClick={() => setActiveTab('plans')}
            >
              Payment Plans
            </button>
            <button 
              className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
              onClick={() => setActiveTab('revenue')}
            >
              Revenue
            </button>
          </div>
        )}

        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="welcome-section">
              <h2>Welcome, {user?.email}</h2>
              <p>You are logged in as a {userType}.</p>
            </div>
          )}

          {activeTab === 'plans' && userType === 'owner' && (
            <PaymentPlans />
          )}

          {activeTab === 'revenue' && userType === 'owner' && (
            <Revenue />
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard 