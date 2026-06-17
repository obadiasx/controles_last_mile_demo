from collections.abc import Callable


def pode_decidir_financeiro(
    role_name: str,
    has_finance_permission: Callable[[], bool],
) -> bool:
    if role_name == "administrador":
        return True
    return bool(has_finance_permission())
