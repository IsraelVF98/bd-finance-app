# backend/routers/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy import text
from database import engine
from auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/resumo")
def resumo(filtro_ano: str = None, filtro_mes: str = None, filtro_pessoa: str = None,
           user=Depends(get_current_user)):
    uid = user["id"]

    # Monta filtros dinâmicos
    filtro_mes_ano = None
    if filtro_ano and filtro_mes and filtro_mes != "todos":
        filtro_mes_ano = f"{filtro_mes}/{filtro_ano}"

    with engine.connect() as conn:
        # Receitas
        q_rec = "SELECT COALESCE(SUM(valor),0) FROM receitas WHERE usuario_id = :uid"
        params_rec = {"uid": uid}
        if filtro_mes_ano:
            q_rec += " AND mes_ano = :mes_ano"
            params_rec["mes_ano"] = filtro_mes_ano
        elif filtro_ano:
            q_rec += " AND mes_ano LIKE :ano"
            params_rec["ano"] = f"%/{filtro_ano}"
        if filtro_pessoa and filtro_pessoa != "todos":
            q_rec += " AND fonte = :pessoa"
            params_rec["pessoa"] = filtro_pessoa
        rec_total = conn.execute(text(q_rec), params_rec).scalar()

        # Despesas
        q_desp = "SELECT COALESCE(SUM(valor),0) FROM despesas WHERE usuario_id = :uid"
        params_desp = {"uid": uid}
        if filtro_mes_ano:
            q_desp += " AND mes_ano = :mes_ano"
            params_desp["mes_ano"] = filtro_mes_ano
        elif filtro_ano:
            q_desp += " AND mes_ano LIKE :ano"
            params_desp["ano"] = f"%/{filtro_ano}"
        if filtro_pessoa and filtro_pessoa != "todos":
            q_desp += " AND quem_pagou = :pessoa"
            params_desp["persona"] = filtro_pessoa
        desp_total = conn.execute(text(q_desp), params_desp).scalar()

    return {
        "receitas": float(rec_total),
        "despesas": float(desp_total),
        "saldo": float(rec_total) - float(desp_total)
    }

@router.get("/evolucao-mensal")
def evolucao_mensal(filtro_ano: str = None, user=Depends(get_current_user)):
    uid = user["id"]
    with engine.connect() as conn:
        params = {"uid": uid}
        ano_filtro = f" AND mes_ano LIKE '%/{filtro_ano}'" if filtro_ano else ""

        receitas = conn.execute(text(f"""
            SELECT mes_ano, SUM(valor) as total FROM receitas
            WHERE usuario_id = :uid {ano_filtro}
            GROUP BY mes_ano ORDER BY mes_ano
        """), params).fetchall()

        despesas = conn.execute(text(f"""
            SELECT mes_ano, SUM(valor) as total FROM despesas
            WHERE usuario_id = :uid {ano_filtro}
            GROUP BY mes_ano ORDER BY mes_ano
        """), params).fetchall()

    return {
        "receitas": [{"mes_ano": r[0], "total": float(r[1])} for r in receitas],
        "despesas": [{"mes_ano": d[0], "total": float(d[1])} for d in despesas],
    }

@router.get("/por-categoria")
def por_categoria(filtro_ano: str = None, filtro_mes: str = None, filtro_pessoa: str = None,
                  user=Depends(get_current_user)):
    uid = user["id"]
    params = {"uid": uid}
    filtros = "WHERE usuario_id = :uid"

    if filtro_ano and filtro_mes and filtro_mes != "todos":
        filtros += " AND mes_ano = :mes_ano"
        params["mes_ano"] = f"{filtro_mes}/{filtro_ano}"
    elif filtro_ano:
        filtros += " AND mes_ano LIKE :ano"
        params["ano"] = f"%/{filtro_ano}"
    if filtro_pessoa and filtro_pessoa != "todos":
        filtros += " AND quem_pagou = :pessoa"
        params["pessoa"] = filtro_pessoa

    with engine.connect() as conn:
        rows = conn.execute(text(f"""
            SELECT categoria, SUM(valor) as total FROM despesas
            {filtros} GROUP BY categoria ORDER BY total DESC
        """), params).fetchall()

    return [{"categoria": r[0], "total": float(r[1])} for r in rows]

