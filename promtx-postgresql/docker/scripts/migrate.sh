#!/bin/bash
set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
trap 'echo -e "${RED}Error occurred! Exiting...${NC}"; exit 1' ERR

echo -e "${GREEN}Running database migrations...${NC}"
bunx prisma migrate deploy
echo -e "${GREEN}Migrations completed successfully.${NC}"
