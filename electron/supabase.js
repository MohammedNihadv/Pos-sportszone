import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ssfvncdohcpvupytvmaq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzZnZuY2RvaGNwdnVweXR2bWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjIxODcsImV4cCI6MjA5MDYzODE4N30.6BP-AcIjFcdpifgRxR36FWSHkmX0ErkXbtQcJhUbBaI';

export const supabase = createClient(supabaseUrl, supabaseKey);
