import { useState, useEffect } from 'react'
import supabase from '../supabaseClient'
import './PaymentPlans.css'

function PaymentPlans() {
  const [plans, setPlans] = useState([])
  const [newPlan, setNewPlan] = useState({
    name: '',
    price: '',
    duration: 'monthly',
    description: ''
  })
  const [message, setMessage] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [planToDelete, setPlanToDelete] = useState(null)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_plans')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPlans(data)
    } catch (error) {
      setMessage(error.message)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setNewPlan(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    try {
      const { error } = await supabase
        .from('payment_plans')
        .insert([
          {
            ...newPlan,
            price: parseFloat(newPlan.price)
          }
        ])

      if (error) throw error

      setMessage('Plan created successfully!')
      setNewPlan({
        name: '',
        price: '',
        duration: 'monthly',
        description: ''
      })
      fetchPlans()
    } catch (error) {
      setMessage(error.message)
    }
  }

  const handleDelete = async (planId) => {
    try {
      setIsDeleting(true)
      setMessage('')

      // First check if any users are using this plan
      const { data: usersWithPlan, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('payment_plan_id', planId)

      if (checkError) throw checkError

      if (usersWithPlan && usersWithPlan.length > 0) {
        throw new Error('Cannot delete plan: There are users currently subscribed to this plan')
      }

      const { error } = await supabase
        .from('payment_plans')
        .delete()
        .eq('id', planId)

      if (error) throw error

      setMessage('Plan deleted successfully!')
      fetchPlans()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsDeleting(false)
      setPlanToDelete(null)
    }
  }

  const confirmDelete = (plan) => {
    setPlanToDelete(plan)
  }

  const cancelDelete = () => {
    setPlanToDelete(null)
  }

  return (
    <div className="payment-plans-container">
      <div className="payment-plans-header">
        <h2>Payment Plans</h2>
        <p>Manage your gym's payment plans</p>
      </div>

      <div className="payment-plans-grid">
        <div className="create-plan-section">
          <h3>Create New Plan</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Plan Name:</label>
              <input
                type="text"
                name="name"
                value={newPlan.name}
                onChange={handleChange}
                required
                placeholder="e.g., Basic Membership"
              />
            </div>

            <div className="form-group">
              <label>Price:</label>
              <input
                type="number"
                name="price"
                value={newPlan.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label>Duration:</label>
              <select
                name="duration"
                value={newPlan.duration}
                onChange={handleChange}
                required
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="form-group">
              <label>Description:</label>
              <textarea
                name="description"
                value={newPlan.description}
                onChange={handleChange}
                placeholder="Describe what's included in this plan"
                rows="3"
              />
            </div>

            <button type="submit" className="submit-btn">Create Plan</button>
          </form>
        </div>

        <div className="plans-list-section">
          <h3>Current Plans</h3>
          {plans.length === 0 ? (
            <p className="no-plans">No plans created yet</p>
          ) : (
            <div className="plans-grid">
              {plans.map(plan => (
                <div key={plan.id} className="plan-card">
                  <div className="plan-header">
                    <h4>{plan.name}</h4>
                    <button
                      onClick={() => confirmDelete(plan)}
                      className="delete-btn"
                      disabled={isDeleting}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="plan-price">
                    ${plan.price} / {plan.duration}
                  </div>
                  <p className="plan-description">{plan.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {message && (
        <p className={message.includes('successfully') ? 'success-message' : 'error-message'}>
          {message}
        </p>
      )}

      {/* Delete Confirmation Modal */}
      {planToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete the plan "{planToDelete.name}"?</p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                onClick={() => handleDelete(planToDelete.id)}
                className="confirm-delete-btn"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={cancelDelete}
                className="cancel-btn"
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentPlans 