import { api } from "@api"

export const fetchUsersFn = async () => {
    try {
        const response = await api.get("/users")
    }
    catch (err) {
        throw new Error(`Erro ai listar usuários: ${err}`)
    }
}