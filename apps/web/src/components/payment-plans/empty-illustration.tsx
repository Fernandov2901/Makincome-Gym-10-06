import React from 'react';

export const EmptyIllustration = ({ className = '' }: { className?: string }) => {
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
      {/* A stack of cards representing plans */}
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M6 15h12" />
      <path d="M6 11h12" />
      <path d="M10 11v4" />
      <path d="M14 11v4" />
      {/* A smaller card behind */}
      <path d="M4.02 7.23a2 2 0 0 1 1.76-1.23h12.44a2 2 0 0 1 1.76 1.23l-1.04 4.16a2 2 0 0 1-1.76 1.23H6.82a2 2 0 0 1-1.76-1.23L4.02 7.23z" transform="translate(1, -2) rotate(5 12 12)" opacity="0.5"/>
      {/* Plus icon */}
      <path d="M19 3v4M17 5h4" />
    </svg>
  );
};

export default EmptyIllustration; 