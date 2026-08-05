import sys
sys.path.insert(0, "src")
from cubo.supabase_client import criar_cliente_supabase
from cubo.config import load_config

config = load_config()
supabase = criar_cliente_supabase(config.supabase_url, config.supabase_service_role_key)

# Check startups via service role (should work)
r = supabase.table("startups").select("*", count="exact").execute()
print(f"Service role - startups: {r.count}")

# Check if RLS is enabled by looking at startup count
# If RLS is on but TO authenticated policy exists, anon gets 0 but authenticated gets data
# The problem is: with anon key + authenticated user, does it work?

# Let's verify the profiles have the right column
r = supabase.table("profiles").select("*").execute()
for p in r.data:
    print(f"  Profile: {p.get('nome')} | role={p.get('role')}")

# Now let's check the policies by querying the system
r = supabase.rpc("get_policies"  , {}).execute()
