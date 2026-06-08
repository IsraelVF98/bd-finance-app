# backend/routers/parcelamentos.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from database import engine
from auth import get_current_user
from datetime import datetime
from dateutil.relativedelta import relativedelta

router = APIRouter(prefix="/parcelamentos", tags=["parcelamentos"])

class ParcelamentoBody(BaseModel):
    descricao: str = ""
    categoria: str
    quem_pagou: str
    mes_inicial: str  # "MM/YYYY"
    qtd_parcelas: int
    valor_total: float

@router.post("/")
def criar_parcelamento(body: ParcelamentoBody, user=Depends(get_current_user)):
    if body.valor_total <= 0:
        raise HTTPException(400, "Valor deve ser maior que zero.")
    if body.qtd_parcelas < 2:
        raise HTTPException(400, "Mínimo de 2 parcelas.")

    id_parc = f"PARC_{int(datetime.now().timestamp())}"
    valor_parcela = round(body.valor_total / body.qtd_parcelas, 2)
    data_atual = datetime.strptime(body.mes_inicial, "%m/%Y")

    with engine.begin() as conn:
        for i in range(1, body.qtd_parcelas + 1):
            mes_parc = data_atual.strftime("%m/%Y")
            desc = f"{body.descricao} ({i}/{body.qtd_parcelas})"
            conn.execute(text("""
                INSERT INTO despesas (id_parcelamento, num_parcela, categoria, descricao, valor, quem_pagou, mes_ano, usuario_id)
                VALUES (:id_parc, :num, :cat, :desc, :valor, :quem, :mes, :uid)
            """), {
                "id_parc": id_parc, "num": f"{i}/{body.qtd_parcelas}",
                "cat": body.categoria, "desc": desc, "valor": valor_parcela,
                "quem": body.quem_pagou, "mes": mes_parc, "uid": user["id"]
            })
            data_atual += relativedelta(months=1)

    return {"message": "Parcelamento criado com sucesso!"}

@router.get("/")
def listar_parcelamentos(user=Depends(get_current_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id_parcelamento, categoria, quem_pagou, COUNT(*) as parcelas, SUM(valor) as total
            FROM despesas WHERE id_parcelamento IS NOT NULL AND usuario_id = :uid
            GROUP BY id_parcelamento, categoria, quem_pagou
            ORDER BY id_parcelamento DESC
        """), {"uid": user["id"]}).fetchall()

    return [{"id_contrato": r[0], "categoria": r[1], "responsavel": r[2],
             "parcelas_totais": r[3], "valor_total": float(r[4])} for r in rows]

@router.delete("/{id_parcelamento}")
def deletar_parcelamento(id_parcelamento: str, user=Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(text(
            "DELETE FROM despesas WHERE id_parcelamento=:id AND usuario_id=:uid"
        ), {"id": id_parcelamento, "uid": user["id"]})
    return {"message": "Parcelamento removido."}
