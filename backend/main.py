import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import distinct, func
from sqlmodel import SQLModel, Session, select

from database import engine, get_session
from models import Job, JobCreate, JobRead, JobUpdate, User, UserCreate, UserRead

app = FastAPI()

#CHANGE THIS SECRET KEY TO A RANDOM STRING IN PRODUCTION
SECRET_KEY = os.getenv("SECRET_KEY", "development_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "change this to frontend URL in production",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

SessionDep = Annotated[Session, Depends(get_session)]


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def get_user_by_email(email: str, session: Session):
    statement = select(User).where(User.email == email)
    return session.exec(statement).first()

def authenticate_user(email: str, password: str, session: Session):
    user = get_user_by_email(email, session)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: SessionDep,
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_user_by_email(email, session)
    if user is None:
        raise credentials_exception

    return user

@app.post("/register", response_model=UserRead)
def register_user(user: UserCreate, session: SessionDep):
    normalized_email = user.email.strip().lower()

    existing_user = get_user_by_email(normalized_email, session)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = User(
        email=normalized_email,
        hashed_password=get_password_hash(user.password),
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@app.post("/token")
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: SessionDep,
):
    user = authenticate_user(
        form_data.username.strip().lower(),
        form_data.password,
        session,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/jobs", response_model=JobRead)
def create_job(
    job: JobCreate,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    cleaned_data = job.model_dump()
    
    # Normalize fields
    if cleaned_data.get("experience"):
        cleaned_data["experience"] = cleaned_data["experience"].strip().title()
    
    if cleaned_data.get("status"):
        cleaned_data["status"] = cleaned_data["status"].strip().title()
    
    if cleaned_data.get("location"):
        cleaned_data["location"] = cleaned_data["location"].strip().title()
    
    if cleaned_data.get("company"):
        cleaned_data["company"] = cleaned_data["company"].strip().title()

    db_job = Job(**cleaned_data, owner_id=current_user.id)
    session.add(db_job)
    session.commit()
    session.refresh(db_job)
    return db_job