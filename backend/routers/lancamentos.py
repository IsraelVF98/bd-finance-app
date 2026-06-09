# backend/routers/lancamentos.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from database import engine
from auth import get_current_user

router = APIRouter(prefix="/lancamentos", tags=["lancamentos"])

class DespesaBody(BaseModel):
    mes_ano: str
    categoria: str
    descricao: str = ""
    valor: float
    quem_pagou: str
    custo_fixo: bool = False  # UPGRADE: Adicionado campo com valor padrão False

class ReceitaBody(BaseModel):
    mes_ano: str
    fonte: str
    valor: float

@router.post("/despesa")
def criar_despesa(body: DespesaBody, user=Depends(get_current_user)):
    if body.valor <= 0:
        raise HTTPException(400, "Valor deve ser maior que zero.")
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO despesas (mes_ano, categoria, descricao, valor, quem_pagou, usuario_id, custo_fixo)
            VALUES (:mes_ano, :cat, :desc, :valor, :quem, :uid, :custo_fixo)
        """), {
            "mes_ano": body.mes_ano, 
            "cat": body.categoria, 
            "desc": body.descricao,
            "valor": body.valor, 
            "quem": body.quem_pagou, 
            "uid": user["id"],
            "custo_fixo": body.custo_fixo  # UPGRADE: Salvando o valor no banco
        })
    return {"message": "Despesa adicionada com sucesso!"}

@router.post("/receita")
def criar_receita(body: ReceitaBody, user=Depends(get_current_user)):
    if body.valor <= 0:
        raise HTTPException(400, "Valor deve ser maior que zero.")
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO receitas (mes_ano, fonte, valor, usuario_id)
            VALUES (:mes_ano, :fonte, :valor, :uid)
        """), {"mes_ano": body.mes_ano, "fonte": body.fonte, "valor": body.valor, "uid": user["id"]})
    return {"message": "Receita adicionada com sucesso!"}

@router.get("/despesas")
def listar_despesas(tipo: str = "avulsas", busca: str = "", user=Depends(get_current_user)):
    uid = user["id"]
    params = {"uid": uid}
    
    # UPGRADE: Ajustando filtros para suportar registros antigos (onde custo_fixo é NULL) e evitar bugs de digitação
    if tipo == "avulsas":
        filtro_tipo = "AND id_parcelamento IS NULL AND (custo_fixo IS NULL OR custo_fixo = FALSE)"
    elif tipo in ("fixos", "fixas"):
        filtro_tipo = "AND id_parcelamento IS NULL AND custo_fixo = TRUE"
    else:  # parceladas
        filtro_tipo = "AND id_parcelamento IS NOT NULL"

    filtro_busca = ""
    if busca:
        filtro_busca = "AND (categoria ILIKE :busca OR descricao ILIKE :busca OR quem_pagou ILIKE :busca)"
        params["busca"] = f"%{busca}%"

    with engine.connect() as conn:
        rows = conn.execute(text(f"""
            SELECT id, mes_ano, categoria, descricao, valor, quem_pagou, custo_fixo
            FROM despesas WHERE usuario_id = :uid {filtro_tipo} {filtro_busca}
            ORDER BY id DESC LIMIT 100
        """), params).fetchall()

    # UPGRADE: Retornando o custo_fixo de forma segura para o frontend
    return [{
        "id": r[0], 
        "mes_ano": r[1], 
        "categoria": r[2],
        "descricao": r[3], 
        "valor": float(r[4]), 
        "quem_pagou": r[5],
        "custo_fixo": bool(r[6]) if r[6] is not None else False
    } for r in rows]

@router.get("/receitas")
def listar_receitas(busca: str = "", user=Depends(get_current_user)):
    uid = user["id"]
    params = {"uid": uid}
    filtro_busca = ""
    if busca:
        filtro_busca = "AND (fonte ILIKE :busca OR descricao ILIKE :busca)"
        params["busca"] = f"%{busca}%"

    with engine.connect() as conn:
        rows = conn.execute(text(f"""
            SELECT id, mes_ano, fonte, descricao, valor
            FROM receitas WHERE usuario_id = :uid {filtro_busca}
            ORDER BY id DESC LIMIT 100
        """), params).fetchall()

    return [{"id": r[0], "mes_ano": r[1], "fonte": r[2],
             "descricao": r[3], "valor": float(r[4])} for r in rows]

@router.delete("/despesa/{id}")
def deletar_despesa(id: int, user=Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(text(
            "DELETE FROM despesas WHERE id=:id AND usuario_id=:uid"
        ), {"id": id, "uid": user["id"]})
    return {"message": "Despesa removida."}

@router.delete("/receita/{id}")
def deletar_receita(id: int, user=Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(text(
            "DELETE FROM receitas WHERE id=:id AND usuario_id=:uid"
        ), {"id": id, "uid": user["id"]})
    return {"message": "Receita removida."}