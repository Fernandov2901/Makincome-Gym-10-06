import React, { useState, useMemo, useEffect } from 'react';
import { 
  EyeIcon, PencilIcon, TrashIcon, DotsVerticalIcon, MailIcon, 
  PhoneIcon, TagIcon, FireIcon, ClockIcon, DocumentDownloadIcon,
  SortAscendingIcon, SortDescendingIcon, CheckIcon, UserAddIcon,
  BellIcon, ChatAltIcon, UserGroupIcon
} from '../icons/icons'; // We'll create this icons file next
import ClientAvatar from './client-avatar';
import ClientStatusBadge from './client-status-badge';
import './clients-table.css';
import supabase from '../../supabaseClient';

const ClientsTable = ({ 
  clients, 
  plans, 
  onViewClient, 
  onEditClient, 
  onDeleteClient,
  onRefresh,
  currentUserRole = 'admin' // Default to admin for demo
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [sortField, setSortField] = useState('first_name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(null);
  const [tagsMenuOpen, setTagsMenuOpen] = useState(null);
  const [availableTags, setAvailableTags] = useState(['VIP', 'Trial', 'Late Payer', 'New', 'Potential']);
  
  // Analytics data
  const [analytics, setAnalytics] = useState({
    totalClients: 0,
    monthlyPlans: 0,
    yearlyPlans: 0,
    newThisMonth: 0
  });

  // Calculate analytics when clients change
  useEffect(() => {
    if (!clients?.length) return;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Calculate new clients this month
    const newThisMonth = clients.filter(client => 
      new Date(client.created_at) >= startOfMonth
    ).length;
    
    // Calculate plan breakdown
    const monthlyPlans = clients.filter(client => {
      const plan = plans.find(p => p.id === client.payment_plan_id);
      return plan && plan.duration === 1;
    }).length;
    
    const yearlyPlans = clients.filter(client => {
      const plan = plans.find(p => p.id === client.payment_plan_id);
      return plan && plan.duration === 12;
    }).length;
    
    setAnalytics({
      totalClients: clients.length,
      monthlyPlans,
      yearlyPlans,
      newThisMonth
    });
  }, [clients, plans]);

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle bulk select
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map(client => client.user_id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectClient = (clientId) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
      setSelectAll(false);
    } else {
      setSelectedClients([...selectedClients, clientId]);
      if (selectedClients.length + 1 === filteredClients.length) {
        setSelectAll(true);
      }
    }
  };

  // Handle bulk actions
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedClients.length} clients?`)) {
      return;
    }
    
    try {
      // Log action
      await supabase.from('audit_logs').insert({
        action: 'bulk_delete_clients',
        user_id: (await supabase.auth.getUser()).data.user?.id,
        details: JSON.stringify({ 
          deleted_client_ids: selectedClients,
          timestamp: new Date().toISOString()
        })
      });
      
      // Delete clients
      for (const clientId of selectedClients) {
        await onDeleteClient(clientId);
      }
      
      setSelectedClients([]);
      setSelectAll(false);
      onRefresh();
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('Failed to delete clients. Please try again.');
    }
  };

  const handleBulkExport = () => {
    const selectedClientData = clients.filter(client => 
      selectedClients.includes(client.user_id)
    );
    
    // Create CSV data
    let csv = 'First Name,Last Name,Email,Phone,Plan,Start Date,End Date\n';
    selectedClientData.forEach(client => {
      const plan = plans.find(p => p.id === client.payment_plan_id);
      csv += `"${client.first_name}","${client.last_name}","${client.email}","${client.phone || ''}","${plan?.name || ''}","${client.plan_start_date || ''}","${client.plan_end_date || ''}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'clients-export.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleBulkEmail = () => {
    const emails = clients
      .filter(client => selectedClients.includes(client.user_id))
      .map(client => client.email)
      .join(',');
    
    window.open(`mailto:${emails}`);
  };

  // Toggle client tag
  const handleToggleTag = async (clientId, tag) => {
    const client = clients.find(c => c.user_id === clientId);
    if (!client) return;
    
    const currentTags = client.tags || [];
    let newTags;
    
    if (currentTags.includes(tag)) {
      newTags = currentTags.filter(t => t !== tag);
    } else {
      newTags = [...currentTags, tag];
    }
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ tags: newTags })
        .eq('user_id', clientId);
        
      if (error) throw error;
      
      // Log action
      await supabase.from('audit_logs').insert({
        action: 'update_client_tags',
        user_id: (await supabase.auth.getUser()).data.user?.id,
        details: JSON.stringify({ 
          client_id: clientId,
          previous_tags: currentTags,
          new_tags: newTags,
          timestamp: new Date().toISOString()
        })
      });
      
      onRefresh();
    } catch (error) {
      console.error('Error updating tags:', error);
    }
    
    setTagsMenuOpen(null);
  };

  // Send renewal reminder
  const handleSendRenewalReminder = async (clientId) => {
    try {
      const client = clients.find(c => c.user_id === clientId);
      if (!client) return;
      
      // In a real app, you would implement an API call to send the reminder
      
      // For now, just log the action
      await supabase.from('audit_logs').insert({
        action: 'send_renewal_reminder',
        user_id: (await supabase.auth.getUser()).data.user?.id,
        details: JSON.stringify({ 
          client_id: clientId,
          client_email: client.email,
          timestamp: new Date().toISOString()
        })
      });
      
      alert(`Renewal reminder sent to ${client.first_name} ${client.last_name}`);
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Failed to send reminder. Please try again.');
    }
    
    setActionsMenuOpen(null);
  };

  // Calculate expiration status based on plan
  const getExpirationStatus = (client) => {
    if (!client.plan_end_date) return 'unknown';
    
    const endDate = new Date(client.plan_end_date);
    const now = new Date();
    const daysUntilExpiration = Math.floor((endDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration < 0) return 'expired';
    if (daysUntilExpiration <= 7) return 'expiring-soon';
    return 'active';
  };

  // Calculate and display membership status
  const getMembershipStatus = (client) => {
    if (!client.payment_plan_id) return 'no-plan';
    
    const status = getExpirationStatus(client);
    if (status === 'expired') return 'expired';
    if (status === 'expiring-soon') return 'expiring-soon';
    
    const plan = plans.find(p => p.id === client.payment_plan_id);
    if (plan && new Date(client.plan_start_date) > new Date(Date.now() - 1000 * 60 * 60 * 24 * 14)) {
      return 'trial';
    }
    
    return 'active';
  };

  // Get engagement score (mock calculation)
  const getEngagementScore = (client) => {
    // This would normally be calculated based on real attendance data
    // For demo purposes, we'll create a simple mock calculation
    const id = client.user_id;
    const score = ((parseInt(id.substring(0, 8), 16) % 100) / 100);
    return score > 0.7; // High engagement if score > 0.7
  };

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    
    return clients
      .filter(client => {
        // Search query filter
        const matchesSearch = !searchQuery || 
          client.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
          client.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.phone?.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Plan filter
        const matchesPlan = !planFilter || client.payment_plan_id === planFilter;
        
        return matchesSearch && matchesPlan;
      })
      .sort((a, b) => {
        let aValue, bValue;
        
        switch (sortField) {
          case 'name':
            aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
            bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
            break;
          case 'email':
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case 'plan_start_date':
            aValue = a.plan_start_date ? new Date(a.plan_start_date).getTime() : 0;
            bValue = b.plan_start_date ? new Date(b.plan_start_date).getTime() : 0;
            break;
          case 'plan_end_date':
            aValue = a.plan_end_date ? new Date(a.plan_end_date).getTime() : 0;
            bValue = b.plan_end_date ? new Date(b.plan_end_date).getTime() : 0;
            break;
          case 'plan':
            const planA = plans.find(p => p.id === a.payment_plan_id);
            const planB = plans.find(p => p.id === b.payment_plan_id);
            aValue = planA ? planA.name.toLowerCase() : '';
            bValue = planB ? planB.name.toLowerCase() : '';
            break;
          default:
            aValue = a[sortField] || '';
            bValue = b[sortField] || '';
        }
        
        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
  }, [clients, searchQuery, planFilter, sortField, sortDirection, plans]);

  // Determine if user has specific permissions
  const hasPermission = (permission) => {
    const permissionMap = {
      'view': ['admin', 'manager', 'staff'],
      'edit': ['admin', 'manager'],
      'delete': ['admin']
    };
    
    return permissionMap[permission].includes(currentUserRole);
  };

  // Render mobile card view
  const renderMobileView = () => (
    <div className="clients-mobile-view">
      {filteredClients.map(client => {
        const plan = plans.find(p => p.id === client.payment_plan_id);
        const status = getMembershipStatus(client);
        const isHighEngagement = getEngagementScore(client);
        
        return (
          <div key={client.user_id} className="client-card">
            <div className="client-card-header">
              <div className="client-card-avatar">
                <ClientAvatar 
                  firstName={client.first_name} 
                  lastName={client.last_name} 
                />
                {isHighEngagement && (
                  <span className="high-engagement" title="High engagement">
                    <FireIcon className="icon-sm" />
                  </span>
                )}
              </div>
              <div className="client-card-name">
                <h3>{client.first_name} {client.last_name}</h3>
                <ClientStatusBadge status={status} />
              </div>
              <div className="client-card-actions">
                <button 
                  className="icon-button"
                  onClick={() => setActionsMenuOpen(actionsMenuOpen === client.user_id ? null : client.user_id)}
                >
                  <DotsVerticalIcon className="icon-sm" />
                </button>
                {actionsMenuOpen === client.user_id && (
                  <div className="actions-menu">
                    {hasPermission('view') && (
                      <button 
                        className="menu-item"
                        onClick={() => {
                          onViewClient(client.user_id);
                          setActionsMenuOpen(null);
                        }}
                      >
                        <EyeIcon className="icon-sm" />
                        <span>View</span>
                      </button>
                    )}
                    {hasPermission('edit') && (
                      <button 
                        className="menu-item"
                        onClick={() => {
                          onEditClient(client.user_id);
                          setActionsMenuOpen(null);
                        }}
                      >
                        <PencilIcon className="icon-sm" />
                        <span>Edit</span>
                      </button>
                    )}
                    <button 
                      className="menu-item"
                      onClick={() => {
                        window.open(`mailto:${client.email}`);
                        setActionsMenuOpen(null);
                      }}
                    >
                      <MailIcon className="icon-sm" />
                      <span>Email</span>
                    </button>
                    <button 
                      className="menu-item"
                      onClick={() => {
                        window.open(`tel:${client.phone}`);
                        setActionsMenuOpen(null);
                      }}
                    >
                      <PhoneIcon className="icon-sm" />
                      <span>Call</span>
                    </button>
                    <button 
                      className="menu-item"
                      onClick={() => {
                        setTagsMenuOpen(tagsMenuOpen === client.user_id ? null : client.user_id);
                        setActionsMenuOpen(null);
                      }}
                    >
                      <TagIcon className="icon-sm" />
                      <span>Tags</span>
                    </button>
                    {status === 'expiring-soon' && (
                      <button 
                        className="menu-item highlight"
                        onClick={() => handleSendRenewalReminder(client.user_id)}
                      >
                        <BellIcon className="icon-sm" />
                        <span>Send Renewal Reminder</span>
                      </button>
                    )}
                    {hasPermission('delete') && (
                      <button 
                        className="menu-item danger"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${client.first_name} ${client.last_name}?`)) {
                            onDeleteClient(client.user_id);
                          }
                          setActionsMenuOpen(null);
                        }}
                      >
                        <TrashIcon className="icon-sm" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="client-card-details">
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{client.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{client.phone || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Plan:</span>
                <span className="detail-value">{plan?.name || 'No Plan'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Start Date:</span>
                <span className="detail-value">
                  {client.plan_start_date ? new Date(client.plan_start_date).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">End Date:</span>
                <span className="detail-value">
                  {client.plan_end_date ? new Date(client.plan_end_date).toLocaleDateString() : '-'}
                </span>
              </div>
            </div>
            {client.tags && client.tags.length > 0 && (
              <div className="client-card-tags">
                {client.tags.map(tag => (
                  <span key={tag} className="client-tag">{tag}</span>
                ))}
              </div>
            )}
            {tagsMenuOpen === client.user_id && (
              <div className="tags-menu">
                <div className="tags-menu-header">
                  <h4>Manage Tags</h4>
                  <button 
                    className="icon-button"
                    onClick={() => setTagsMenuOpen(null)}
                  >
                    ×
                  </button>
                </div>
                <div className="tags-list">
                  {availableTags.map(tag => {
                    const isSelected = client.tags && client.tags.includes(tag);
                    return (
                      <button 
                        key={tag}
                        className={`tag-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleTag(client.user_id, tag)}
                      >
                        {isSelected && <CheckIcon className="icon-xs" />}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Render desktop table view
  const renderDesktopView = () => (
    <div className="clients-table-container">
      <table className="clients-table">
        <thead>
          <tr>
            <th>
              <input 
                type="checkbox" 
                checked={selectAll}
                onChange={handleSelectAll}
                aria-label="Select all clients"
              />
            </th>
            <th 
              className="sortable-header"
              onClick={() => handleSort('name')}
            >
              NAME
              {sortField === 'name' && (
                <span className="sort-icon">
                  {sortDirection === 'asc' ? 
                    <SortAscendingIcon className="icon-xs" /> : 
                    <SortDescendingIcon className="icon-xs" />
                  }
                </span>
              )}
            </th>
            <th 
              className="sortable-header"
              onClick={() => handleSort('email')}
            >
              EMAIL
              {sortField === 'email' && (
                <span className="sort-icon">
                  {sortDirection === 'asc' ? 
                    <SortAscendingIcon className="icon-xs" /> : 
                    <SortDescendingIcon className="icon-xs" />
                  }
                </span>
              )}
            </th>
            <th>PHONE</th>
            <th 
              className="sortable-header"
              onClick={() => handleSort('plan')}
            >
              PLAN
              {sortField === 'plan' && (
                <span className="sort-icon">
                  {sortDirection === 'asc' ? 
                    <SortAscendingIcon className="icon-xs" /> : 
                    <SortDescendingIcon className="icon-xs" />
                  }
                </span>
              )}
            </th>
            <th 
              className="sortable-header"
              onClick={() => handleSort('plan_start_date')}
            >
              START DATE
              {sortField === 'plan_start_date' && (
                <span className="sort-icon">
                  {sortDirection === 'asc' ? 
                    <SortAscendingIcon className="icon-xs" /> : 
                    <SortDescendingIcon className="icon-xs" />
                  }
                </span>
              )}
            </th>
            <th 
              className="sortable-header"
              onClick={() => handleSort('plan_end_date')}
            >
              END DATE
              {sortField === 'plan_end_date' && (
                <span className="sort-icon">
                  {sortDirection === 'asc' ? 
                    <SortAscendingIcon className="icon-xs" /> : 
                    <SortDescendingIcon className="icon-xs" />
                  }
                </span>
              )}
            </th>
            <th>STATUS</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {filteredClients.map((client, index) => {
            const plan = plans.find(p => p.id === client.payment_plan_id);
            const status = getMembershipStatus(client);
            const isHighEngagement = getEngagementScore(client);
            
            return (
              <tr 
                key={client.user_id} 
                className={index % 2 === 0 ? 'even-row' : 'odd-row'}
              >
                <td>
                  <input 
                    type="checkbox" 
                    checked={selectedClients.includes(client.user_id)}
                    onChange={() => handleSelectClient(client.user_id)}
                    aria-label={`Select ${client.first_name} ${client.last_name}`}
                  />
                </td>
                <td className="name-cell">
                  <div className="client-name">
                    <ClientAvatar 
                      firstName={client.first_name} 
                      lastName={client.last_name} 
                    />
                    <span>
                      {client.first_name} {client.last_name}
                      {isHighEngagement && (
                        <span className="high-engagement" title="High engagement">
                          <FireIcon className="icon-sm" />
                        </span>
                      )}
                      {client.tags && client.tags.length > 0 && (
                        <div className="client-tags">
                          {client.tags.map(tag => (
                            <span key={tag} className="client-tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </span>
                  </div>
                </td>
                <td title={client.email} className="truncate-text">{client.email}</td>
                <td title={client.phone} className="truncate-text">{client.phone || '-'}</td>
                <td>{plan?.name || 'No Plan'}</td>
                <td>
                  {client.plan_start_date ? new Date(client.plan_start_date).toLocaleDateString() : '-'}
                </td>
                <td>
                  {client.plan_end_date ? new Date(client.plan_end_date).toLocaleDateString() : '-'}
                </td>
                <td>
                  <ClientStatusBadge status={status} />
                </td>
                <td>
                  <div className="actions-container">
                    <button 
                      className="icon-button"
                      onClick={() => onViewClient(client.user_id)}
                      title="View client details"
                    >
                      <EyeIcon className="icon-sm" />
                    </button>
                    {hasPermission('edit') && (
                      <button 
                        className="icon-button"
                        onClick={() => onEditClient(client.user_id)}
                        title="Edit client"
                      >
                        <PencilIcon className="icon-sm" />
                      </button>
                    )}
                    <button 
                      className="icon-button"
                      onClick={() => window.open(`mailto:${client.email}`)}
                      title="Send email"
                    >
                      <MailIcon className="icon-sm" />
                    </button>
                    <button 
                      className="icon-button"
                      onClick={() => setActionsMenuOpen(actionsMenuOpen === client.user_id ? null : client.user_id)}
                      title="More actions"
                    >
                      <DotsVerticalIcon className="icon-sm" />
                    </button>
                    {actionsMenuOpen === client.user_id && (
                      <div className="actions-menu">
                        <button 
                          className="menu-item"
                          onClick={() => {
                            window.open(`tel:${client.phone}`);
                            setActionsMenuOpen(null);
                          }}
                        >
                          <PhoneIcon className="icon-sm" />
                          <span>Call</span>
                        </button>
                        <button 
                          className="menu-item"
                          onClick={() => {
                            setTagsMenuOpen(tagsMenuOpen === client.user_id ? null : client.user_id);
                            setActionsMenuOpen(null);
                          }}
                        >
                          <TagIcon className="icon-sm" />
                          <span>Manage Tags</span>
                        </button>
                        <button 
                          className="menu-item"
                          onClick={() => {
                            // Implement export to PDF logic
                            alert(`Exporting ${client.first_name}'s data to PDF`);
                            setActionsMenuOpen(null);
                          }}
                        >
                          <DocumentDownloadIcon className="icon-sm" />
                          <span>Export to PDF</span>
                        </button>
                        <button 
                          className="menu-item"
                          onClick={() => {
                            // Implement add note logic
                            alert(`Add note for ${client.first_name}`);
                            setActionsMenuOpen(null);
                          }}
                        >
                          <ChatAltIcon className="icon-sm" />
                          <span>Add Note</span>
                        </button>
                        {status === 'expiring-soon' && (
                          <button 
                            className="menu-item highlight"
                            onClick={() => handleSendRenewalReminder(client.user_id)}
                          >
                            <BellIcon className="icon-sm" />
                            <span>Send Renewal Reminder</span>
                          </button>
                        )}
                        {hasPermission('delete') && (
                          <button 
                            className="menu-item danger"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete ${client.first_name} ${client.last_name}?`)) {
                                onDeleteClient(client.user_id);
                              }
                              setActionsMenuOpen(null);
                            }}
                          >
                            <TrashIcon className="icon-sm" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                    {tagsMenuOpen === client.user_id && (
                      <div className="tags-menu">
                        <div className="tags-menu-header">
                          <h4>Manage Tags</h4>
                          <button 
                            className="icon-button"
                            onClick={() => setTagsMenuOpen(null)}
                          >
                            ×
                          </button>
                        </div>
                        <div className="tags-list">
                          {availableTags.map(tag => {
                            const isSelected = client.tags && client.tags.includes(tag);
                            return (
                              <button 
                                key={tag}
                                className={`tag-option ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleToggleTag(client.user_id, tag)}
                              >
                                {isSelected && <CheckIcon className="icon-xs" />}
                                <span>{tag}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="clients-module">
      {/* Analytics Dashboard */}
      <div className="clients-analytics">
        <div className="analytics-card">
          <div className="analytics-value">{analytics.totalClients}</div>
          <div className="analytics-label">Total Clients</div>
        </div>
        <div className="analytics-card">
          <div className="analytics-value">{analytics.monthlyPlans}</div>
          <div className="analytics-label">Monthly Plans</div>
        </div>
        <div className="analytics-card">
          <div className="analytics-value">{analytics.yearlyPlans}</div>
          <div className="analytics-label">Yearly Plans</div>
        </div>
        <div className="analytics-card">
          <div className="analytics-value">{analytics.newThisMonth}</div>
          <div className="analytics-label">New This Month</div>
        </div>
      </div>

      {/* Search and Filter Tools */}
      <div className="clients-tools">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search clients by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-container">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="plan-filter"
          >
            <option value="">All Plans</option>
            {plans.map(plan => (
              <option key={plan.id} value={plan.id}>{plan.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedClients.length > 0 && (
        <div className="bulk-actions">
          <span className="selected-count">
            {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected
          </span>
          <div className="bulk-actions-buttons">
            <button 
              className="bulk-action-btn"
              onClick={handleBulkEmail}
              title="Email selected clients"
            >
              <MailIcon className="icon-sm" />
              <span>Email</span>
            </button>
            <button 
              className="bulk-action-btn"
              onClick={handleBulkExport}
              title="Export selected clients"
            >
              <DocumentDownloadIcon className="icon-sm" />
              <span>Export</span>
            </button>
            {hasPermission('delete') && (
              <button 
                className="bulk-action-btn danger"
                onClick={handleBulkDelete}
                title="Delete selected clients"
              >
                <TrashIcon className="icon-sm" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Client List (Responsive) */}
      <div className="clients-list-container">
        <div className="desktop-view">
          {renderDesktopView()}
        </div>
        <div className="mobile-view">
          {renderMobileView()}
        </div>
      </div>
    </div>
  );
};

export default ClientsTable; 