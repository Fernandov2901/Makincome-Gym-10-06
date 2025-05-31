import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase project URL and anon key
const supabaseUrl = 'https://idfvmhdhtsgpxxakizij.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkZnZtaGRodHNncHh4YWtpemlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NzA4MTIsImV4cCI6MjA2MzA0NjgxMn0.b9pDv-etgxXcrBQCZMwrb-RbFfWS21Xdr9xSy87HfAY';

// Singleton pattern for Vite/React Fast Refresh
const supabase = window.__supabase__ || (window.__supabase__ = createClient(supabaseUrl, supabaseAnonKey));

export default supabase; 