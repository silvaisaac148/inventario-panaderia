"""Quick API test script."""
import urllib.request, json

BASE = "http://localhost:8000/api"

def api(method, path, data=None, token=None, content_type="application/json"):
    headers = {}
    if content_type:
        headers["Content-Type"] = content_type
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = None
    if data and content_type == "application/json":
        body = json.dumps(data).encode()
    elif data:
        body = data.encode()
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

# 1. Register
s, r = api("POST", "/auth/registro", {"email":"admin@panaderia.com","password":"123456","nombre":"Admin","rol":"admin"})
print(f"1. Registro: {s} - {r.get('email', r.get('detail', '?'))}")

# 2. Login
s, r = api("POST", "/auth/login", "username=admin@panaderia.com&password=123456", content_type="application/x-www-form-urlencoded")
token = r.get("access_token", "")
print(f"2. Login: {s} - token={'OK' if token else 'FAIL'}")

if not token:
    print("No token, stopping")
    exit()

# 3. Create ingredient
s, r = api("POST", "/ingredientes/", {"nombre":"Harina de Trigo","unidad_medida":"kg","stock_actual":25,"stock_minimo":5,"costo_unitario":15}, token)
ing_id = r.get("id", "?")
print(f"3. Crear ingrediente: {s} - id={ing_id}")

# 4. List
s, r = api("GET", "/ingredientes/", token=token)
print(f"4. Listar: {s} - {len(r)} ingredientes")

# 5. Delete
s, r = api("DELETE", f"/ingredientes/{ing_id}", token=token)
print(f"5. Eliminar: {s} - {r}")

# 6. Dashboard
s, r = api("GET", "/reportes/dashboard", token=token)
print(f"6. Dashboard: {s} - ingredientes={r.get('total_ingredientes')}, productos={r.get('total_productos')}")

print("\n=== ALL TESTS DONE ===")
