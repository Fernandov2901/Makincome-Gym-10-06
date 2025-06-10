import React from 'react';

const Table = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div className="w-full overflow-auto">
      <table
        ref={ref}
        className={`w-full caption-bottom text-sm ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
});
Table.displayName = 'Table';

const TableHeader = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <thead ref={ref} className={`${className}`} {...props}>
      {children}
    </thead>
  );
});
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <tbody ref={ref} className={`${className}`} {...props}>
      {children}
    </tbody>
  );
});
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <tfoot
      ref={ref}
      className={`border-t bg-muted/50 font-medium ${className}`}
      {...props}
    >
      {children}
    </tfoot>
  );
});
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <tr
      ref={ref}
      className={`border-b transition-colors hover:bg-muted/10 data-[state=selected]:bg-muted ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
});
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <th
      ref={ref}
      className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground ${className}`}
      {...props}
    >
      {children}
    </th>
  );
});
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <td
      ref={ref}
      className={`p-4 align-middle ${className}`}
      {...props}
    >
      {children}
    </td>
  );
});
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={`mt-4 text-sm text-muted-foreground ${className}`}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}; 