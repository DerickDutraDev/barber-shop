// supabaseClient.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Cliente para frontend público (pode usar anon key se precisar de SELECT público)
const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Cliente seguro para backend (service role) - para inserts e updates protegidos
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = { supabasePublic, supabaseAdmin };
