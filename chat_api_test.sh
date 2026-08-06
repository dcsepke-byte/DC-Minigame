#!/usr/bin/env bash
# API-Review-Test fürs HUB Multi-Chat-System (unabhängiger Review)
B="http://127.0.0.1:5120"
J="-H Content-Type:application/json"
C="-b /tmp/hub_cookies.txt"

echo "=== 1. POST /api/chats (XSS-Titel + Projekt) ==="
CREATE=$(curl -s $C $J -X POST "$B/api/chats" -d '{"title":"<img src=x onerror=alert(1)>","project":"XSS-Test \" onmouseover=alert(2) \""}')
echo "$CREATE"
ID=$(echo "$CREATE" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "ID=$ID"

echo; echo "=== 2. GET /api/chats/<id> (Detail) ==="
curl -s $C "$B/api/chats/$ID" | head -c 500; echo

echo; echo "=== 3. GET /api/chats/ungueltige-id (erwartet 404) ==="
curl -s $C -o /dev/null -w "HTTP %{http_code} " "$B/api/chats/does_not_exist"; curl -s $C "$B/api/chats/does_not_exist"; echo

echo; echo "=== 4. POST messages leer (erwartet 400) ==="
curl -s $C $J -X POST "$B/api/chats/$ID/messages" -d '{"content":"   "}' -w " [HTTP %{http_code}]"; echo

echo; echo "=== 5. POST message mit XSS-Content ==="
curl -s $C $J -X POST "$B/api/chats/$ID/messages" -d '{"content":"Hallo <script>alert(1)</script> & <b>Test</b>"}' | head -c 800; echo

echo; echo "=== 6. PATCH rename ==="
curl -s $C $J -X PATCH "$B/api/chats/$ID" -d '{"title":"Umbenannt"}' | head -c 300; echo
curl -s $C $J -X PATCH "$B/api/chats/$ID" -d '{"title":""}' -w " [HTTP %{http_code}]"; echo

echo; echo "=== 7. GET /api/chats Liste (Meta) ==="
curl -s $C "$B/api/chats" | python3 -m json.tool | head -30

echo; echo "=== 8. DELETE Thread ==="
curl -s $C -X DELETE "$B/api/chats/$ID"; echo
curl -s $C -X DELETE "$B/api/chats/$ID"; echo " (2. DELETE erwartet ok:false)"
curl -s $C "$B/api/chats"; echo

echo; echo "=== 9. Ohne Login (erwartet Redirect statt 401) ==="
curl -s -o /dev/null -w "HTTP %{http_code} -> %{redirect_url}\n" "http://127.0.0.1:5120/api/chats"

echo; echo "=== 10. chats.json nach Test ==="
cat /opt/data/hub/files/chats.json
