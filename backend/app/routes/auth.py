"""Rutas API: Autenticación."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.usuario import Usuario
from app.utils.auth import hash_password, verify_password, crear_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class RegistroRequest(BaseModel):
    email: str = Field(..., examples=["admin@panaderia.com"])
    password: str = Field(..., min_length=6)
    nombre: str = Field(..., min_length=1, examples=["Administrador"])
    rol: str = Field(default="operador", pattern="^(admin|operador)$")


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


@router.post("/registro", response_model=UsuarioResponse, status_code=201)
async def registro(data: RegistroRequest, db: AsyncSession = Depends(get_db)):
    # Verificar si el email ya existe
    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(400, "El email ya está registrado")

    usuario = Usuario(
        email=data.email,
        password_hash=hash_password(data.password),
        nombre=data.nombre,
        rol=data.rol,
    )
    db.add(usuario)
    await db.flush()

    return UsuarioResponse(
        id=str(usuario.id),
        email=usuario.email,
        nombre=usuario.nombre,
        rol=usuario.rol,
        activo=usuario.activo,
    )


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
