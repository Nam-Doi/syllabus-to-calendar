from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from urllib.parse import quote_plus, urlparse, urlencode, parse_qs, urlunparse
from app.core.config import settings
import ssl

def _build_database_url() -> str:
    if settings.DATABASE_URL:
        url = settings.DATABASE_URL
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        # Xóa toàn bộ query string (chứa sslmode)
        if "?" in url:
            url = url.split("?")[0]
        return url
    password = quote_plus(settings.DATABASE_PASSWORD)
    return (
        f"postgresql+asyncpg://{settings.DATABASE_USERNAME}:{password}"
        f"@{settings.DATABASE_HOSTNAME}:{settings.DATABASE_PORT}/{settings.DATABASE_NAME}"
    )

DATABASE_URL = _build_database_url()

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"ssl": ssl_context}
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session