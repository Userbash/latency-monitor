import pytest
from server import calculate_packet_loss, calculate_jitter, calculate_p95

def test_calculate_packet_loss():
    assert calculate_packet_loss(100, 90) == pytest.approx(10)
    assert calculate_packet_loss(0, 0) == 0

def test_calculate_jitter():
    pings = [10, 20, 30, 40]
    assert calculate_jitter(pings) == pytest.approx(10)

def test_calculate_p95():
    pings = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]
    assert calculate_p95(pings) == 95
