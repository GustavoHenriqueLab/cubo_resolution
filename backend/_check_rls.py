import sys, requests
sys.path.insert(0, "src")
from cubo.config import load_config

config = load_config()

# Check RLS
url = config.supabase_url.rstrip("/") + "/pg_policies?select=*"
headers = {
    "apikey": config.supabase_service_role_key,
    "Authorization": f"Bearer {config.supabase_service_role_key}",
}
r = requests.get(url, headers=headers)
if r.ok:
    policies = r.json()
    print(f"RLS Policies: {len(policies)}")
    for p in policies:
        print(f"  {p['tablename']:25s} | {p['policyname']:40s} | cmd={p['cmd']:10s}")
else:
    print(f"Erro: {r.status_code} {r.text[:200]}")
