import React, { useState, useRef, useEffect } from 'react';

const DropdownMenu = ({ children }) => {
  const [open, setOpen] = useState(false);
  
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

const DropdownMenuContext = React.createContext(null);

const DropdownMenuTrigger = React.forwardRef(({ asChild = false, children, className, ...props }, ref) => {
  const { setOpen } = React.useContext(DropdownMenuContext);
  
  if (asChild) {
    return React.cloneElement(React.Children.only(children), {
      ref,
      onClick: (e) => {
        e.preventDefault();
        setOpen(prev => !prev);
      },
      className,
      ...props
    });
  }
  
  return (
    <button
      type="button"
      ref={ref}
      onClick={() => setOpen(prev => !prev)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

const DropdownMenuContent = React.forwardRef(({ 
  className,
  align = 'center',
  sideOffset = 4,
  children,
  ...props 
}, ref) => {
  const { open, setOpen } = React.useContext(DropdownMenuContext);
  const dropdownRef = useRef(null);
  
  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0'
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, setOpen]);
  
  if (!open) return null;
  
  return (
    <div
      ref={(node) => {
        // Merge refs
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
        dropdownRef.current = node;
      }}
      className={`z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 absolute mt-${sideOffset} ${alignClasses[align]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuContent.displayName = 'DropdownMenuContent';

const DropdownMenuItem = React.forwardRef(({ className, inset, children, ...props }, ref) => {
  const { setOpen } = React.useContext(DropdownMenuContext);
  
  const handleClick = (e) => {
    if (props.onClick) {
      props.onClick(e);
    }
    setOpen(false);
  };
  
  return (
    <button
      ref={ref}
      className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground ${inset ? 'pl-8' : ''} ${className}`}
      {...props}
      onClick={handleClick}
    >
      {children}
    </button>
  );
});
DropdownMenuItem.displayName = 'DropdownMenuItem';

const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`-mx-1 my-1 h-px bg-muted ${className}`}
    {...props}
  />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}; 