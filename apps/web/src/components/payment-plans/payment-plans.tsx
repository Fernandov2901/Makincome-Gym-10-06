import React, { useState, useEffect, useMemo, useCallback } from 'react';
import supabase from '../../supabaseClient';
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
} from '../ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
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
  Plus as PlusIcon,
  MoreVertical as MoreVerticalIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Eye as EyeIcon,
  ArrowUpDown as ArrowUpDownIcon,
  AlertCircle as AlertCircleIcon,
} from 'lucide-react';

// Types
interface Plan {
  id: string;
  name: string;
  price: number;
  duration: number; // in months
  type: 'service' | 'product';
  archived: boolean;
  created_at: string;
  gym_id: string;
  description?: string;
}

interface ClientProfile {
  payment_plan_id: string;
  plan_end_date: string | null;
}

type SortField = 'name' | 'price' | 'duration' | 'type' | 'activeClients';
type SortDirection = 'asc' | 'desc';

// Formatters
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDuration = (duration: number | null | undefined): string => {
    if (duration === null || duration === undefined) return 'N/A';
    if (duration >= 9999) return 'Lifetime';
    if (duration === 0) return 'One-time';
    if (duration === 1) return '1 Month';
    if (duration === 12) return '1 Year';
    return `${duration} Months`;
};

// UI Components
const TableSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={`skeleton-${i}`} className="hover:bg-transparent">
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
        </TableRow>
      ))}
    </>
);

const EmptyState = ({ onAddPlan }: { onAddPlan: () => void }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <EmptyIllustration className="h-40 w-40 text-gray-400" />
      <h3 className="mt-4 text-lg font-medium text-gray-800">No plans available</h3>
      <p className="mt-2 text-sm text-gray-500">
        Add your first plan to get started.
      </p>
      <Button 
        className="mt-6" 
        onClick={onAddPlan}
        aria-label="Add your first plan"
      >
        <PlusIcon className="mr-2 h-4 w-4" />
        Add Plan
      </Button>
    </div>
);

