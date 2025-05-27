import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ffpuyonlxnnjytnimwmg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcHV5b25seG5uanl0bmltd21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NjI2MjQsImV4cCI6MjA2MzUzODYyNH0.ZRdVu6dKjMDSINiMvCvItaahgpGSDK2GAzEN5JldiOw';

export const supabase = createClient(supabaseUrl, supabaseKey); 