from unittest.mock import patch


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "AI Study Companion"
    assert data["status"] == "online"


def test_health_endpoint_with_mocked_redis(client):
    with patch("redis.from_url") as mock_redis:
        mock_instance = mock_redis.return_value
        mock_instance.ping.return_value = True

        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["services"]["database"] == "connected"
        assert data["services"]["redis"] == "connected"


def test_health_endpoint_degraded_when_redis_fails(client):
    with patch("redis.from_url") as mock_redis:
        mock_instance = mock_redis.return_value
        mock_instance.ping.side_effect = Exception("Redis connection refused")

        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert "error" in data["services"]["redis"]
