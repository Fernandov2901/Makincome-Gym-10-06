import React, { useEffect, useState } from "react";
import supabase from "../../supabaseClient";

export default function PaymentBillingSection() {
  const [plan, setPlan] = useState(null);
  const [billing, setBilling] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBilling() {
      setLoading(true);
      setError("");
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("payment_plan_id, plan_end_date, gym_id")
          .eq("user_id", user.id)
          .single();
        let planData = null;
        if (profile?.payment_plan_id) {
          const { data: planRow } = await supabase
            .from("payment_plans")
            .select("name, price, duration")
            .eq("id", profile.payment_plan_id)
            .single();
          planData = planRow;
        }
        setPlan({
          ...planData,
          nextPayment: profile?.plan_end_date,
        });
        // Fetch billing history
        const { data: payments } = await supabase
          .from("payments")
          .select("id, amount, created_at, status, invoice_url")
          .eq("gym_id", profile.gym_id)
          .order("created_at", { ascending: false });
        setBilling(payments || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBilling();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-6" aria-labelledby="payment-billing-heading">
      <h2 id="payment-billing-heading" className="text-xl font-semibold mb-2">💳 Payment & Billing</h2>
      {error && <div className="text-red-600" role="alert">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="mb-2 font-medium">Current Plan: <span className="font-bold">{plan?.name || "-"}</span></div>
          <div className="mb-2">Billing Cycle: <span className="font-bold">{plan?.duration || "-"}</span></div>
          <div className="mb-2">Next Payment: <span className="font-bold">{plan?.nextPayment ? plan.nextPayment.slice(0, 10) : "-"}</span></div>
          {/* Payment method placeholder */}
          <div className="mb-2">Payment Method: <span className="font-bold">**** **** **** 1234</span> <button className="ml-2 text-blue-600 hover:underline">Update</button></div>
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Billing History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" aria-label="Billing History Table">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left">Invoice ID</th>
                <th className="px-3 py-2 text-left">Amount Paid</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Download</th>
              </tr>
            </thead>
            <tbody>
              {billing.map((b) => (
                <tr key={b.id}>
                  <td className="px-3 py-2">{b.id}</td>
                  <td className="px-3 py-2">€{b.amount?.toFixed(2)}</td>
                  <td className="px-3 py-2">{b.created_at?.slice(0, 10)}</td>
                  <td className={`px-3 py-2 ${b.status === "paid" ? "text-green-600" : "text-yellow-600"}`}>{b.status}</td>
                  <td className="px-3 py-2">
                    {b.invoice_url ? (
                      <a href={b.invoice_url} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Download</a>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
} 