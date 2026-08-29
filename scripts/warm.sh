#!/usr/bin/env bash
# Pre-warm the answer cache for the demo script.
# Cala latency swings between 3s and 43s; run this before recording or presenting.
set -u
BASE="${BASE:-http://localhost:3005}"

ask () {
  echo "-> $1"
  curl -s --max-time 150 -X POST "$BASE/api/ask" \
    -H "Content-Type: application/json" -d "$2" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print('  ', d.get('error') or d.get('verdict'))"
}

Q1='Can I own a plot of land on the Moon?'
A1='You cannot legally own a plot of land on the Moon.'
Q2='But can I keep the resources I extract there?'
A2='You can keep the resources if your country permits it.'
Q3='Build me the business case for a lunar mining company'

ask "$Q1" "{\"question\":\"$Q1\"}"
ask "$Q2" "{\"question\":\"$Q2\",\"history\":[\"Q: $Q1\",\"A: $A1\"]}"
ask "$Q3" "{\"question\":\"$Q3\",\"history\":[\"Q: $Q1\",\"A: $A1\",\"Q: $Q2\",\"A: $A2\"]}"
