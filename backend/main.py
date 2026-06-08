# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import criar_tabelas
from routers import auth, dashboard, lancamentos, parcelamentos, configuracoes

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

@app.get("/")
def root():
    return {"status": "B&D Finance API online"}
