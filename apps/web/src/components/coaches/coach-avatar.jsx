import React from 'react';

// Get initials from first and last name
const getInitials = (firstName, lastName) => {
  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
  return `${firstInitial}${lastInitial}`;
};

// Generate a deterministic color based on name
const getAvatarColor = (firstName, lastName) => {
  const name = `${firstName}${lastName}`;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use HSL for vibrant but not too dark colors
  const h = hash % 360;
  const s = 65 + (hash % 25); // Between 65-90%
  const l = 45 + (hash % 15); // Between 45-60%
  
  return `hsl(${h}, ${s}%, ${l}%)`;
};

export const CoachAvatar = ({ 
  firstName = '', 
  lastName = '', 
  imageUrl,
  className = '',
  size = 'md' 
}) => {
  const initials = getInitials(firstName, lastName);
  const bgColor = getAvatarColor(firstName, lastName);
  
  // Define size classes
  const sizeClasses = {
    'sm': 'h-8 w-8 text-xs',
    'md': 'h-10 w-10 text-sm',
    'lg': 'h-14 w-14 text-base',
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  return (
    <div 
      className={`flex items-center justify-center rounded-full font-medium text-white ${sizeClass} ${className}`}
      style={{ backgroundColor: bgColor }}
      aria-label={`${firstName} ${lastName}`}
    >
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={`${firstName} ${lastName}`}
          className="h-full w-full object-cover rounded-full"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default CoachAvatar; 