"""Rutas API: Autenticación."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.usuario import Usuario
from app.utils.auth import verify_password, crear_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    nombre: str
    email: str
    rol: str


class UsuarioResponse(BaseModel):
    id: str
    email: str
    nombre: str
    rol: str
    activo: bool


@router.post("/registro", status_code=403, include_in_schema=False)
async def registro():
    raise HTTPException(403, "Registro deshabilitado. Los usuarios se crean directamente en el servidor.")


@router.post("/login", response_model=LoginResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    # Buscar usuario
    result = await db.execute(select(Usuario).where(Usuario.email == form_data.username))
    usuario = result.scalar_one_or_none()

    if not usuario or not verify_password(form_data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )

    if not usuario.activo:
        raise HTTPException(400, "Usuario desactivado")

    token = crear_token({"sub": str(usuario.id)})

    return LoginResponse(
        access_token=token,
        nombre=usuario.nombre,
        email=usuario.email,
        rol=usuario.rol,
    )


@router.get("/me", response_model=UsuarioResponse)
async def me(user: Usuario = Depends(get_current_user)):
    return UsuarioResponse(
        id=str(user.id),
        email=user.email,
        nombre=user.nombre,
        rol=user.rol,
        activo=user.activo,
    )
