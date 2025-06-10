import React, { useState, useEffect } from "react";
import supabase from "../../supabaseClient";

export default function PlatformPreferencesSection() {
  const [prefs, setPrefs] = useState({
    language: "English",
    currency: "EUR",
    timeFormat: "24h",
    dashboard: "Revenue",
    weeklyEmail: true,
    darkMode: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchPrefs() {
      setLoading(true);
      setError("");
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("preferences")
          .eq("user_id", user.id)
          .single();
        if (profile?.preferences) {
          setPrefs({ ...prefs, ...profile.preferences });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPrefs();
    // eslint-disable-next-line
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ preferences: prefs })
        .eq("user_id", user.id);
      if (updateError) throw updateError;
      setSuccess("Preferences updated!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-6" aria-labelledby="platform-preferences-heading">
      <h2 id="platform-preferences-heading" className="text-xl font-semibold mb-2">⚙️ Platform Preferences</h2>
      {error && <div className="text-red-600" role="alert">{error}</div>}
      {success && <div className="text-green-600" role="status">{success}</div>}
      <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSave} aria-label="Platform Preferences Form">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Language</span>
          <select className="input" value={prefs.language} onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))} aria-label="Language">
            <option>English</option>
            <option>Portuguese</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Currency Preference</span>
          <select className="input" value={prefs.currency} onChange={e => setPrefs(p => ({ ...p, currency: e.target.value }))} aria-label="Currency Preference">
            <option>EUR</option>
            <option>USD</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Time Format</span>
          <select className="input" value={prefs.timeFormat} onChange={e => setPrefs(p => ({ ...p, timeFormat: e.target.value }))} aria-label="Time Format">
            <option>24h</option>
            <option>12h</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Default Dashboard View</span>
          <select className="input" value={prefs.dashboard} onChange={e => setPrefs(p => ({ ...p, dashboard: e.target.value }))} aria-label="Default Dashboard View">
            <option>Revenue</option>
            <option>Classes</option>
            <option>Clients</option>
          </select>
        </label>
        <label className="flex items-center gap-2 mt-2">
          <input type="checkbox" checked={prefs.weeklyEmail} onChange={e => setPrefs(p => ({ ...p, weeklyEmail: e.target.checked }))} aria-label="Weekly Email Reports" />
          <span className="font-medium">Weekly Email Reports</span>
        </label>
        <label className="flex items-center gap-2 mt-2">
          <input type="checkbox" checked={prefs.darkMode} onChange={e => setPrefs(p => ({ ...p, darkMode: e.target.checked }))} aria-label="Dark Mode" />
          <span className="font-medium">Dark Mode</span>
        </label>
        <div className="col-span-2 flex gap-4 mt-2">
          <button className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700" type="submit" aria-label="Save Preferences">Save Preferences</button>
        </div>
      </form>
    </section>
  );
} 