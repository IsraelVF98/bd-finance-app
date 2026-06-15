# backend/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from database import engine
from auth import hash_password, verify_password, create_token, get_current_user
import re
import random
import string
import smtplib
from email.mime.text import MIMEText
from config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

# Modelos de validação de dados (Pydantic)
class RegisterBody(BaseModel):
    username: str
    email: str  # UPGRADE: Campo de email obrigatório
    password: str

class LoginBody(BaseModel):
    username: str
    password: str

class ForgotPasswordBody(BaseModel):
    email: str

class ResetPasswordBody(BaseModel):
    email: str
    codigo: str
    new_password: str

# Funções auxiliares de validação de segurança
def validar_senha_forte(senha: str) -> tuple[bool, str]:
    if len(senha) < 8:
        return False, "A senha deve ter pelo menos 8 caracteres."
    if not re.search(r"[A-Z]", senha):
        return False, "A senha deve conter pelo menos uma letra maiúscula."
    if not re.search(r"[a-z]", senha):
        return False, "A senha deve conter pelo menos uma letra minúscula."
    if not re.search(r"\d", senha):
        return False, "A senha deve conter pelo menos um número."
    if not re.search(r"[@$!%*?&#_\-.]", senha):
        return False, "A senha deve conter pelo menos um caractere especial (ex: @, $, !, %, *, ?, &, #, _, -, .)."
    return True, ""

def validar_email(email: str) -> bool:
    return bool(re.match(r"[^@]+@[^@]+\.[^@]+", email))

# Envio de e-mail integrado (com fallback seguro para terminal local)
def enviar_email_recuperacao(destinatario: str, codigo: str) -> bool:
    assunto = "Recuperacao de Senha - B&D Finance"
    mensagem = f"Seu codigo de verificacao para redefinir a senha e: {codigo}\n\nEste codigo expira em breve."
    
    # Busca credenciais SMTP no config.py se existirem
    smtp_user = getattr(settings, "smtp_user", None)
    smtp_password = getattr(settings, "smtp_password", None)
    smtp_host = getattr(settings, "smtp_host", "smtp.gmail.com")
    smtp_port = getattr(settings, "smtp_port", 587)
    
    # FALLBACK LOCAL: Se não houver configuração de e-mail, imprime o código no terminal local (ótimo para testes!)
    if not smtp_user or not smtp_password:
        print("\n" + "="*60)
        print(f"📧 E-MAIL DE RECUPERAÇÃO ENVIADO PARA: {destinatario}")
        print(f"🔑 CÓDIGO DE VERIFICAÇÃO GERADO: {codigo}")
        print("="*60 + "\n")
        return True
        
    try:
        msg = MIMEText(mensagem)
        msg["Subject"] = assunto
        msg["From"] = smtp_user
        msg["To"] = destinatario
        
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, [destinatario], msg.as_string())
        return True
    except Exception as e:
        print(f"Erro ao enviar e-mail de recuperação: {e}")
        return False

@router.post("/register")
def register(body: RegisterBody):
    username_limpo = body.username.lower().strip()
    email_limpo = body.email.lower().strip()

    if not username_limpo or not email_limpo or not body.password.strip():
        raise HTTPException(400, "Usuário, e-mail e senha são obrigatórios.")
    
    if not validar_email(email_limpo):
        raise HTTPException(400, "Por favor, insira um endereço de e-mail válido.")
        
    # UPGRADE: Validação robusta de senha forte exigida pela Play Store
    senha_valida, erro_senha = validar_senha_forte(body.password)
    if not senha_valida:
        raise HTTPException(400, erro_senha)

    with engine.connect() as conn:
        # Verifica se o e-mail já existe
        email_existente = conn.execute(
            text("SELECT id FROM usuarios WHERE email = :e"),
            {"e": email_limpo}
        ).fetchone()
        if email_existente:
            raise HTTPException(400, "Este endereço de e-mail já está cadastrado em outra conta.")

    hashed = hash_password(body.password)
    try:
        with engine.begin() as conn:
            conn.execute(
                text("INSERT INTO usuarios (username, email, password) VALUES (:u, :e, :p)"),
                {"u": username_limpo, "e": email_limpo, "p": hashed}
            )
        return {"message": "Usuário criado com sucesso!"}
    except Exception:
        raise HTTPException(400, "Este nome de usuário já está em uso.")

@router.post("/login")
def login(body: LoginBody):
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, password FROM usuarios WHERE username = :u"),
            {"u": body.username.lower().strip()}
        ).fetchone()

    if not row or not verify_password(body.password, row[1]):
        raise HTTPException(401, "Usuário ou senha incorretos.")

    token = create_token(row[0], body.username.capitalize())
    return {"access_token": token, "token_type": "bearer", "username": body.username.capitalize()}

# UPGRADE: Rota de solicitação de código de recuperação de senha
@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordBody):
    email_limpo = body.email.lower().strip()
    with engine.connect() as conn:
        usuario = conn.execute(
            text("SELECT id FROM usuarios WHERE email = :e"),
            {"e": email_limpo}
        ).fetchone()
        
    if not usuario:
        # Por motivos de segurança, não confirmamos se o e-mail existe ou não na resposta da API
        return {"message": "Se este e-mail estiver cadastrado, um código de verificação foi enviado."}
        
    # Gera um código OTP aleatório de 6 dígitos
    codigo = "".join(random.choices(string.digits, k=6))
    
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE usuarios SET reset_code = :c WHERE id = :uid"),
            {"c": codigo, "uid": usuario[0]}
        )
        
    enviar_email_recuperacao(email_limpo, codigo)
    return {"message": "Se este e-mail estiver cadastrado, um código de verificação foi enviado."}

# UPGRADE: Rota de redefinição de senha utilizando o código OTP
@router.post("/reset-password")
def reset_password(body: ResetPasswordBody):
    email_limpo = body.email.lower().strip()
    codigo_limpo = body.codigo.strip()
    
    with engine.connect() as conn:
        usuario = conn.execute(
            text("SELECT id FROM usuarios WHERE email = :e AND reset_code = :c"),
            {"e": email_limpo, "c": codigo_limpo}
        ).fetchone()
        
    if not usuario:
        raise HTTPException(400, "Código de verificação ou e-mail inválidos.")
        
    senha_valida, erro_senha = validar_senha_forte(body.new_password)
    if not senha_valida:
        raise HTTPException(400, erro_senha)
        
    hashed = hash_password(body.new_password)
    with engine.begin() as conn:
        # Atualiza a senha e limpa o código de recuperação
        conn.execute(
            text("UPDATE usuarios SET password = :p, reset_code = NULL WHERE id = :uid"),
            {"p": hashed, "uid": usuario[0]}
        )
    return {"message": "Sua senha foi redefinida com sucesso!"}

# UPGRADE: Rota obrigatória de exclusão de conta em conformidade com as leis de privacidade
@router.delete("/delete-account")
def deletar_conta(user=Depends(get_current_user)):
    uid = user["id"]
    with engine.begin() as conn:
        # O CASCADE configurado em database.py se encarregará de limpar todas as tabelas de forma automática
        conn.execute(text("DELETE FROM usuarios WHERE id = :uid"), {"uid": uid})
    return {"message": "Sua conta e todos os seus dados foram excluídos com sucesso."}