const PlanForm = ({ plan, onSubmit, onClose }: { plan: Partial<Plan> | null; onSubmit: (data: Partial<Plan>) => void; onClose: () => void; }) => {
    const [formData, setFormData] = useState({
        name: plan?.name ?? '',
        price: plan?.price ?? '',
        duration: plan?.duration ?? '',
        description: plan?.description ?? '',
        type: plan?.type ?? 'service',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submissionData: Partial<Plan> = {
            ...plan,
            name: formData.name,
            price: parseFloat(formData.price as string) || 0,
            duration: parseInt(formData.duration as string, 10),
            type: formData.type as 'service' | 'product',
            description: formData.description
        };
        onSubmit(submissionData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="price">Price (USD)</Label>
                    <Input id="price" name="price" type="number" step="0.01" min="0" value={formData.price} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="duration">Duration (months)</Label>
                    <Input id="duration" name="duration" type="number" min="0" placeholder="e.g., 1, 12, 9999 for Lifetime" value={formData.duration} onChange={handleChange} required />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select id="type" name="type" value={formData.type} onChange={handleChange} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="service">Membership</option>
                    <option value="product">Product</option>
                </select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <SheetFooter className="pt-4">
                <SheetClose>
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                </SheetClose>
                <Button type="submit">{plan?.id ? 'Update Plan' : 'Add Plan'}</Button>
            </SheetFooter>
        </form>
    );
};

// Main Component
const PlansPage = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Partial<Plan> | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sortKey, setSortKey] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const fetchPlansAndClients = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated.");

            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('gym_id')
                .eq('user_id', user.id)
                .single();
            
            if (profileError || !profile) throw new Error("Could not find user profile or gym ID.");
            const { gym_id } = profile;

            const plansPromise = supabase.from('payment_plans').select('*').eq('gym_id', gym_id);
            const clientsPromise = supabase.from('user_profiles').select('payment_plan_id, plan_end_date').eq('gym_id', gym_id);

            const [{ data: plansData, error: plansError }, { data: clientsData, error: clientsError }] = await Promise.all([plansPromise, clientsPromise]);

            if (plansError) throw plansError;
            if (clientsError) throw clientsError;
            
            setPlans(plansData as Plan[] || []);
            setClientProfiles(clientsData as ClientProfile[] || []);

        } catch (error: any) {
            setError(error.message);
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlansAndClients();
    }, [fetchPlansAndClients]);

    const handleFormSubmit = async (planData: Partial<Plan>) => {
        try {
            const { id, ...updateData } = planData;
            if (id) {
                const { error } = await supabase.from('payment_plans').update(updateData).eq('id', id);
                if (error) throw error;
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: profile } = await supabase.from('user_profiles').select('gym_id').eq('user_id', user!.id).single();
                const { error } = await supabase.from('payment_plans').insert([{ ...planData, gym_id: profile!.gym_id, archived: false }]);
                if (error) throw error;
            }
            setIsSheetOpen(false);
            setSelectedPlan(null);
            fetchPlansAndClients();
        } catch (error: any) {
            setError(error.message);
            console.error('Error submitting plan:', error);
        }
    };
    
    const handleToggleArchive = async (plan: Plan) => {
        try {
            const { error } = await supabase.from('payment_plans').update({ archived: !plan.archived }).eq('id', plan.id);
            if (error) throw error;
            fetchPlansAndClients();
        } catch (error: any) {
            setError(error.message);
            console.error('Error archiving plan:', error);
        }
    };

    const handleAddPlanClick = () => {
        setSelectedPlan(null);
        setIsSheetOpen(true);
    };

    const handleEditPlan = (plan: Plan) => {
        setSelectedPlan(plan);
        setIsSheetOpen(true);
    };

    const getActiveClientCount = useCallback((planId: string) => {
        const now = new Date();
        return clientProfiles.filter(client => 
            client.payment_plan_id === planId && 
            (client.plan_end_date ? new Date(client.plan_end_date) > now : true)
        ).length;
    }, [clientProfiles]);

    const handleSort = (field: SortField) => {
        const direction = sortKey === field && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortKey(field);
        setSortDirection(direction);
    };

    const sortedAndFilteredPlans = useMemo(() => {
        let filtered = showArchived ? plans : plans.filter(p => !p.archived);
        
        return [...filtered].sort((a, b) => {
            const dir = sortDirection === 'asc' ? 1 : -1;
            let valA: string | number, valB: string | number;

            if (sortKey === 'activeClients') {
                valA = getActiveClientCount(a.id);
                valB = getActiveClientCount(b.id);
            } else {
                valA = a[sortKey];
                valB = b[sortKey];
            }
            
            if (valA < valB) return -1 * dir;
            if (valA > valB) return 1 * dir;
            return 0;
        });
    }, [plans, showArchived, sortKey, sortDirection, getActiveClientCount]);
    
    return (
        <Card className="p-4 sm:p-6 rounded-2xl shadow-sm">
            <CardHeader className="p-0 mb-6 flex-row justify-between items-center">
                <div className="flex items-center space-x-3">
                    <Checkbox id="showArchived" checked={showArchived} onCheckedChange={(checked: boolean) => setShowArchived(checked)} />
                    <Label htmlFor="showArchived" className="cursor-pointer text-sm font-medium">Show Archived Plans</Label>
                </div>
                <Button onClick={handleAddPlanClick} variant="default" className="ml-auto">
                    <PlusIcon className="mr-2 h-4 w-4" /> Add Plan
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                {error && (
                    <div className="flex items-center p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                        <AlertCircleIcon className="w-5 h-5 mr-3" />
                        <span className="font-medium">Error:</span> {error}
                    </div>
                )}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                {['Name', 'Price', 'Duration', 'Type', 'Active Clients'].map(header => (
                                    <TableHead key={header} className="text-xs uppercase tracking-wide text-muted-foreground font-semibold bg-muted/10">
                                        <Button variant="ghost" onClick={() => handleSort(header.toLowerCase().replace(' ', '') as SortField)}>
                                            {header} <ArrowUpDownIcon className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                ))}
                                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold bg-muted/10">Status</TableHead>
                                <TableHead className="w-[50px] text-right text-xs uppercase tracking-wide text-muted-foreground font-semibold bg-muted/10">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableSkeleton />
                            ) : sortedAndFilteredPlans.length > 0 ? (
                                sortedAndFilteredPlans.map((plan) => (
                                    <TableRow key={plan.id} className="odd:bg-muted/5 hover:bg-white hover:shadow-sm transition duration-150">
                                        <TableCell className="font-medium">{plan.name}</TableCell>
                                        <TableCell>{formatCurrency(plan.price)}</TableCell>
                                        <TableCell>{formatDuration(plan.duration)}</TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize">{plan.type}</Badge></TableCell>
                                        <TableCell className="text-center">{getActiveClientCount(plan.id)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={plan.archived 
                                                ? "text-muted-foreground border-gray-300 bg-gray-50" 
                                                : "text-green-600 border-green-300 bg-green-50"
                                            }>
                                                {plan.archived ? 'Archived' : 'Active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreVerticalIcon className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => handleEditPlan(plan)}><EditIcon className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleToggleArchive(plan)}><ArchiveIcon className="mr-2 h-4 w-4" /> {plan.archived ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleEditPlan(plan)}><EyeIcon className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <EmptyState onAddPlan={handleAddPlanClick} />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
             <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{selectedPlan?.id ? 'Edit Plan' : 'Add New Plan'}</SheetTitle>
                        <SheetDescription>
                            {selectedPlan?.id ? 'Update the plan details below.' : 'Fill in the details for the new plan.'}
                        </SheetDescription>
                    </SheetHeader>
                    <PlanForm 
                        plan={selectedPlan} 
                        onSubmit={handleFormSubmit}
                        onClose={() => setIsSheetOpen(false)}
                    />
                </SheetContent>
            </Sheet>
        </Card>
    );
};

export default PlansPage; 