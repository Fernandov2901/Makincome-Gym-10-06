import React, { useState, useEffect, useCallback } from 'react'
import supabase from './supabaseClient'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import UserRegistration from './components/UserRegistration'
import OwnerRegistration from './components/OwnerRegistration'
import OwnerDashboard from './components/OwnerDashboard'
import Login from './components/Login'
import ClientDashboard from './components/ClientDashboard'
import ScheduleClasses from './components/ScheduleClasses'
import EvolutionTracker from './components/EvolutionTracker'
import ClientProfile from './components/ClientProfile'
import SettingsPage from './components/settings/SettingsPage'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userType, setUserType] = useState(null)
  const [error, setError] = useState(null)

  const fetchUserType = useCallback(async (userId) => {
    console.log('Fetching user type for:', userId)
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('user_id', userId)
        .single()
      
      if (profileError) {
        console.error('Profile error:', profileError)
        throw profileError
      }
      
      console.log('User type fetched:', profile?.user_type)
      setUserType(profile?.user_type || null)
    } catch (err) {
      console.error('Error fetching user type:', err)
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (session) {
          console.log('Found existing session:', session);
          setUser(session.user);
          await fetchUserType(session.user.id);
      } else {
          console.log('No session found');
          setUser(null);
          setUserType(null);
      }
      } catch (err) {
        console.error('Error checking session:', err);
        setError(err.message);
    } finally {
        setLoading(false);
    }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null);
        setError(null);
        await fetchUserType(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserType(null);
      } else if (event === 'USER_UPDATED') {
        setUser(session?.user ?? null);
        await fetchUserType(session.user.id);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchUserType])

  console.log('Current state:', { user, userType, loading, error })

  // Login handler for the Login page
  const handleLogin = async ({ email, password, role }) => {
    // Optionally, you can use the role to restrict login, but here we just authenticate
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // The rest of the logic (fetching user type, routing) is handled by the App's useEffect
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Loading...</div>
        <pre style={{ color: '#888', fontSize: 12, marginTop: 16 }}>
          user: {JSON.stringify(user, null, 2)}
          {"\n"}
          userType: {JSON.stringify(userType, null, 2)}
          {"\n"}
          error: {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error">Error: {error}</div>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        {!user && (
          <>
            <Route path="/" element={<Login onLogin={handleLogin} />} />
            <Route path="/register-owner" element={<OwnerRegistration />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}

        {/* Loading user type */}
        {user && !userType && (
          <Route path="*" element={
            <div className="loading-container">
              <div className="loading">Loading user type...</div>
            </div>
          } />
        )}

        {/* Authenticated routes */}
        {user && userType && (
          <>
            <Route
              path="/"
              element={
                userType === 'owner' ? 
                  <Navigate to="/dashboard" replace /> : 
                  <Navigate to="/client" replace />
              }
            />
            <Route
              path="/dashboard"
              element={
                userType === 'owner' ? 
                  <OwnerDashboard /> : 
                  <Navigate to="/client" replace />
              }
            />
            <Route
              path="/settings"
              element={
                userType === 'owner' ? 
                  <SettingsPage /> : 
                  <Navigate to="/client" replace />
              }
            />
            <Route
              path="/client/*"
              element={
                userType === 'user' ? 
                  <ClientDashboard /> : 
                  <Navigate to="/dashboard" replace />
              }
            >
              <Route path="schedule" element={<ScheduleClasses />} />
              <Route path="evolution" element={<EvolutionTracker />} />
              <Route path="profile" element={<ClientProfile />} />
            </Route>
            <Route
              path="/register"
              element={
                userType === 'owner' ? 
                  <UserRegistration /> : 
                  <Navigate to="/client" replace />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Router>
  )
}

export default App
