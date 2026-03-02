
from fastapi import FastAPI
from . database import get_db, engine
from . import models


models.Base.metadata.create_all(bind=engine)
app = FastAPI()

@app.get("/")
def test():
    return {'message':'hello world!'}