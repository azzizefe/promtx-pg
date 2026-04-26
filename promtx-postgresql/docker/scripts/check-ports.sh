#!/bin/bash

PORTS=(1420 4173 5432 5433 6379 26379 26380 26381 5050 5555 3001 9090 3000 9187)

echo "Checking ports for conflicts..."

CONFLICTS=0

for PORT in "${PORTS[@]}"; do
    if ss -tuln | grep -q ":$PORT "; then
        echo "Conflict detected: Port $PORT is already in use."
        CONFLICTS=$((CONFLICTS+1))
    else
        echo "Port $PORT is available."
    fi
done

if [ $CONFLICTS -gt 0 ]; then
    echo "Error: $CONFLICTS port conflicts found."
    exit 1
else
    echo "All ports are available."
    exit 0
fi
