# backend/database.py
from sqlalchemy import create_engine, text
from config import settings

engine = create_engine(settings.database_url)

def criar_tabelas():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            );
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS despesas (
                id SERIAL PRIMARY KEY,
                id_parcelamento TEXT,
                num_parcela TEXT,
                categoria TEXT,
                descricao TEXT,
                valor REAL,
                quem_pagou TEXT,
                mes_ano TEXT,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
            );
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS receitas (
                id SERIAL PRIMARY KEY,
                fonte TEXT,
                descricao TEXT,
                valor REAL,
                mes_ano TEXT,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
            );
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS categorias (
                id SERIAL PRIMARY KEY,
                nome TEXT,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
            );
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS pessoas (
                id SERIAL PRIMARY KEY,
                nome TEXT,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
            );
        """))
        
        # MIGRATION: Adiciona a coluna custo_fixo se ela não existir
        # Usamos o bloco 'EXCEPTION' do PostgreSQL para ignorar o erro caso a coluna já tenha sido adicionada antes
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name='despesas' AND column_name='custo_fixo'
                ) THEN
                    ALTER TABLE despesas ADD COLUMN custo_fixo BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;
        """))
        # Tabela de Ativos de Investimento
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS investimentos (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                instituicao TEXT, -- ex: XP, Nubank, Inter
                tipo TEXT,        -- ex: Renda Fixa, Ações, FIIs, Cripto
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
            );
        """))
        
        # Tabela de Histórico de Movimentações
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS investimentos_movimentacoes (
                id SERIAL PRIMARY KEY,
                investimento_id INTEGER REFERENCES investimentos(id) ON DELETE CASCADE,
                tipo_movimentacao TEXT NOT NULL, -- 'aporte', 'rendimento', 'saque'
                valor REAL NOT NULL,
                data_movimento DATE NOT NULL DEFAULT CURRENT_DATE,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
            );
        """))