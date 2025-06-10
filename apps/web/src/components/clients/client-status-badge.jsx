import React from 'react';

const ClientStatusBadge = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          className: 'status-badge-active',
          icon: '●'
        };
      case 'expiring-soon':
        return {
          label: 'Expiring Soon',
          className: 'status-badge-expiring',
          icon: '⚠️'
        };
      case 'expired':
        return {
          label: 'Expired',
          className: 'status-badge-expired',
          icon: '✕'
        };
      case 'trial':
        return {
          label: 'Trial',
          className: 'status-badge-trial',
          icon: '★'
        };
      case 'no-plan':
        return {
          label: 'No Plan',
          className: 'status-badge-no-plan',
          icon: '○'
        };
      default:
        return {
          label: 'Unknown',
          className: 'status-badge-unknown',
          icon: '?'
        };
    }
  };

  const { label, className, icon } = getStatusConfig();

  return (
    <span className={`status-badge ${className}`}>
      <span className="status-icon">{icon}</span>
      <span className="status-text">{label}</span>
    </span>
  );
};

export default ClientStatusBadge; 