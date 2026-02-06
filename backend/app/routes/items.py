from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, text
from typing import List
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.employee import Employee
from ..schemas.ventas_perdidas import ItemSearch

router = APIRouter(prefix="/api/items", tags=["items"])


@router.get("/search", response_model=List[ItemSearch])
async def search_items(
    q: str = Query(..., min_length=2, description="Término de búsqueda"),
    limit: int = Query(20, ge=1, le=50),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Buscar productos en items_central.
    Retorna código, nombre, marca y stock por sucursal.
    """
    search_term = f"%{q.upper()}%"

    # Query a items_central
    query = text("""
        SELECT
            cod_item,
            item,
            marca_nombre,
            stock,
            costo
        FROM items_central
        WHERE
            UPPER(item) LIKE :search
            OR UPPER(cod_item) LIKE :search
            OR UPPER(marca_nombre) LIKE :search
        ORDER BY item
        LIMIT :limit
    """)

    results = db.execute(query, {"search": search_term, "limit": limit}).fetchall()

    items = []
    for row in results:
        # Parsear el JSON de stock si existe
        stock_data = row.stock if row.stock else {}

        # Parsear costo (puede venir como string con formato argentino)
        costo = None
        if row.costo:
            try:
                costo_str = str(row.costo).replace('.', '').replace(',', '.')
                costo = float(costo_str)
            except (ValueError, TypeError):
                try:
                    costo = float(row.costo)
                except (ValueError, TypeError):
                    costo = None

        items.append(ItemSearch(
            cod_item=row.cod_item,
            item=row.item,
            marca_nombre=row.marca_nombre,
            stock=stock_data,
            costo=costo
        ))

    return items


@router.get("/stock/{cod_item}")
async def get_item_stock(
    cod_item: str,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener stock detallado de un producto específico"""
    query = text("""
        SELECT
            cod_item,
            item,
            marca_nombre,
            stock,
            costo,
            habilitado
        FROM items_central
        WHERE cod_item = :cod_item
    """)

    result = db.execute(query, {"cod_item": cod_item}).fetchone()

    if not result:
        return {"error": "Producto no encontrado"}

    return {
        "cod_item": result.cod_item,
        "item": result.item,
        "marca_nombre": result.marca_nombre,
        "stock": result.stock or {},
        "costo": result.costo,
        "habilitado": result.habilitado == "S"
    }
