# backend/routers/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy import text
from database import engine
from auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/resumo")
def resumo(filtro_ano: str = None, mes_inicio: str = None, mes_fim: str = None, filtro_pessoa: str = None,
           user=Depends(get_current_user)):
    uid = user["id"]

    with engine.connect() as conn:
        # Receitas
        q_rec = "SELECT COALESCE(SUM(valor),0) FROM receitas WHERE usuario_id = :uid"
        params_rec = {"uid": uid}
        if filtro_ano:
            q_rec += " AND mes_ano LIKE :ano"
            params_rec["ano"] = f"%/{filtro_ano}"
            if mes_inicio and mes_fim:
                q_rec += " AND CAST(SPLIT_PART(mes_ano, '/', 1) AS INTEGER) BETWEEN CAST(:mes_inicio AS INTEGER) AND CAST(:mes_fim AS INTEGER)"
                params_rec["mes_inicio"] = mes_inicio
                params_rec["mes_fim"] = mes_fim
        if filtro_pessoa and filtro_pessoa != "todos":
            q_rec += " AND fonte = :pessoa"
            params_rec["pessoa"] = filtro_pessoa
        rec_total = conn.execute(text(q_rec), params_rec).scalar()

        # Despesas
        q_desp = "SELECT COALESCE(SUM(valor),0) FROM despesas WHERE usuario_id = :uid"
        params_desp = {"uid": uid}
        if filtro_ano:
            q_desp += " AND mes_ano LIKE :ano"
            params_desp["ano"] = f"%/{filtro_ano}"
            if mes_inicio and mes_fim:
                q_desp += " AND CAST(SPLIT_PART(mes_ano, '/', 1) AS INTEGER) BETWEEN CAST(:mes_inicio AS INTEGER) AND CAST(:mes_fim AS INTEGER)"
                params_desp["mes_inicio"] = mes_inicio
                params_desp["mes_fim"] = mes_fim
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
def por_categoria(filtro_ano: str = None, mes_inicio: str = None, mes_fim: str = None, filtro_pessoa: str = None,
                  user=Depends(get_current_user)):
    uid = user["id"]
    params = {"uid": uid}
    filtros = "WHERE usuario_id = :uid"

    if filtro_ano:
        filtros += " AND mes_ano LIKE :ano"
        params["ano"] = f"%/{filtro_ano}"
        if mes_inicio and mes_fim:
            filtros += " AND CAST(SPLIT_PART(mes_ano, '/', 1) AS INTEGER) BETWEEN CAST(:mes_inicio AS INTEGER) AND CAST(:mes_fim AS INTEGER)"
            params["mes_inicio"] = mes_inicio
            params["mes_fim"] = mes_fim
            
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
def avulsas_vs_parceladas(filtro_ano: str = None, mes_inicio: str = None, mes_fim: str = None,
                          user=Depends(get_current_user)):
    uid = user["id"]
    params = {"uid": uid}
    filtros = "WHERE usuario_id = :uid"

    if filtro_ano:
        filtros += " AND mes_ano LIKE :ano"
        params["ano"] = f"%/{filtro_ano}"
        if mes_inicio and mes_fim:
            filtros += " AND CAST(SPLIT_PART(mes_ano, '/', 1) AS INTEGER) BETWEEN CAST(:mes_inicio AS INTEGER) AND CAST(:mes_fim AS INTEGER)"
            params["mes_inicio"] = mes_inicio
            params["mes_fim"] = mes_fim

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
def extrato(filtro_ano: str = None, mes_inicio: str = None, mes_fim: str = None, filtro_pessoa: str = None,
            user=Depends(get_current_user)):
    uid = user["id"]
    params = {"uid": uid}
    filtros = "WHERE usuario_id = :uid"

    if filtro_ano:
        filtros += " AND mes_ano LIKE :ano"
        params["ano"] = f"%/{filtro_ano}"
        if mes_inicio and mes_fim:
            filtros += " AND CAST(SPLIT_PART(mes_ano, '/', 1) AS INTEGER) BETWEEN CAST(:mes_inicio AS INTEGER) AND CAST(:mes_fim AS INTEGER)"
            params["mes_inicio"] = mes_inicio
            params["mes_fim"] = mes_fim
            
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

# UPGRADE: Rota de geração do "Tabelão" consolidado
@router.get("/tabelao")
def tabelao(filtro_ano: str = None, mes_inicio: str = "01", mes_fim: str = "12",
            user=Depends(get_current_user)):
    uid = user["id"]
    if not filtro_ano:
        filtro_ano = str(__import__("datetime").datetime.now().year)
        
    mes_inicio_int = int(mes_inicio or "1")
    mes_fim_int = int(mes_fim or "12")
    
    # Gera a lista de meses dentro do intervalo de filtros selecionados
    meses_selecionados = [f"{str(m).zfill(2)}/{filtro_ano}" for m in range(mes_inicio_int, mes_fim_int + 1)]
    
    with engine.connect() as conn:
        # Busca a lista dinâmica de pessoas/membros registrados nas contas deste usuário
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
            WHERE usuario_id = :uid AND mes_ano LIKE :ano
            GROUP BY mes_ano, fonte
        """
        rows_rec = conn.execute(text(query_rec), {"uid": uid, "ano": f"%/{filtro_ano}"}).fetchall()
        
        # Busca todas as despesas agrupadas por mes_ano e quem pagou
        query_desp = """
            SELECT mes_ano, quem_pagou, SUM(valor) as total 
            FROM despesas 
            WHERE usuario_id = :uid AND mes_ano LIKE :ano
            GROUP BY mes_ano, quem_pagou
        """
        rows_desp = conn.execute(text(query_desp), {"uid": uid, "ano": f"%/{filtro_ano}"}).fetchall()

    # Mapeia em estruturas chave-valor em memória
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