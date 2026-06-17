export const formatISOToBR = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-");

  return `${day}/${month}/${year}`;
};
