# backend/routers/investimentos.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from database import engine
from auth import get_current_user
from typing import Optional
from datetime import date

router = APIRouter(prefix="/investimentos", tags=["investimentos"])

class AtivoBody(BaseModel):
    nome: str
    instituicao: str = ""
    tipo: str = "Renda Fixa"

class MovimentacaoBody(BaseModel):
    investimento_id: int
    tipo_movimentacao: str  # 'aporte', 'rendimento', 'saque'
    valor: float
    data_movimento: Optional[date] = None

@router.post("/ativo")
def criar_ativo(body: AtivoBody, user=Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO investimentos (nome, instituicao, tipo, usuario_id)
            VALUES (:nome, :inst, :tipo, :uid)
        """), {"nome": body.nome, "inst": body.instituicao, "tipo": body.tipo, "uid": user["id"]})
    return {"message": "Ativo de investimento criado!"}

@router.post("/movimentacao")
def registrar_movimentacao(body: MovimentacaoBody, user=Depends(get_current_user)):
    if body.valor <= 0:
        raise HTTPException(400, "O valor deve ser maior que zero.")
    if body.tipo_movimentacao not in ["aporte", "rendimento", "saque"]:
        raise HTTPException(400, "Tipo de movimentação inválido.")
        
    data_mov = body.data_movimento or date.today()

    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO investimentos_movimentacoes (investimento_id, tipo_movimentacao, valor, data_movimento, usuario_id)
            VALUES (:inv_id, :tipo, :valor, :data, :uid)
        """), {
            "inv_id": body.investimento_id, "tipo": body.tipo_movimentacao,
            "valor": body.valor, "data": data_mov, "uid": user["id"]
        })
    return {"message": "Movimentação registrada com sucesso!"}

@router.get("/dashboard")
def dashboard_investimentos(user=Depends(get_current_user)):
    uid = user["id"]
    with engine.connect() as conn:
        # Busca todos os ativos
        ativos = conn.execute(text("""
            SELECT id, nome, instituicao, tipo FROM investimentos WHERE usuario_id = :uid ORDER BY nome
        """), {"uid": uid}).fetchall()
        
        # Busca todas as movimentações consolidadas por ativo
        movs = conn.execute(text("""
            SELECT investimento_id, tipo_movimentacao, SUM(valor) as total
            FROM investimentos_movimentacoes
            WHERE usuario_id = :uid
            GROUP BY investimento_id, tipo_movimentacao
        """), {"uid": uid}).fetchall()

        # UPGRADE: Busca todas as movimentações por mês para criar a evolução cronológica acumulada
        rows_mensal = conn.execute(text("""
            SELECT 
                TO_CHAR(data_movimento, 'MM/YYYY') as mes_ano,
                tipo_movimentacao,
                SUM(valor) as total
            FROM investimentos_movimentacoes
            WHERE usuario_id = :uid
            GROUP BY DATE_TRUNC('month', data_movimento), TO_CHAR(data_movimento, 'MM/YYYY'), tipo_movimentacao
            ORDER BY DATE_TRUNC('month', data_movimento)
        """), {"uid": uid}).fetchall()

    # Mapeia as somas das movimentações por ativo
    resumos = {a[0]: {"aporte": 0.0, "rendimento": 0.0, "saque": 0.0} for a in ativos}
    for m in movs:
        inv_id, tipo, total = m[0], m[1], float(m[2])
        if inv_id in resumos:
            resumos[inv_id][tipo] = total

    lista_ativos_detalhada = []
    total_carteira_investido = 0.0
    total_carteira_rendido = 0.0
    total_carteira_saldo = 0.0

    for a in ativos:
        id_ativo, nome, inst, tipo = a[0], a[1], a[2], a[3]
        valores = resumos[id_ativo]
        
        # Saldo Atual = (Aportes + Rendimentos) - Saques
        saldo_atual = (valores["aporte"] + valores["rendimento"]) - valores["saque"]
        lucro_acumulado = valores["rendimento"]
        
        total_carteira_investido += valores["aporte"] - valores["saque"]
        total_carteira_rendido += valores["rendimento"]
        total_carteira_saldo += saldo_atual

        lista_ativos_detalhada.append({
            "id": id_ativo,
            "nome": nome,
            "instituicao": inst,
            "tipo": tipo,
            "total_investido": valores["aporte"] - valores["saque"],
            "total_rendido": lucro_acumulado,
            "saldo_atual": saldo_atual
        })

    # UPGRADE: Calcula a evolução mensal acumulada
    mapa_mensal = {}
    for r in rows_mensal:
        mes_ano, tipo, total = r[0], r[1], float(r[2])
        if mes_ano not in mapa_mensal:
            mapa_mensal[mes_ano] = {"aporte": 0.0, "rendimento": 0.0, "saque": 0.0}
        mapa_mensal[mes_ano][tipo] = total

    meses_ordenados = sorted(mapa_mensal.keys(), key=lambda m: f"{m.split('/')[1]}{m.split('/')[0]}")
    
    evolucao_carteira = []
    acumulado_aplicado = 0.0
    acumulado_rendido = 0.0

    for m in meses_ordenados:
        valores = mapa_mensal[m]
        net_aporte = valores["aporte"] - valores["saque"]
        
        acumulado_aplicado += net_aporte
        acumulado_rendido += valores["rendimento"]
        saldo_atual_mes = acumulado_aplicado + acumulado_rendido

        evolucao_carteira.append({
            "mes_ano": m,
            "Aplicado": round(max(0.0, acumulado_aplicado), 2),
            "Rendimento": round(max(0.0, acumulado_rendido), 2),
            "Saldo": round(max(0.0, saldo_atual_mes), 2)
        })

    return {
        "resumo_geral": {
            "total_investido": total_carteira_investido,
            "total_rendido": total_carteira_rendido,
            "saldo_atual": total_carteira_saldo
        },
        "ativos": lista_ativos_detalhada,
        "evolucao": evolucao_carteira  # Dados para o gráfico de barras empilhadas
    }

@router.delete("/ativo/{id_ativo}")
def deletar_ativo(id_ativo: int, user=Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(text(
            "DELETE FROM investimentos WHERE id=:id AND usuario_id=:uid"
        ), {"id": id_ativo, "uid": user["id"]})
    return {"message": "Ativo de investimento removido."}

# No final do seu arquivo backend/routers/investimentos.py

@router.get("/movimentacoes")
def listar_movimentacoes(user=Depends(get_current_user)):
    uid = user["id"]
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT m.id, m.tipo_movimentacao, m.valor, TO_CHAR(m.data_movimento, 'DD/MM/YYYY') as data_mov, i.nome as ativo_nome, i.instituicao
            FROM investimentos_movimentacoes m
            JOIN investimentos i ON m.investimento_id = i.id
            WHERE m.usuario_id = :uid
            ORDER BY m.data_movimento DESC, m.id DESC
            LIMIT 100
        """), {"uid": uid}).fetchall()
        
    return [{
        "id": r[0],
        "tipo": r[1],
        "valor": float(r[2]),
        "data": r[3],
        "ativo": r[4],
        "instituicao": r[5]
    } for r in rows]

@router.delete("/movimentacao/{id_mov}")
def deletar_movimentacao(id_mov: int, user=Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(text(
            "DELETE FROM investimentos_movimentacoes WHERE id=:id AND usuario_id=:uid"
        ), {"id": id_mov, "uid": user["id"]})
    return {"message": "Movimentação removida."}