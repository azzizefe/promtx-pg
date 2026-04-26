#!/bin/bash
set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
trap 'echo -e "${RED}Error occurred! Exiting...${NC}"; exit 1' ERR

echo -e "${GREEN}Checking Sentinel status...${NC}"
redis-cli -p 26379 sentinel master promtx-master
