#!/bin/bash
set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
trap 'echo -e "${RED}Error occurred! Exiting...${NC}"; exit 1' ERR

BACKUP_FILE=$1
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}Usage: $0 <backup_file>${NC}"
    exit 1
fi

echo -e "${GREEN}Restoring database from $BACKUP_FILE...${NC}"
cat $BACKUP_FILE | docker exec -i promtx-postgres psql -U postgres
echo -e "${GREEN}Restore completed successfully.${NC}"
