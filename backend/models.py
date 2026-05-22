from datetime import date
from sqlmodel import SQLModel, Field

class JobBase (SQLModel):
    title: str
    salary: float | None = None
    experience: str | None = None
    required_skills: str | None = None
    company: str
    location: str | None = None
    date_applied: date
    status: str

class Job(JobBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    owner_id: int | None = Field(default=None, foreign_key="user.id")

class UserBase (SQLModel):
    email: str = Field(index=True, unique=True)

class User(UserBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    hashed_password: str

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int

class JobCreate(JobBase):
    pass

class JobRead(JobBase):
    id: int
    owner_id: int

class JobUpdate(SQLModel):
    title: str | None = None
    salary: float | None = None
    experience: str | None = None
    required_skills: str | None = None
    company: str | None = None
    location: str | None = None
    date_applied: date | None = None
    status: str | None = None