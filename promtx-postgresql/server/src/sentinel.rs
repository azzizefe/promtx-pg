use redis::sentinel::Sentinel;

pub async fn connect_sentinel() -> Result<redis::aio::Connection, redis::RedisError> {
    let sentinel = Sentinel::new(vec![
        "redis://127.0.0.1:26379",
        "redis://127.0.0.1:26380",
        "redis://127.0.0.1:26381",
    ]);
    
    let client = sentinel.master_for("promtx-master")?;
    client.get_async_connection().await
}
