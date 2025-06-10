import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { debounce } from 'lodash';
import Fuse from 'fuse.js';
import supabase from '../../supabaseClient';
import CoachAvatar from './coach-avatar';
import EmptyIllustration from './empty-illustration';
import {
  Card,
  CardContent,
  CardHeader,
} from '../ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
  SheetTrigger,
} from '../ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import {
  Search as SearchIcon,
  Plus as PlusIcon,
  MoreVertical as MoreVerticalIcon,
  Edit as EditIcon,
  Trash as TrashIcon,
  Ban as BanIcon,
  CheckCircle as CheckCircleIcon,
  ArrowUpDown as ArrowUpDownIcon
} from 'lucide-react';

// Format phone numbers
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  // Format as (XXX) XXX-XXXX
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phoneNumber;
};

// Format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Skeleton loading rows
const TableSkeleton = () => {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell>
            <div className="flex space-x-1">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
        </TableRow>
      ))}
    </>
  );
};

// Empty state component
const EmptyState = ({ onAddCoach }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <EmptyIllustration className="h-40 w-40 text-muted-foreground" />
    <h3 className="mt-4 text-lg font-medium">No coaches found</h3>
    <p className="mt-2 text-sm text-muted-foreground">
      Get started by adding your first coach
    </p>
    <Button 
      className="mt-4" 
      onClick={onAddCoach}
      aria-label="Add your first coach"
    >
      <PlusIcon className="mr-2 h-4 w-4" />
      Add your first coach
    </Button>
  </div>
);

