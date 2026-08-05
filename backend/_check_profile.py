import sys
sys.path.insert(0, 'src')
from cubo.supabase_client import criar_cliente_supabase
from cubo.config import load_config

config = load_config()
supabase = criar_cliente_supabase(config.supabase_url, config.supabase_service_role_key)
r = supabase.table('profiles').select('*').execute()
print(f"Profiles: {len(r.data)}")
for p in r.data:
    print(f"  nome={p.get('nome')}, role={p.get('role')}")
