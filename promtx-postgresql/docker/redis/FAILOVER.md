# Redis Sentinel Failover Testi Prosedürü

1. Mevcut master durumunu kontrol et:
   `redis-cli -p 26379 sentinel master promtx-master`

2. Master container'ı durdur:
   `docker stop promtx-redis-master`

3. Yeni master seçimini izle:
   `docker logs promtx-sentinel-1`

4. Yeni master durumunu doğrula:
   `redis-cli -p 26379 sentinel master promtx-master`