// Coach form component
const CoachForm = ({ coach, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    style: '',
    availableDays: [],
    salary: '',
    ...coach,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => {
      const days = prev.availableDays || [];
      if (days.includes(day)) {
        return { ...prev, availableDays: days.filter(d => d !== day) };
      } else {
        return { ...prev, availableDays: [...days, day] };
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            aria-label="First Name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            aria-label="Last Name"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          aria-label="Email"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          aria-label="Phone"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="style">Coaching Style</Label>
        <Input
          id="style"
          name="style"
          value={formData.style}
          onChange={handleChange}
          aria-label="Coaching Style"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Available Days</Label>
        <div className="grid grid-cols-4 gap-2">
          {weekdays.map(day => (
            <div key={day} className="flex items-center space-x-2">
              <Checkbox
                id={`day-${day}`}
                checked={(formData.availableDays || []).includes(day)}
                onCheckedChange={() => handleDayToggle(day)}
                aria-label={day}
              />
              <Label htmlFor={`day-${day}`}>{day}</Label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="salary">Salary</Label>
        <Input
          id="salary"
          name="salary"
          type="number"
          step="0.01"
          min="0"
          value={formData.salary}
          onChange={handleChange}
          aria-label="Salary"
        />
      </div>
      
      <SheetFooter>
        <SheetClose asChild>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </SheetClose>
        <Button type="submit">
          {coach?.id ? 'Update Coach' : 'Add Coach'}
        </Button>
      </SheetFooter>
    </form>
  );
};

// Main component
const CoachesPage = () => {
  const [coaches, setCoaches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [coachToDelete, setCoachToDelete] = useState(null);
  const [sorting, setSorting] = useState({ field: 'firstName', direction: 'asc' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Fetch coaches from Supabase
  const fetchCoaches = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .order(sorting.field, { ascending: sorting.direction === 'asc' });
      
      if (error) throw error;
      setCoaches(data || []);
    } catch (error) {
      console.error('Error fetching coaches:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCoaches();
  }, [sorting]);
  
  // Handle adding a new coach
  const handleAddCoach = async (coachData) => {
    try {
      const { data, error } = await supabase
        .from('coaches')
        .insert([coachData])
        .select();
        
      if (error) throw error;
      fetchCoaches();
    } catch (error) {
      console.error('Error adding coach:', error);
    }
  };
  
  // Handle updating a coach
  const handleUpdateCoach = async (coachData) => {
    try {
      const { error } = await supabase
        .from('coaches')
        .update(coachData)
        .eq('id', coachData.id);
        
      if (error) throw error;
      fetchCoaches();
    } catch (error) {
      console.error('Error updating coach:', error);
    }
  };
  
  // Handle deleting a coach
  const handleDeleteCoach = async () => {
    if (!coachToDelete) return;
    
    try {
      const { error } = await supabase
        .from('coaches')
        .delete()
        .eq('id', coachToDelete.id);
        
      if (error) throw error;
      setCoachToDelete(null);
      setIsDialogOpen(false);
      fetchCoaches();
    } catch (error) {
      console.error('Error deleting coach:', error);
    }
  };
  
  // Handle coach form submission
  const handleCoachFormSubmit = (coachData) => {
    if (coachData.id) {
      handleUpdateCoach(coachData);
    } else {
      handleAddCoach(coachData);
    }
  };
  
  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchQuery(value);
    }, 300),
    []
  );
  
  // Handle input change for search
  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };
  
  // Toggle sorting
  const toggleSort = (field) => {
    setSorting(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Fuzzy search with Fuse.js
  const filteredCoaches = useMemo(() => {
    if (!searchQuery.trim()) return coaches;
    
    const fuse = new Fuse(coaches, {
      keys: ['firstName', 'lastName', 'email'],
      threshold: 0.3,
    });
    
    return fuse.search(searchQuery).map(result => result.item);
  }, [coaches, searchQuery]);
  
  // Handle deactivating a coach (placeholder function)
  const handleDeactivateCoach = (coach) => {
    // This would be implemented with actual status update logic
    console.log('Deactivate coach:', coach);
  };
  
  // Open add coach sheet
  const handleAddCoachClick = () => {
    setSelectedCoach(null);
  };
  
  // Open edit coach sheet
  const handleEditCoach = (coach) => {
    setSelectedCoach(coach);
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (coach) => {
    setCoachToDelete(coach);
    setIsDialogOpen(true);
  };

  return (
    <Card className="p-6 rounded-2xl backdrop-blur-sm bg-white/80 border border-white/40 shadow-xl/5">
      <CardHeader className="p-0 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative w-full md:w-auto max-w-sm">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 pr-4"
              placeholder="Search coaches..."
              onChange={handleSearchChange}
              aria-label="Search coaches"
            />
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-primary-600">
                <PlusIcon className="mr-2 h-4 w-4" />
                Add coach
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-md">
              <SheetHeader>
                <SheetTitle>{selectedCoach ? 'Edit Coach' : 'Add New Coach'}</SheetTitle>
                <SheetDescription>
                  {selectedCoach 
                    ? 'Update the coach details and click save.'
                    : 'Fill in the coach details and click add.'}
                </SheetDescription>
              </SheetHeader>
              <div className="py-4">
                <CoachForm 
                  coach={selectedCoach} 
                  onSubmit={handleCoachFormSubmit} 
                  onClose={() => setSelectedCoach(null)}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {isLoading ? (
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Style</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableSkeleton />
            </TableBody>
          </Table>
        ) : filteredCoaches.length > 0 ? (
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => toggleSort('firstName')}
                    className="flex items-center space-x-1 hover:bg-transparent"
                    aria-label="Sort by name"
                  >
                    <span>Name</span>
                    <ArrowUpDownIcon className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Style</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => toggleSort('salary')}
                    className="flex items-center space-x-1 hover:bg-transparent"
                    aria-label="Sort by salary"
                  >
                    <span>Salary</span>
                    <ArrowUpDownIcon className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoaches.map((coach, index) => (
                <TableRow 
                  key={coach.id}
                  className={index % 2 === 0 ? '' : 'odd:bg-muted/5'}
                >
                  <TableCell className="border-b border-muted/40">
                    <div className="flex items-center gap-3">
                      <CoachAvatar 
                        firstName={coach.firstName} 
                        lastName={coach.lastName} 
                        size="md" 
                      />
                      <div>
                        <div className="font-medium">{coach.firstName} {coach.lastName}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="border-b border-muted/40">{coach.email}</TableCell>
                  <TableCell className="border-b border-muted/40">{formatPhoneNumber(coach.phone)}</TableCell>
                  <TableCell className="border-b border-muted/40">{coach.style}</TableCell>
                  <TableCell className="border-b border-muted/40">
                    <div className="flex flex-wrap gap-1">
                      {(coach.availableDays || []).map(day => (
                        <Badge key={day} variant="outline" className="text-xs">
                          {day.slice(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="border-b border-muted/40">{formatCurrency(coach.salary)}</TableCell>
                  <TableCell className="border-b border-muted/40">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVerticalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditCoach(coach)}>
                          <EditIcon className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeactivateCoach(coach)}>
                          <BanIcon className="mr-2 h-4 w-4" />
                          <span>Deactivate</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                          onClick={() => handleDeleteClick(coach)}
                        >
                          <TrashIcon className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState onAddCoach={handleAddCoachClick} />
        )}
      </CardContent>
      
      {/* Confirmation dialog for delete */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {coachToDelete && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Coach</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {coachToDelete.firstName} {coachToDelete.lastName}? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteCoach}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
};

export default CoachesPage; 