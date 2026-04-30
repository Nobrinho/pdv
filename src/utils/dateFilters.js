import dayjs from "dayjs";

export const buildDateRangeTimestamps = (startDate, endDate) => {
  const startTimestamp = startDate
    ? dayjs(startDate).startOf("day").valueOf()
    : undefined;
  const endTimestamp = endDate
    ? dayjs(endDate).endOf("day").valueOf()
    : undefined;

  return { startTimestamp, endTimestamp };
};

export const getPeriodRange = (type, now = dayjs()) => {
  if (type === "weekly") {
    return {
      startDate: now.startOf("week").format("YYYY-MM-DD"),
      endDate: now.endOf("week").format("YYYY-MM-DD"),
    };
  }
  if (type === "monthly") {
    return {
      startDate: now.startOf("month").format("YYYY-MM-DD"),
      endDate: now.endOf("month").format("YYYY-MM-DD"),
    };
  }
  if (type === "yearly") {
    return {
      startDate: now.startOf("year").format("YYYY-MM-DD"),
      endDate: now.endOf("year").format("YYYY-MM-DD"),
    };
  }
  return null;
};
