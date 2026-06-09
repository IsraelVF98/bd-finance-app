# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import criar_tabelas
# UPGRADE: Importado o módulo investimentos de dentro da pasta de rotas
from routers import auth, dashboard, lancamentos, parcelamentos, configuracoes, investimentos

app = FastAPI(title="B&D Finance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, substitua pelo URL do seu frontend no Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

criar_tabelas()

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(lancamentos.router)
app.include_router(parcelamentos.router)
app.include_router(configuracoes.router)
# UPGRADE: Ativando as rotas de investimentos no FastAPI
app.include_router(investimentos.router)

@app.get("/")
def root():
    return {"status": "B&D Finance API online"}