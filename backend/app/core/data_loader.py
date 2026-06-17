import json
from pathlib import Path


def load_role_assignments(file_path: str = "app/core/role_assignments.json") -> list:
    """Carrega as atribuições de permissão de um arquivo JSON."""
    try:
        # Usa pathlib para lidar com caminhos de forma segura
        base_dir = Path(__file__).resolve().parent.parent.parent  # Vai para a raiz do projeto (backend)
        full_path = base_dir / file_path

        if not full_path.exists():
            raise FileNotFoundError(f"Arquivo de atribuições não encontrado em: {full_path}")

        with open(full_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # --- Lógica de inserção da role 'administrador' ---
        for entry in data:
            if "roles" in entry and isinstance(entry["roles"], list):
                if "administrador" not in entry["roles"]:
                    entry["roles"].append("administrador")

        return data

    except Exception as e:
        print(f"❌ ERRO ao carregar o arquivo de atribuições de role: {e}")
        # Retorna uma lista vazia ou levanta exceção, dependendo da sua regra de falha
        return []
