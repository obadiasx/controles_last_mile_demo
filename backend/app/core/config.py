from pathlib import Path
from dotenv import load_dotenv

def load_env():
    load_dotenv(Path(".env"))
