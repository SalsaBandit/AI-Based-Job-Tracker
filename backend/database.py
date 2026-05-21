from sqlmodel import create_engine, Session

#change url in final version
DATABASE_URL = "postgresql://avi@localhost:5432/avi"
engine = create_engine(DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session