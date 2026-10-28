from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Item
from app.schemas import ItemCreate, ItemUpdate


async def get_all_items(db: AsyncSession) -> List[Item]:
    stmt = select(Item).order_by(Item.id.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_item_by_id(db: AsyncSession, item_id: int) -> Optional[Item]:
    stmt = select(Item).where(Item.id == item_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_item(db: AsyncSession, item_in: ItemCreate) -> Item:
    item = Item(
        title=item_in.title,
        description=item_in.description,
        price=item_in.price,
    )
    db.add(item)
    try:
        await db.commit()
        await db.refresh(item)
        return item
    except Exception:
        await db.rollback()
        raise


async def update_item(
    db: AsyncSession,
    item_id: int,
    item_in: ItemUpdate,
) -> Optional[Item]:
    item = await get_item_by_id(db, item_id)
    if not item:
        return None

    if item_in.title is not None:
        item.title = item_in.title
    if item_in.description is not None:
        item.description = item_in.description
    if item_in.price is not None:
        item.price = item_in.price

    try:
        await db.commit()
        await db.refresh(item)
        return item
    except Exception:
        await db.rollback()
        raise


async def delete_item(db: AsyncSession, item_id: int) -> bool:
    item = await get_item_by_id(db, item_id)
    if not item:
        return False

    try:
        await db.delete(item)
        await db.commit()
        return True
    except Exception:
        await db.rollback()
        raise
