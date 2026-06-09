# backend/routers/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy import text
from database import engine
from auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Função auxiliar para converter "MM/YYYY" em "YYYYMM" ordenável e seguro
def format_to_sortable(data_str: str) -> str:
    if not data_str or "/" not in data_str:
        return "000000"
    partes = data_str.split("/")
    return f"{partes[1]}{partes[0].zfill(2)}"

@router.get("/resumo")
def resumo(data_inicio: str = None, data_fim: str = None, filtro_pessoa: str = None,
           user=Depends(get_current_user)):
    uid = user["id"]
    start_val = format_to_sortable(data_inicio)
    end_val = format_to_sortable(data_fim)

    with engine.connect() as conn:
        # Receitas
        q_rec = "SELECT COALESCE(SUM(valor),0) FROM receitas WHERE usuario_id = :uid"
        params_rec = {"uid": uid}
        if data_inicio and data_fim:
            q_rec += " AND SPLIT_PART(mes_ano, '/', 2) || SPLIT_PART(mes_ano, '/', 1) BETWEEN :start_val AND :end_val"
            params_rec["start_val"] = start_val
            params_rec["end_val"] = end_val
        if filtro_pessoa and filtro_pessoa != "todos":
            q_rec += " AND fonte = :pessoa"
            params_rec["pessoa"] = filtro_pessoa
        rec_total = conn.execute(text(q_rec), params_rec).scalar()

        # Despesas
        q_desp = "SELECT COALESCE(SUM(valor),0) FROM despesas WHERE usuario_id = :uid"
        params_desp = {"uid": uid}
        if data_inicio and data_fim:
            q_desp += " AND SPLIT_PART(mes_ano, '/', 2) || SPLIT_PART(mes_ano, '/', 1) BETWEEN :start_val AND :end_val"
            params_desp["start_val"] = start_val
            params_desp["end_val"] = end_val
        if filtro_pessoa and filtro_pessoa != "todos":
            q_desp += " AND quem_pagou = :pessoa"
            params_desp["pessoa"] = filtro_pessoa
        desp_total = conn.execute(text(q_desp), params_desp).scalar()

    return {
        "receitas": float(rec_total),
        "despesas": float(desp_total),
        "saldo": float(rec_total) - float(desp_total)
    }

@router.get("/evolucao-mensal")
def evolucao_mensal(data_inicio: str = None, data_fim: str = None, user=Depends(get_current_user)):
    uid = user["id"]
    start_val = format_to_sortable(data_inicio)
    end_val = format_to_sortable(data_fim)
    
    with engine.connect() as conn:
        params = {"uid": uid}
        filtro_data = ""
        if data_inicio and data_fim:
            filtro_data = " AND SPLIT_PART(mes_ano, '/', 2) || SPLIT_PART(mes_ano, '/', 1) BETWEEN :start_val AND :end_val"
            params["start_val"] = start_val
            params["end_val"] = end_val

        receitas = conn.execute(text(f"""
            SELECT mes_ano, SUM(valor) as total FROM receitas
            WHERE usuario_id = :uid {filtro_data}
            GROUP BY mes_ano ORDER BY SPLIT_PART(mes_ano, '/', 2) || SPLIT_PART(mes_ano, '/', 1)
        """), params).fetchall()

        despesas = conn.execute(text(f"""
            SELECT mes_ano, SUM(valor) as total FROM despesas
            WHERE usuario_id = :uid {filtro_data}
            GROUP BY mes_ano ORDER BY SPLIT_PART(mes_ano, '/', 2) || SPLIT_PART(mes_ano, '/', 1)
        """), params).fetchall()

    return {
        "receitas": [{"mes_ano": r[0], "total": float(r[1])} for r in receitas],
        "despesas": [{"mes_ano": d[0], "total": float(d[1])} for d in despesas],
    }

