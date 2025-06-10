import React from "react";
export default function DeleteAccountModal({ onClose, onDelete, loading }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h3 id="delete-account-title" className="text-lg font-semibold mb-4 text-red-600">Delete Account</h3>
        <p className="mb-4">Are you sure you want to delete your account? This action cannot be undone.</p>
        <div className="flex gap-2 mt-2">
          <button className="px-4 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700" onClick={onDelete} disabled={loading} aria-label="Delete Account">{loading ? "Deleting..." : "Delete"}</button>
          <button className="px-4 py-2 rounded bg-gray-100 text-gray-700 font-medium hover:bg-gray-200" onClick={onClose} aria-label="Cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
} 