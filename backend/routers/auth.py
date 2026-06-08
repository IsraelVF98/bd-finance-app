# backend/routers/auth.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from database import engine
from auth import hash_password, verify_password, create_token

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterBody(BaseModel):
    username: str
    password: str

class LoginBody(BaseModel):
    username: str
    password: str

@router.post("/register")
def register(body: RegisterBody):
    if not body.username.strip() or not body.password.strip():
        raise HTTPException(400, "Usuário e senha são obrigatórios.")
    if len(body.password) < 4:
        raise HTTPException(400, "A senha deve ter pelo menos 4 caracteres.")

    hashed = hash_password(body.password)
    try:
        with engine.begin() as conn:
            conn.execute(
                text("INSERT INTO usuarios (username, password) VALUES (:u, :p)"),
                {"u": body.username.lower().strip(), "p": hashed}
            )
        return {"message": "Usuário criado com sucesso!"}
    except Exception:
        raise HTTPException(400, "Este nome de usuário já está em uso.")

@router.post("/login")
def login(body: LoginBody):
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, password FROM usuarios WHERE username = :u"),
            {"u": body.username.lower().strip()}
        ).fetchone()

    if not row or not verify_password(body.password, row[1]):
        raise HTTPException(401, "Usuário ou senha incorretos.")

    token = create_token(row[0], body.username.capitalize())
    return {"access_token": token, "token_type": "bearer", "username": body.username.capitalize()}