@router.get("/por-categoria")
def por_categoria(data_inicio: str = None, data_fim: str = None, filtro_pessoa: str = None,
                  user=Depends(get_current_user)):
    uid = user["id"]
    params = {"uid": uid}
    filtros = "WHERE usuario_id = :uid"

    if data_inicio and data_fim:
        filtros += " AND SPLIT_PART(mes_ano, '/', 2) || SPLIT_PART(mes_ano, '/', 1) BETWEEN :start_val AND :end_val"
        params["start_val"] = format_to_sortable(data_inicio)
        params["end_val"] = format_to_sortable(data_fim)
            
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
def avulsas_vs_parceladas(data_inicio: str = None, data_fim: str = None,
                          user=Depends(get_current_user)):
    uid = user["id"]
    params = {"uid": uid}
    filtros = "WHERE usuario_id = :uid"

    if data_inicio and data_fim:
        filtros += " AND SPLIT_PART(mes_ano, '/', 2) || SPLIT_PART(mes_ano, '/', 1) BETWEEN :start_val AND :end_val"
        params["start_val"] = format_to_sortable(data_inicio)
        params["end_val"] = format_to_sortable(data_fim)

    with engine.connect() as conn:
        avulsas = conn.execute(text(f"""
            SELECT COALESCE(SUM(valor),0) FROM despesas
            {filtros} AND id_parcelamento IS NULL AND (custo_fixo IS NULL OR custo_fixo = FALSE)
        """), params).scalar()

        parceladas = conn.execute(text(f"""
            SELECT COALESCE(SUM(valor),0) FROM despesas
            {filtros} AND id_parcelamento IS NOT NULL
        """), params).scalar()

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
def extrato(data_inicio: str = None, data_fim: str = None, filtro_pessoa: str = None,
            user=Depends(get_current_user)):
    uid = user["id"]
    params = {"uid": uid}
    filtros = "WHERE usuario_id = :uid"

    if data_inicio and data_fim:
        filtros += " AND SPLIT_PART(mes_ano, '/', 2) || SPLIT_PART(mes_ano, '/', 1) BETWEEN :start_val AND :end_val"
        params["start_val"] = format_to_sortable(data_inicio)
        params["end_val"] = format_to_sortable(data_fim)
            
    if filtro_pessoa and filtro_pessoa != "todos":
        filtros += " AND quem_pagou = :pessoa"
        params["pessoa"] = filtro_pessoa

    with engine.connect() as conn:
        rows = conn.execute(text(f"""
            SELECT id, mes_ano, categoria, descricao, valor, quem_pagou
            FROM despesas {filtros} 
            ORDER BY SPLIT_PART(mes_ano, '/', 2) || SPLIT_PART(mes_ano, '/', 1) DESC, id DESC
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

# backend/routers/dashboard.py (Apenas a rota /tabelao no final do arquivo)

@router.get("/tabelao")
def tabelao(data_inicio: str = None, data_fim: str = None,
            user=Depends(get_current_user)):
    uid = user["id"]
    
    if not data_inicio or not data_fim:
        ano_atual = str(__import__("datetime").datetime.now().year)
        data_inicio = f"01/{ano_atual}"
        data_fim = f"12/{ano_atual}"

    start_val = format_to_sortable(data_inicio)
    end_val = format_to_sortable(data_fim)

    # Gera a série de meses com TO_DATE com segurança
    query_meses = """
        SELECT TO_CHAR(m, 'MM/YYYY') 
        FROM generate_series(
            TO_DATE(:data_inicio, 'MM/YYYY'), 
            TO_DATE(:data_fim, 'MM/YYYY'), 
            '1 month'::interval
        ) m
    """
    
    with engine.connect() as conn:
        rows_meses = conn.execute(text(query_meses), {"data_inicio": data_inicio, "data_fim": data_fim}).fetchall()
        meses_selecionados = [r[0] for r in rows_meses]

        # UPGRADE CRÍTICO: Busca as pessoas oficiais cadastradas para esta conta na tabela 'pessoas'
        rows_pessoas = conn.execute(text(
            "SELECT nome FROM pessoas WHERE usuario_id = :uid ORDER BY nome"
        ), {"uid": uid}).fetchall()
        
        pessoas = [r[0] for r in rows_pessoas]
        
        # Fallback de segurança: Caso a tabela 'pessoas' esteja vazia por algum motivo,
        # ela busca as pessoas que possuem lançamentos (como antes)
        if not pessoas:
            p_desp = conn.execute(text(
                "SELECT DISTINCT quem_pagou FROM despesas WHERE usuario_id = :uid AND quem_pagou IS NOT NULL"
            ), {"uid": uid}).fetchall()
            p_rec = conn.execute(text(
                "SELECT DISTINCT fonte FROM receitas WHERE usuario_id = :uid AND fonte IS NOT NULL"
            ), {"uid": uid}).fetchall()
            pessoas = sorted(list(set([r[0] for r in p_desp] + [r[0] for r in p_rec])))

        # Busca todas as receitas agrupadas por mes_ano e pessoa
        query_rec = """
            SELECT mes_ano, fonte, SUM(valor) as total 
            FROM receitas 
            WHERE usuario_id = :uid AND SPLIT_PART(mes_ano, '/', 2) || SPLIT_PART(mes_ano, '/', 1) BETWEEN :start_val AND :end_val
            GROUP BY mes_ano, fonte
        """
        rows_rec = conn.execute(text(query_rec), {"uid": uid, "start_val": start_val, "end_val": end_val}).fetchall()
        
        # Busca todas as despesas agrupadas por mes_ano e quem pagou
        query_desp = """
            SELECT mes_ano, quem_pagou, SUM(valor) as total 
            FROM despesas 
            WHERE usuario_id = :uid AND SPLIT_PART(mes_ano, '/', 2) || SPLIT_PART(mes_ano, '/', 1) BETWEEN :start_val AND :end_val
            GROUP BY mes_ano, quem_pagou
        """
        rows_desp = conn.execute(text(query_desp), {"uid": uid, "start_val": start_val, "end_val": end_val}).fetchall()

    mapa_receitas = {(r[0], r[1]): float(r[2]) for r in rows_rec}
    mapa_despesas = {(d[0], d[1]): float(d[2]) for d in rows_desp}

    linhas = []
    totais_acumulados = {
        "receitas_totais": 0.0,
        "despesas_totais": 0.0,
        "saldo_geral": 0.0,
        "detalhes_pessoas": {p: {"gastos": 0.0, "saldo": 0.0} for p in pessoas}
    }
    
    for mes_ano in meses_selecionados:
        receitas_totais = 0.0
        despesas_totais = 0.0
        
        detalhes_pessoas = {}
        for p in pessoas:
            rec_p = mapa_receitas.get((mes_ano, p), 0.0)
            desp_p = mapa_despesas.get((mes_ano, p), 0.0)
            
            receitas_totais += rec_p
            despesas_totais += desp_p
            saldo_p = rec_p - desp_p
            
            detalhes_pessoas[p] = {
                "gastos": desp_p,
                "saldo": saldo_p
            }
            
            totais_acumulados["detalhes_pessoas"][p]["gastos"] += desp_p
            totais_acumulados["detalhes_pessoas"][p]["saldo"] += saldo_p
            
        saldo_geral = receitas_totais - despesas_totais
        
        linhas.append({
            "mes_ano": mes_ano,
            "receitas_totais": receitas_totais,
            "despesas_totais": despesas_totais,
            "saldo_geral": saldo_geral,
            "detalhes_pessoas": detalhes_pessoas
        })
        
        totais_acumulados["receitas_totais"] += receitas_totais
        totais_acumulados["despesas_totais"] += despesas_totais
        totais_acumulados["saldo_geral"] += saldo_geral

    return {
        "pessoas": pessoas,
        "linhas": linhas,
        "totais_acumulados": totais_acumulados
    }