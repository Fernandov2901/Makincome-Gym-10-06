import React, { useState } from "react";
import supabase from "../../supabaseClient";
import DeleteAccountModal from "./DeleteAccountModal";

export default function LegalComplianceSection() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleExport = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    // Placeholder: implement real export if needed
    setTimeout(() => {
      setSuccess("Data export requested. You will receive an email with your data.");
      setLoading(false);
    }, 1500);
  };

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;
      setSuccess("Account deleted. You will be logged out.");
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-6" aria-labelledby="legal-compliance-heading">
      <h2 id="legal-compliance-heading" className="text-xl font-semibold mb-2">📄 Legal & Compliance</h2>
      {error && <div className="text-red-600" role="alert">{error}</div>}
      {success && <div className="text-green-600" role="status">{success}</div>}
      <div className="flex flex-col gap-2">
        <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
        <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
      </div>
      <div className="flex gap-4 mt-2">
        <button className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium" onClick={handleExport} aria-label="Request Data Export" disabled={loading}>
          {loading ? "Exporting..." : "Request Data Export"}
        </button>
        <button className="px-4 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700" onClick={() => setShowDeleteModal(true)} aria-label="Delete My Account" disabled={loading}>
          Delete My Account
        </button>
      </div>
      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} onDelete={handleDelete} loading={loading} />}
    </section>
  );
} 