#!/bin/bash
set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
trap 'echo -e "${RED}Error occurred! Exiting...${NC}"; exit 1' ERR

echo -e "${GREEN}Taking database backup...${NC}"
docker exec promtx-postgres pg_dumpall -U postgres > ./docker/postgres/backups/backup_$(date +%F_%T).sql
echo -e "${GREEN}Backup completed successfully.${NC}"
