# B&D Finance — React + FastAPI

## Estrutura
```
bd-finance/
├── backend/    → FastAPI (deploy no Fly.io)
└── frontend/   → React + Tailwind (deploy no Vercel)
```

---

## 🚀 Deploy do Backend (Fly.io)

### 1. Instalar o flyctl
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### 2. Login e deploy
```bash
cd backend
fly auth login
fly launch        # Detecta o Dockerfile automaticamente
                  # Quando perguntar o nome, use: bd-finance-api
                  # Região: GRU (São Paulo)
                  # Não crie banco pelo Fly (já temos o Neon)
```

### 3. Configurar variáveis de ambiente
```bash
fly secrets set DATABASE_URL="postgresql://..." SECRET_KEY="gere-uma-chave-aleatoria-aqui"
```

### 4. Verificar se está online
```
https://bd-finance-api.fly.dev/
```

---

## 🌐 Deploy do Frontend (Vercel)

### 1. No repositório do GitHub, a pasta `frontend/` precisa estar commitada

### 2. Acesse vercel.com → New Project → importe o repositório

### 3. Configure:
- **Framework**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 4. Adicione a variável de ambiente no painel da Vercel:
```
VITE_API_URL = https://bd-finance-api.fly.dev
```

### 5. Deploy — pronto!

---

## 💻 Rodar localmente

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env      # preencha o .env
uvicorn main:app --reload
# Acesse: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # preencha com http://localhost:8000
npm run dev
# Acesse: http://localhost:5173
```

---

## 🔑 Gerar SECRET_KEY segura
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```
