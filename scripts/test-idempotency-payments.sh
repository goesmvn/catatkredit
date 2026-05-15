#!/usr/bin/env bash
set -euo pipefail

BASE=${BASE_URL:-http://localhost:3000}
ID="pay-test-$(date +%s)-$RANDOM"
TIMESTAMP=$(( $(date +%s) * 1000 ))

PAYLOAD="{\"id\":\"$ID\",\"customer_id\":\"c1\",\"nominal_bayar\":5000,\"tanggal_bayar\":$TIMESTAMP,\"created_by\":null}"

echo "Posting payment with id=$ID to $BASE/api/payments"
status1=$(curl -s -o /tmp/pay1.json -w '%{http_code}' -X POST "$BASE/api/payments" -H "Content-Type: application/json" -d "$PAYLOAD")
echo "First request HTTP status: $status1"
echo "Response body:" 
cat /tmp/pay1.json

echo "\nPosting same payment id again (idempotency check)"
status2=$(curl -s -o /tmp/pay2.json -w '%{http_code}' -X POST "$BASE/api/payments" -H "Content-Type: application/json" -d "$PAYLOAD")
echo "Second request HTTP status: $status2"
echo "Response body:" 
cat /tmp/pay2.json

if [ "$status1" = "201" ] && [ "$status2" = "200" ]; then
  echo "\nPASS: idempotency behavior OK (201 then 200)"
  exit 0
else
  echo "\nFAIL: unexpected statuses: $status1 then $status2"
  exit 2
fi
