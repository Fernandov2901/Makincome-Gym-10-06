import React, { useState, useEffect, useRef } from 'react';
import supabase from '../supabaseClient';
import './Revenue.css';
import { Chart } from 'chart.js/auto';
import { format, addMonths, subMonths } from 'date-fns';

const Revenue = () => {
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    activeSubscriptions: 0,
    arpu: 0,
    churnRate: 0,
    planConversionRate: 0,
    plans: []
  });
  const [planSubscribers, setPlanSubscribers] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('6months');
  
  // Chart refs
  const revenueGrowthChartRef = useRef(null);
  const planTrendsChartRef = useRef(null);
  const churnAcquisitionChartRef = useRef(null);
  const productSalesChartRef = useRef(null);
  const planRevenueChartRef = useRef(null);

  useEffect(() => {
    fetchRevenueData();
  }, []);
  
  useEffect(() => {
    if (!loading && !error) {
      renderCharts();
    }
  }, [loading, error, timeFilter]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Gym profile not found');

      // Fetch all payment plans for the gym
      const { data: plans } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('gym_id', profile.gym_id);

      if (!plans) throw new Error('No payment plans found');

      // Fetch all users with active subscriptions
      const { data: users } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          payment_plan_id,
          plan_start_date,
          plan_end_date,
          payment_plans (
            id,
            price,
            name,
            duration
          )
        `)
        .eq('gym_id', profile.gym_id)
        .not('payment_plan_id', 'is', null);

      if (!users) throw new Error('No users found');

      // Calculate revenue data
      const now = new Date();
      const activeUsers = users.filter(user => 
        new Date(user.plan_end_date) > now
      );

      // Prepare data for plan subscribers table
      const detailedPlanSubscribers = activeUsers.map(user => {
        const nextBillingDate = new Date(user.plan_end_date);
        return {
          userId: user.user_id,
          name: `${user.first_name} ${user.last_name}`,
          planId: user.payment_plan_id,
          planName: user.payment_plans?.name || 'Unknown Plan',
          planDuration: user.payment_plans?.duration || 0,
          planPrice: user.payment_plans?.price || 0,
          startDate: user.plan_start_date,
          nextBillingDate: nextBillingDate.toISOString().split('T')[0],
          paymentStatus: Math.random() > 0.9 ? 'pending' : Math.random() > 0.95 ? 'failed' : 'active'
        };
      });
      
      setPlanSubscribers(detailedPlanSubscribers);

      const planStats = plans.map(plan => {
        const planUsers = activeUsers.filter(user => 
          user.payment_plan_id === plan.id
        );
        return {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          duration: plan.duration || 30, // Default to 30 days if not specified
          subscribers: planUsers.length,
          revenue: planUsers.length * plan.price
        };
      });

      const totalRevenue = planStats.reduce((sum, plan) => sum + plan.revenue, 0);
      
      // Calculate ARPU (Average Revenue Per User)
      const arpu = activeUsers.length > 0 ? totalRevenue / activeUsers.length : 0;
      
      // Mock churn rate and conversion rate (in a real app, this would be calculated from historical data)
      const churnRate = 0.05 + Math.random() * 0.03; // 5-8%
      const planConversionRate = 0.65 + Math.random() * 0.20; // 65-85%
      
      // Mock product sales data
      const productNames = ['Protein Shake', 'Gym T-Shirt', 'Water Bottle', 'Fitness Tracker', 'Resistance Bands'];
      const mockProductSales = Array(20).fill().map((_, i) => {
        const productIndex = Math.floor(Math.random() * productNames.length);
        const quantity = Math.floor(Math.random() * 10) + 1;
        const unitPrice = (5 + Math.random() * 45).toFixed(2);
        const saleDate = new Date();
        saleDate.setDate(saleDate.getDate() - Math.floor(Math.random() * 90)); // Random date in last 90 days
        
        return {
          id: i + 1,
          productName: productNames[productIndex],
          quantity,
          unitPrice: parseFloat(unitPrice),
          totalRevenue: quantity * parseFloat(unitPrice),
          saleDate: saleDate.toISOString().split('T')[0]
        };
      });
      
      setProductSales(mockProductSales);
      
      // Mock customer payments data
      const paymentMethods = ['Credit Card', 'PayPal', 'Bank Transfer', 'Cash', 'Apple Pay'];
      const paymentStatuses = ['Success', 'Failed', 'Pending'];
      
      const mockCustomerPayments = activeUsers.map((user, i) => {
        const paymentDate = new Date();
        paymentDate.setDate(paymentDate.getDate() - Math.floor(Math.random() * 30)); // Random date in last 30 days
        const methodIndex = Math.floor(Math.random() * paymentMethods.length);
        const statusIndex = Math.random() > 0.9 ? 1 : Math.random() > 0.95 ? 2 : 0; // Mostly success
        
        return {
          id: i + 1,
          customerName: `${user.first_name} ${user.last_name}`,
          paymentDate: paymentDate.toISOString().split('T')[0],
          amount: user.payment_plans?.price || 0,
          paymentMethod: paymentMethods[methodIndex],
          status: paymentStatuses[statusIndex]
        };
      });
      
      setCustomerPayments(mockCustomerPayments);

      setRevenueData({
        totalRevenue,
        activeSubscriptions: activeUsers.length,
        arpu,
        churnRate,
        planConversionRate,
        plans: planStats
      });
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const renderCharts = () => {
    // Helper to get months based on filter
    const getMonthsData = () => {
      const now = new Date();
      const months = [];
      let count = 0;
      
      switch(timeFilter) {
        case '3months':
          count = 3;
          break;
        case '1year':
          count = 12;
          break;
        case '6months':
        default:
          count = 6;
      }
      
      for (let i = count - 1; i >= 0; i--) {
        const month = subMonths(now, i);
        months.push(format(month, 'MMM yyyy'));
      }
      
      return months;
    };
    
    const months = getMonthsData();
    
    // Month-over-month revenue growth (bar chart)
    if (revenueGrowthChartRef.current) {
      const ctx = revenueGrowthChartRef.current.getContext('2d');
      
      // Generate mock revenue data for past months
      const revenueData = months.map(() => Math.floor(revenueData.totalRevenue * (0.7 + Math.random() * 0.6)));
      
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [{
            label: 'Monthly Revenue',
            data: revenueData,
            backgroundColor: '#2563eb',
            borderColor: '#2563eb',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `Revenue: $${context.raw.toFixed(2)}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Revenue ($)'
              }
            }
          }
        }
      });
    }
    
    // Plan signup trends over time (line chart)
    if (planTrendsChartRef.current) {
      const ctx = planTrendsChartRef.current.getContext('2d');
      
      // Generate mock signup data for each plan
      const datasets = revenueData.plans.map((plan, index) => {
        // Different colors for different plans
        const colors = ['#2563eb', '#10b981', '#f59e42', '#e11d48', '#64748b'];
        const color = colors[index % colors.length];
        
        return {
          label: plan.name,
          data: months.map(() => Math.floor(Math.random() * 10) + 1), // Random signups (1-10)
          borderColor: color,
          backgroundColor: color + '20', // Add transparency
          fill: false,
          tension: 0.4
        };
      });
      
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: months,
          datasets: datasets
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.raw} signups`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Signups'
              }
            }
          }
        }
      });
    }
    
    // Client churn and acquisition (dual line chart)
    if (churnAcquisitionChartRef.current) {
      const ctx = churnAcquisitionChartRef.current.getContext('2d');
      
      // Generate mock acquisition and churn data
      const acquisitionData = months.map(() => Math.floor(Math.random() * 15) + 5); // 5-20 new users
      const churnData = months.map(() => Math.floor(Math.random() * 8) + 1); // 1-8 churned users
      
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              label: 'New Clients',
              data: acquisitionData,
              borderColor: '#10b981',
              backgroundColor: '#10b98120',
              fill: false,
              tension: 0.4
            },
            {
              label: 'Churned Clients',
              data: churnData,
              borderColor: '#e11d48',
              backgroundColor: '#e11d4820',
              fill: false,
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.raw}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Clients'
              }
            }
          }
        }
      });
    }
    
    // Product Sales Over Time (line chart)
    if (productSalesChartRef.current) {
      const ctx = productSalesChartRef.current.getContext('2d');
      
      // Aggregate product sales by month
      const monthlySales = {};
      months.forEach(month => {
        monthlySales[month] = 0;
      });
      
      productSales.forEach(sale => {
        const saleMonth = format(new Date(sale.saleDate), 'MMM yyyy');
        if (months.includes(saleMonth)) {
          monthlySales[saleMonth] += sale.totalRevenue;
        }
      });
      
      const salesData = months.map(month => monthlySales[month]);
      
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: months,
          datasets: [{
            label: 'Product Sales',
            data: salesData,
            borderColor: '#64748b',
            backgroundColor: '#64748b20',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `Sales: $${context.raw.toFixed(2)}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Sales Revenue ($)'
              }
            }
          }
        }
      });
    }
    
    // Subscription Plan Revenue Trends (grouped bar chart)
    if (planRevenueChartRef.current) {
      const ctx = planRevenueChartRef.current.getContext('2d');
      
      // Generate datasets for each plan
      const datasets = revenueData.plans.map((plan, index) => {
        const colors = ['#2563eb', '#10b981', '#f59e42', '#e11d48', '#64748b'];
        const color = colors[index % colors.length];
        
        return {
          label: plan.name,
          data: months.map(() => Math.floor(plan.revenue * (0.7 + Math.random() * 0.6))),
          backgroundColor: color
        };
      });
      
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: months,
          datasets: datasets
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: $${context.raw.toFixed(2)}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Revenue ($)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Month'
              }
            }
          }
        }
      });
    }
  };
  
  const handleTimeFilterChange = (filter) => {
    setTimeFilter(filter);
  };

  if (loading) {
    return (
      <div className="revenue-container">
        <div className="loading">Loading revenue data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="revenue-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="revenue-container">
      <div className="revenue-header">
        <h2>Revenue Overview</h2>
        <div className="stat-cards-row">
          <div className="stat-card">
            <h3>Monthly Revenue</h3>
            <p className="stat-value">${revenueData.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <h3>Active Subscriptions</h3>
            <p className="stat-value">{revenueData.activeSubscriptions}</p>
          </div>
          <div className="stat-card">
            <h3>ARPU</h3>
            <p className="stat-value">${revenueData.arpu.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <h3>Churn Rate</h3>
            <p className="stat-value">{(revenueData.churnRate * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="chart-filters">
        <button 
          className={`filter-btn ${timeFilter === '3months' ? 'active' : ''}`}
          onClick={() => handleTimeFilterChange('3months')}
        >
          Last 3 Months
        </button>
        <button 
          className={`filter-btn ${timeFilter === '6months' ? 'active' : ''}`}
          onClick={() => handleTimeFilterChange('6months')}
        >
          Last 6 Months
        </button>
        <button 
          className={`filter-btn ${timeFilter === '1year' ? 'active' : ''}`}
          onClick={() => handleTimeFilterChange('1year')}
        >
          Last Year
        </button>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Monthly Revenue Growth</h3>
          <canvas ref={revenueGrowthChartRef}></canvas>
        </div>
        <div className="chart-container">
          <h3>Plan Signup Trends</h3>
          <canvas ref={planTrendsChartRef}></canvas>
        </div>
        <div className="chart-container">
          <h3>Client Churn vs Acquisition</h3>
          <canvas ref={churnAcquisitionChartRef}></canvas>
        </div>
      </div>

      <div className="revenue-breakdown">
        <h3>Revenue Breakdown by Plan</h3>
        <div className="table-responsive">
          <table className="revenue-table">
            <thead>
              <tr>
                <th>Plan Name</th>
                <th>Duration (days)</th>
                <th>Price</th>
                <th>Subscribers</th>
                <th>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
          {revenueData.plans.map(plan => (
                <tr key={plan.id}>
                  <td>{plan.name}</td>
                  <td>{plan.duration}</td>
                  <td>${plan.price.toFixed(2)}</td>
                  <td>{plan.subscribers}</td>
                  <td>${plan.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="plan-subscribers">
        <h3>Active Plan Subscribers</h3>
        <div className="table-responsive">
          <table className="subscribers-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Duration (days)</th>
                <th>Start Date</th>
                <th>Next Billing</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {planSubscribers.map(subscriber => (
                <tr key={subscriber.userId}>
                  <td>{subscriber.name}</td>
                  <td>{subscriber.planName}</td>
                  <td>{subscriber.planDuration}</td>
                  <td>{subscriber.startDate}</td>
                  <td>{subscriber.nextBillingDate}</td>
                  <td>
                    <span className={`status-badge ${subscriber.paymentStatus}`}>
                      {subscriber.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
                </div>

      <div className="historical-charts">
        <h3>Historical Performance</h3>
        <div className="charts-grid">
          <div className="chart-container">
            <h4>Product Sales Over Time</h4>
            <canvas ref={productSalesChartRef}></canvas>
                </div>
          <div className="chart-container">
            <h4>Subscription Plan Revenue Trends</h4>
            <canvas ref={planRevenueChartRef}></canvas>
                </div>
              </div>
            </div>

      <div className="product-sales">
        <h3>Product Sales Revenue</h3>
        <div className="table-responsive">
          <table className="sales-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Quantity Sold</th>
                <th>Unit Price</th>
                <th>Total Revenue</th>
                <th>Date of Sale</th>
              </tr>
            </thead>
            <tbody>
              {productSales.map(sale => (
                <tr key={sale.id}>
                  <td>{sale.productName}</td>
                  <td>{sale.quantity}</td>
                  <td>${sale.unitPrice.toFixed(2)}</td>
                  <td>${sale.totalRevenue.toFixed(2)}</td>
                  <td>{sale.saleDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="customer-payments">
        <h3>Customer Payments</h3>
        <div className="table-responsive">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Payment Date</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customerPayments.map(payment => (
                <tr key={payment.id}>
                  <td>{payment.customerName}</td>
                  <td>{payment.paymentDate}</td>
                  <td>${payment.amount.toFixed(2)}</td>
                  <td>{payment.paymentMethod}</td>
                  <td>
                    <span className={`status-badge ${payment.status.toLowerCase()}`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Revenue; 