import React, { useState, useEffect } from "react";
import supabase from "../../supabaseClient";

export default function StaffPermissionsSection() {
  const [staff, setStaff] = useState([]);
  const [newStaff, setNewStaff] = useState({ email: "", role: "Coach" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchStaff() {
      setLoading(true);
      setError("");
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("gym_id")
          .eq("user_id", user.id)
          .single();
        const { data: staffRows } = await supabase
          .from("user_profiles")
          .select("user_id, first_name, last_name, user_type, last_login, status, access_level, email")
          .eq("gym_id", profile.gym_id)
          .in("user_type", ["coach", "manager", "owner"]);
        setStaff(staffRows || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStaff();
  }, []);

  const handleAccessChange = async (userId, access) => {
    setError("");
    setSuccess("");
    try {
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ access_level: access })
        .eq("user_id", userId);
      if (updateError) throw updateError;
      setStaff(staff.map(s => s.user_id === userId ? { ...s, access_level: access } : s));
      setSuccess("Access level updated.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRevoke = async (userId) => {
    setError("");
    setSuccess("");
    try {
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ status: "revoked" })
        .eq("user_id", userId);
      if (updateError) throw updateError;
      setStaff(staff.map(s => s.user_id === userId ? { ...s, status: "revoked" } : s));
      setSuccess("Staff access revoked.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      // Invite staff (create user in Supabase Auth)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newStaff.email,
        password: Math.random().toString(36).slice(-8),
      });
      if (authError) throw authError;
      // Get current gym id
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("gym_id")
        .eq("user_id", user.id)
        .single();
      // Insert staff profile
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: authData.user.id,
          gym_id: profile.gym_id,
          first_name: "",
          last_name: "",
          email: newStaff.email,
          user_type: newStaff.role.toLowerCase(),
          status: "active",
          access_level: "View",
        });
      if (profileError) throw profileError;
      setSuccess("Staff invited!");
      setNewStaff({ email: "", role: "Coach" });
      // Refresh staff list
      const { data: staffRows } = await supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, user_type, last_login, status, access_level, email")
        .eq("gym_id", profile.gym_id)
        .in("user_type", ["coach", "manager", "owner"]);
      setStaff(staffRows || []);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-6" aria-labelledby="staff-permissions-heading">
      <h2 id="staff-permissions-heading" className="text-xl font-semibold mb-2">🔐 Staff & Permissions</h2>
      {error && <div className="text-red-600" role="alert">{error}</div>}
      {success && <div className="text-green-600" role="status">{success}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm" aria-label="Staff Table">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left">Staff Name</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Access Level</th>
              <th className="px-3 py-2 text-left">Last Login</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.user_id} className="border-b">
                <td className="px-3 py-2">{s.first_name} {s.last_name}</td>
                <td className="px-3 py-2">{s.user_type}</td>
                <td className="px-3 py-2">
                  <select
                    className="input"
                    value={s.access_level || "View"}
                    onChange={e => handleAccessChange(s.user_id, e.target.value)}
                    aria-label="Access Level"
                  >
                    <option>View</option>
                    <option>Edit</option>
                    <option>Full Access</option>
                  </select>
                </td>
                <td className="px-3 py-2">{s.last_login || "-"}</td>
                <td className="px-3 py-2">{s.status}</td>
                <td className="px-3 py-2 flex gap-2">
                  <button className="text-blue-600 hover:underline" aria-label="Edit Staff">Edit</button>
                  <button className="text-red-600 hover:underline" onClick={() => handleRevoke(s.user_id)} aria-label="Revoke Access">Revoke</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="flex flex-col md:flex-row gap-2 items-end mt-4" onSubmit={handleAddStaff} aria-label="Add Staff Form">
        <input
          className="input"
          placeholder="Staff Email"
          value={newStaff.email}
          onChange={e => setNewStaff(s => ({ ...s, email: e.target.value }))}
          aria-label="Staff Email"
          required
        />
        <select
          className="input"
          value={newStaff.role}
          onChange={e => setNewStaff(s => ({ ...s, role: e.target.value }))}
          aria-label="Staff Role"
        >
          <option>Coach</option>
          <option>Manager</option>
          <option>Owner</option>
        </select>
        <button className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700" type="submit" aria-label="Add Staff">Add Staff</button>
      </form>
    </section>
  );
} 