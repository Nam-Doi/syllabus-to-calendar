from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from urllib.parse import quote_plus
from app.core.config import settings

def _build_database_url() -> str:
    # Ưu tiên dùng DATABASE_URL trực tiếp (Supabase cấp)
    if settings.DATABASE_URL:
        url = settings.DATABASE_URL
        # Chuyển postgres:// -> postgresql+asyncpg://
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        # Thêm sslmode nếu chưa có
        if "sslmode" not in url:
            url += "?sslmode=require"
        return url
    # Fallback: ghép từ fields riêng lẻ
    password = quote_plus(settings.DATABASE_PASSWORD)
    return (
        f"postgresql+asyncpg://{settings.DATABASE_USERNAME}:{password}"
        f"@{settings.DATABASE_HOSTNAME}:{settings.DATABASE_PORT}/{settings.DATABASE_NAME}"
        f"?ssl=true"
    )

DATABASE_URL = _build_database_url()

engine = create_async_engine(DATABASE_URL, echo=settings.DEBUG)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session