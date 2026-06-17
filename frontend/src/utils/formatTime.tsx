export const formattedTime = (date: Date) => {
  return date.toLocaleTimeString("pt-BR", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });

};
