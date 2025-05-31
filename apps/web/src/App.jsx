import React, { useState, useEffect } from 'react'
import supabase from './supabaseClient'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import UserRegistration from './components/UserRegistration'
import OwnerRegistration from './components/OwnerRegistration'
import OwnerDashboard from './components/OwnerDashboard'
import Login from './components/Login'
import ClientDashboard from './components/ClientDashboard'
import ScheduleClasses from './components/ScheduleClasses'
import EvolutionTracker from './components/EvolutionTracker'
import ClientProfile from './components/ClientProfile'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userType, setUserType] = useState(null)

  useEffect(() => {
    checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserType(null)
      }
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const fetchUserType = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('user_type')
          .eq('user_id', user.id)
          .single()
        setUserType(profile?.user_type || null)
      }
    }
    fetchUserType()
  }, [user])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={user ? (
            userType === 'owner' ? <Navigate to="/dashboard" /> : userType === 'user' ? <Navigate to="/client" /> : <div>Loading...</div>
          ) : <Login />}
        />
        <Route
          path="/dashboard"
          element={user ? (
            userType === 'owner' ? <OwnerDashboard /> : <Navigate to="/client" />
          ) : <Navigate to="/" />}
        />
        <Route
          path="/client/*"
          element={user ? (
            userType === 'user' ? <ClientDashboard /> : <Navigate to="/dashboard" />
          ) : <Navigate to="/" />}
        >
          <Route path="schedule" element={<ScheduleClasses />} />
          <Route path="evolution" element={<EvolutionTracker />} />
          <Route path="profile" element={<ClientProfile />} />
        </Route>
        <Route
          path="/register"
          element={user ? <UserRegistration /> : <Navigate to="/" />}
        />
        <Route
          path="/register-owner"
          element={!user ? <OwnerRegistration /> : <Navigate to="/dashboard" />}
        />
      </Routes>
    </Router>
  )
}

export default App
