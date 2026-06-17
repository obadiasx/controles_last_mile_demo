import type { IDivergences } from "../interfaces/IDivergences";
import type { IConferenceOrder } from "../interfaces/IConference";

 export const getDivergenceDesc = (order: IConferenceOrder, divergences: IDivergences[]) => {
    if (!order.divergencia_id) return "";
    const divergence = divergences.find((div) => div.id === order.divergencia_id);
    return divergence ? divergence.descricao : "";
  };