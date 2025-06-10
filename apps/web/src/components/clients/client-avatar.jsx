import React from 'react';

const getInitials = (firstName, lastName) => {
  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
  return `${firstInitial}${lastInitial}`;
};

const getAvatarColor = (firstName, lastName) => {
  // Generate a deterministic color based on the initials
  const name = `${firstName}${lastName}`;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use hue-saturation-lightness for vibrant but not too dark colors
  const h = hash % 360;
  const s = 65 + (hash % 20); // Between 65-85%
  const l = 50 + (hash % 10); // Between 50-60%
  
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const ClientAvatar = ({ firstName, lastName, imageUrl, size = 'md' }) => {
  const initials = getInitials(firstName, lastName);
  const bgColor = getAvatarColor(firstName, lastName);
  
  const sizeClass = {
    'sm': 'client-avatar-sm',
    'md': 'client-avatar-md',
    'lg': 'client-avatar-lg',
  }[size] || 'client-avatar-md';
  
  return (
    <div 
      className={`client-avatar ${sizeClass}`} 
      style={{ backgroundColor: bgColor }}
      aria-label={`${firstName} ${lastName}`}
    >
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={`${firstName} ${lastName}`} 
          className="client-avatar-img"
        />
      ) : (
        <span className="client-avatar-initials">{initials}</span>
      )}
    </div>
  );
};

export default ClientAvatar; 