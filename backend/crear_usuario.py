import asyncio
import getpass
from app.database import async_session
from app.models.usuario import Usuario
from app.services.auth_service import get_password_hash
from sqlalchemy import select

async def main():
    print("====================================")
    print("   CREACIÓN DE USUARIOS - HARVI    ")
    print("====================================\n")

    nombre = input("▶ Ingresa el nombre del usuario (Ej: Isaac Silva): ")
    email = input("▶ Ingresa el correo de acceso (Ej: admin@panaderia.com): ")
    
    # getpass oculta la contraseña mientras se escribe por terminal
    password = getpass.getpass("▶ Ingresa la contraseña secreta: ")
    
    rol = input("▶ Ingresa el rol [admin / operador] (presiona Enter para 'admin'): ")
    if not rol:
        rol = "admin"

    async with async_session() as db:
        # Verificar si el correo ya existe
        result = await db.execute(select(Usuario).where(Usuario.email == email))
        if result.scalar_one_or_none():
            print(f"\n❌ Error: El correo '{email}' ya existe en la base de datos.")
            return

        # Crear el nuevo usuario
        nuevo_usuario = Usuario(
            nombre=nombre,
            email=email,
            password_hash=get_password_hash(password),
            rol=rol
        )
        
        db.add(nuevo_usuario)
        try:
            await db.commit()
            print(f"\n✅ ¡Éxito! El usuario {nombre} ({rol}) ha sido creado correctamente.")
            print(f"👉 Ahora puedes iniciar sesión con el correo: {email}")
        except Exception as e:
            await db.rollback()
            print(f"\n❌ Ocurrió un error al guardar en la base de datos: {e}")

if __name__ == "__main__":
    asyncio.run(main())
