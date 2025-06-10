import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';

export default function DropdownMenu() {
  const [showMenu, setShowMenu] = useState(false);
  const [userName, setUserName] = useState('');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    async function fetchName() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          setUserName(`${profile.first_name} ${profile.last_name}`);
        }
      }
    }
    fetchName();
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };
  
  return (
    <div className="dropdown-menu" ref={dropdownRef}>
      <button 
        className="dropdown-trigger"
        onClick={() => setShowMenu(!showMenu)}
      >
        <div className="user-avatar">
          {userName.split(' ').map(n => n[0]).join('') || 'U'}
        </div>
        <span>{userName || 'User'}</span>
        <span className="dropdown-arrow">▼</span>
      </button>
      
      {showMenu && (
        <div className="dropdown-content">
          <div className="dropdown-header">
            <div className="dropdown-name">{userName}</div>
            <div className="dropdown-role">Owner</div>
          </div>
          <div className="dropdown-items">
            <button 
              className="dropdown-item"
              onClick={() => navigate('/dashboard')}
            >
              <span>📊</span> Dashboard
            </button>
            <button 
              className="dropdown-item"
              onClick={() => navigate('/settings')}
            >
              <span>⚙️</span> Settings
            </button>
            <button 
              className="dropdown-item danger"
              onClick={handleSignOut}
            >
              <span>🔴</span> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 