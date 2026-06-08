# backend/routers/configuracoes.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from database import engine
from auth import get_current_user

router = APIRouter(tags=["configuracoes"])

class NomeBody(BaseModel):
    nome: str

# ---- CATEGORIAS ----
@router.get("/categorias")
def listar_categorias(user=Depends(get_current_user)):
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT nome FROM categorias WHERE usuario_id=:uid ORDER BY nome ASC"
        ), {"uid": user["id"]}).fetchall()
    return [r[0] for r in rows]

@router.post("/categorias")
def adicionar_categoria(body: NomeBody, user=Depends(get_current_user)):
    if not body.nome.strip():
        raise HTTPException(400, "Nome não pode ser vazio.")
    with engine.connect() as conn:
        existe = conn.execute(text(
            "SELECT 1 FROM categorias WHERE nome=:nome AND usuario_id=:uid"
        ), {"nome": body.nome.strip(), "uid": user["id"]}).fetchone()
    if existe:
        raise HTTPException(400, "Categoria já existe.")
    with engine.begin() as conn:
        conn.execute(text(
            "INSERT INTO categorias (nome, usuario_id) VALUES (:nome, :uid)"
        ), {"nome": body.nome.strip(), "uid": user["id"]})
    return {"message": "Categoria adicionada."}

@router.delete("/categorias/{nome}")
def remover_categoria(nome: str, user=Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(text(
            "DELETE FROM categorias WHERE nome=:nome AND usuario_id=:uid"
        ), {"nome": nome, "uid": user["id"]})
    return {"message": "Categoria removida."}

# ---- PESSOAS ----
@router.get("/pessoas")
def listar_pessoas(user=Depends(get_current_user)):
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT nome FROM pessoas WHERE usuario_id=:uid ORDER BY nome ASC"
        ), {"uid": user["id"]}).fetchall()
    return [r[0] for r in rows]

@router.post("/pessoas")
def adicionar_pessoa(body: NomeBody, user=Depends(get_current_user)):
    if not body.nome.strip():
        raise HTTPException(400, "Nome não pode ser vazio.")
    with engine.connect() as conn:
        existe = conn.execute(text(
            "SELECT 1 FROM pessoas WHERE nome=:nome AND usuario_id=:uid"
        ), {"nome": body.nome.strip(), "uid": user["id"]}).fetchone()
    if existe:
        raise HTTPException(400, "Pessoa já existe.")
    with engine.begin() as conn:
        conn.execute(text(
            "INSERT INTO pessoas (nome, usuario_id) VALUES (:nome, :uid)"
        ), {"nome": body.nome.strip(), "uid": user["id"]})
    return {"message": "Pessoa adicionada."}

@router.delete("/pessoas/{nome}")
def remover_pessoa(nome: str, user=Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(text(
            "DELETE FROM pessoas WHERE nome=:nome AND usuario_id=:uid"
        ), {"nome": nome, "uid": user["id"]})
    return {"message": "Pessoa removida."}
