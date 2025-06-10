import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../supabaseClient";
import OwnerProfileSection from "./OwnerProfileSection";
import PaymentBillingSection from "./PaymentBillingSection";
import PlatformPreferencesSection from "./PlatformPreferencesSection";
import StaffPermissionsSection from "./StaffPermissionsSection";
import LegalComplianceSection from "./LegalComplianceSection";
import DropdownMenu from "./DropdownMenu";
import "./Settings.css";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUserData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/");
          return;
        }

        // Fetch user profile
        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        
        if (error) throw error;
        
        // Check if owner
        if (profile.user_type !== "owner") {
          navigate("/");
          return;
        }
        
        setUserData({ ...user, ...profile });
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserData();
  }, [navigate]);

  // Handler for section navigation
  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-error">
        <h2>Error loading settings</h2>
        <p>{error}</p>
        <button onClick={() => navigate("/dashboard")}>Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div className="settings-logo" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>
          Makincome Gym
        </div>
        <DropdownMenu />
      </header>
      
      <div className="settings-container">
        <aside className="settings-sidebar">
          <h2>Settings</h2>
          <nav className="settings-nav">
            <button 
              className={activeSection === "profile" ? "active" : ""} 
              onClick={() => handleSectionChange("profile")}
            >
              <span>👤</span> Owner Profile
            </button>
            <button 
              className={activeSection === "billing" ? "active" : ""} 
              onClick={() => handleSectionChange("billing")}
            >
              <span>💳</span> Payment & Billing
            </button>
            <button 
              className={activeSection === "preferences" ? "active" : ""} 
              onClick={() => handleSectionChange("preferences")}
            >
              <span>⚙️</span> Platform Preferences
            </button>
            <button 
              className={activeSection === "staff" ? "active" : ""} 
              onClick={() => handleSectionChange("staff")}
            >
              <span>🔐</span> Staff & Permissions
            </button>
            <button 
              className={activeSection === "legal" ? "active" : ""} 
              onClick={() => handleSectionChange("legal")}
            >
              <span>📄</span> Legal & Compliance
            </button>
          </nav>
          <button 
            className="back-to-dashboard" 
            onClick={() => navigate("/dashboard")}
          >
            <span>←</span> Back to Dashboard
          </button>
        </aside>
        
        <main className="settings-content">
          {activeSection === "profile" && <OwnerProfileSection userData={userData} />}
          {activeSection === "billing" && <PaymentBillingSection />}
          {activeSection === "preferences" && <PlatformPreferencesSection />}
          {activeSection === "staff" && <StaffPermissionsSection />}
          {activeSection === "legal" && <LegalComplianceSection />}
        </main>
      </div>
    </div>
  );
} 