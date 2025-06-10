import React from 'react';

export const EmptyIllustration = ({ className = '' }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Stylized coach figure */}
      <circle cx="12" cy="7" r="4" />
      <path d="M8 14h8a4 4 0 0 1 4 4v2H4v-2a4 4 0 0 1 4-4z" />
      
      {/* Whistle */}
      <circle cx="16" cy="11" r="1" />
      <path d="M16 11 L18 14" />
      
      {/* Plus signs to indicate "add" */}
      <path d="M19 3v4M17 5h4" />
      <path d="M5 3v4M3 5h4" />
    </svg>
  );
};

export default EmptyIllustration; 