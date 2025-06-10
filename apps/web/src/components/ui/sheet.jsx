import React, { useState, useCallback, useEffect } from 'react';

const SheetContext = React.createContext();

const Sheet = ({ children }) => {
  const [open, setOpen] = useState(false);
  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
};

const SheetTrigger = React.forwardRef(({ className, asChild = false, children, ...props }, ref) => {
  const { setOpen } = React.useContext(SheetContext);
  
  const handleClick = useCallback(() => {
    setOpen(true);
  }, [setOpen]);
  
  if (asChild) {
    return React.cloneElement(React.Children.only(children), {
      onClick: handleClick,
      ref,
      ...props
    });
  }
  
  return (
    <button onClick={handleClick} ref={ref} className={className} {...props}>
      {children}
    </button>
  );
});
SheetTrigger.displayName = "SheetTrigger";

const SheetContent = React.forwardRef(({ className, children, side = "right", ...props }, ref) => {
  const { open, setOpen } = React.useContext(SheetContext);
  
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [open]);
  
  if (!open) return null;
  
  const sidePositions = {
    top: "inset-x-0 top-0 border-b",
    right: "inset-y-0 right-0 h-full border-l",
    bottom: "inset-x-0 bottom-0 border-t",
    left: "inset-y-0 left-0 h-full border-r",
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div 
        ref={ref} 
        className={`fixed ${sidePositions[side]} z-50 grid w-full max-w-lg gap-4 bg-background p-6 shadow-lg duration-200 sm:max-w-lg ${className}`}
        {...props}
      >
        {children}
        <button 
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
});
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }) => (
  <div
    className={`flex flex-col space-y-2 text-center sm:text-left ${className}`}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-lg font-semibold leading-none tracking-tight ${className}`}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-muted-foreground ${className}`}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

const SheetClose = React.forwardRef(({ className, asChild = false, children, ...props }, ref) => {
  const { setOpen } = React.useContext(SheetContext);
  
  const handleClick = useCallback(() => {
    setOpen(false);
  }, [setOpen]);
  
  if (asChild) {
    return React.cloneElement(React.Children.only(children), {
      onClick: handleClick,
      ref,
      ...props
    });
  }
  
  return (
    <button onClick={handleClick} ref={ref} className={className} {...props}>
      {children}
    </button>
  );
});
SheetClose.displayName = "SheetClose";

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
}; 