@router.get("/avulsas-vs-parceladas")
def avulsas_vs_parceladas(filtro_ano: str = None, filtro_mes: str = None,
                          user=Depends(get_current_user)):
    uid = user["id"]
    params = {"uid": uid}
    filtros = "WHERE usuario_id = :uid"

    if filtro_ano and filtro_mes and filtro_mes != "todos":
        filtros += " AND mes_ano = :mes_ano"
        params["mes_ano"] = f"{filtro_mes}/{filtro_ano}"
    elif filtro_ano:
        filtros += " AND mes_ano LIKE :ano"
        params["ano"] = f"%/{filtro_ano}"

    with engine.connect() as conn:
        # Avulsas: Não são parceladas E não são custo fixo
        avulsas = conn.execute(text(f"""
            SELECT COALESCE(SUM(valor),0) FROM despesas
            {filtros} AND id_parcelamento IS NULL AND (custo_fixo IS NULL OR custo_fixo = FALSE)
        """), params).scalar()

        # Parceladas: Possuem um ID de parcelamento atrelado
        parceladas = conn.execute(text(f"""
            SELECT COALESCE(SUM(valor),0) FROM despesas
            {filtros} AND id_parcelamento IS NOT NULL
        """), params).scalar()

        # Custos Fixos: Marcadas explicitamente como custo fixo
        custos_fixos = conn.execute(text(f"""
            SELECT COALESCE(SUM(valor),0) FROM despesas
            {filtros} AND custo_fixo = TRUE
        """), params).scalar()

    return {
        "avulsas": float(avulsas), 
        "parceladas": float(parceladas),
        "custos_fixos": float(custos_fixos)
    }

@router.get("/extrato")
def extrato(filtro_ano: str = None, filtro_mes: str = None, filtro_pessoa: str = None,
            user=Depends(get_current_user)):
    uid = user["id"]
    params = {"uid": uid}
    filtros = "WHERE usuario_id = :uid"

    if filtro_ano and filtro_mes and filtro_mes != "todos":
        filtros += " AND mes_ano = :mes_ano"
        params["mes_ano"] = f"{filtro_mes}/{filtro_ano}"
    elif filtro_ano:
        filtros += " AND mes_ano LIKE :ano"
        params["ano"] = f"%/{filtro_ano}"
    if filtro_pessoa and filtro_pessoa != "todos":
        filtros += " AND quem_pagou = :pessoa"
        params["pessoa"] = filtro_pessoa

    with engine.connect() as conn:
        rows = conn.execute(text(f"""
            SELECT id, mes_ano, categoria, descricao, valor, quem_pagou
            FROM despesas {filtros} ORDER BY id DESC
        """), params).fetchall()

    return [{"id": r[0], "mes_ano": r[1], "categoria": r[2],
             "descricao": r[3], "valor": float(r[4]), "quem_pagou": r[5]} for r in rows]

@router.get("/anos-disponiveis")
def anos_disponiveis(user=Depends(get_current_user)):
    uid = user["id"]
    with engine.connect() as conn:
        desp = conn.execute(text(
            "SELECT DISTINCT SPLIT_PART(mes_ano,'/',2) FROM despesas WHERE usuario_id=:uid AND mes_ano IS NOT NULL"
        ), {"uid": uid}).fetchall()
        rec = conn.execute(text(
            "SELECT DISTINCT SPLIT_PART(mes_ano,'/',2) FROM receitas WHERE usuario_id=:uid AND mes_ano IS NOT NULL"
        ), {"uid": uid}).fetchall()

    anos = sorted(set([r[0] for r in desp] + [r[0] for r in rec]), reverse=True)
    return anos if anos else [str(__import__("datetime").datetime.now().year)]