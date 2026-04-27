"""
Proxy para la API de Astra.
Solo las sucursales ALEM (id=7) y CONCEPCION (id=13) tienen acceso.
"""
import httpx
import logging
from fastapi import APIRouter, Depends, HTTPException
from ..core.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/astra", tags=["astra"])

ASTRA_BASE_URL = "https://www.astrapet.com.ar/astra-api/sucursal"

# Mapeo sucursal_id de Mi Sucursal -> API key de Astra
ASTRA_API_KEYS = {
    7: "suc_alem_9fed92ac4b678f3c8e042b78af13df4a",       # ALEM
    13: "suc_conc_385ce0a3d78fea9538be22dff6aa6bae",      # CONCEPCION
}

SUCURSALES_ASTRA = set(ASTRA_API_KEYS.keys())


def get_astra_key(user=Depends(get_current_user)):
    """Obtiene la API key de Astra para la sucursal del usuario."""
    sucursal_id = user.sucursal_id
    if sucursal_id not in SUCURSALES_ASTRA:
        raise HTTPException(status_code=403, detail="Tu sucursal no tiene acceso a Astra")
    return ASTRA_API_KEYS[sucursal_id]


@router.get("/pedidos")
async def listar_pedidos(
    estado: str = "pendiente",
    api_key: str = Depends(get_astra_key),
):
    """Lista pedidos de Astra para la sucursal del usuario."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                f"{ASTRA_BASE_URL}/pedidos",
                params={"estado": estado},
                headers={"X-API-Key": api_key},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Astra API error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail="Error al consultar Astra")
        except Exception as e:
            logger.error(f"Error conectando a Astra: {e}")
            raise HTTPException(status_code=502, detail="No se pudo conectar con Astra")


@router.get("/pedidos/resumen")
async def resumen_pedidos(
    api_key: str = Depends(get_astra_key),
):
    """Resumen de pedidos de Astra (conteos por estado)."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                f"{ASTRA_BASE_URL}/pedidos/resumen",
                headers={"X-API-Key": api_key},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Astra API error: {e.response.status_code}")
            raise HTTPException(status_code=e.response.status_code, detail="Error al consultar Astra")
        except Exception as e:
            logger.error(f"Error conectando a Astra: {e}")
            raise HTTPException(status_code=502, detail="No se pudo conectar con Astra")


@router.get("/pedidos/{pedido_id}")
async def detalle_pedido(
    pedido_id: int,
    api_key: str = Depends(get_astra_key),
):
    """Detalle de un pedido específico de Astra."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                f"{ASTRA_BASE_URL}/pedidos/{pedido_id}",
                headers={"X-API-Key": api_key},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Astra API error: {e.response.status_code}")
            raise HTTPException(status_code=e.response.status_code, detail="Error al consultar Astra")
        except Exception as e:
            logger.error(f"Error conectando a Astra: {e}")
            raise HTTPException(status_code=502, detail="No se pudo conectar con Astra")


@router.put("/pedidos/{pedido_id}/entregado")
async def marcar_entregado(
    pedido_id: int,
    api_key: str = Depends(get_astra_key),
):
    """Marca un pedido de Astra como entregado."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.put(
                f"{ASTRA_BASE_URL}/pedidos/{pedido_id}/entregado",
                headers={"X-API-Key": api_key},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Astra API error: {e.response.status_code}")
            raise HTTPException(status_code=e.response.status_code, detail="Error al consultar Astra")
        except Exception as e:
            logger.error(f"Error conectando a Astra: {e}")
            raise HTTPException(status_code=502, detail="No se pudo conectar con Astra")


@router.get("/pedidos/{pedido_id}/comprobante-pago")
async def comprobante_pago(
    pedido_id: int,
    api_key: str = Depends(get_astra_key),
):
    """Obtiene el comprobante de pago de MercadoPago desde Astra."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                f"{ASTRA_BASE_URL}/pedidos/{pedido_id}/comprobante-pago",
                headers={"X-API-Key": api_key},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Astra API error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail="Error al obtener comprobante")
        except Exception as e:
            logger.error(f"Error conectando a Astra: {e}")
            raise HTTPException(status_code=502, detail="No se pudo conectar con Astra")
