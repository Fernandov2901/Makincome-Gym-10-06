import React from 'react';

const Skeleton = ({ className, ...props }) => (
  <div
    className={`animate-pulse rounded-md bg-muted/30 ${className}`}
    {...props}
  />
);
Skeleton.displayName = "Skeleton";

export { Skeleton }; 