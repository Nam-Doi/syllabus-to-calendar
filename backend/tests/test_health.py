"""Basic smoke tests — verify the app can be imported and settings load."""


def test_settings_load():
    """Settings should load without raising validation errors."""
    from app.core.config import settings
    assert settings.DATABASE_HOSTNAME is not None
    assert settings.SECRET_KEY is not None


def test_placeholder():
    """Placeholder to ensure pytest collects at least one test."""
    assert True
