#!/bin/bash
set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
trap 'echo -e "${RED}Error occurred! Exiting...${NC}"; exit 1' ERR

echo -e "${GREEN}Connecting to psql...${NC}"
docker exec -it promtx-postgres psql -U postgres
