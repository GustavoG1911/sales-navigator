import { format, isToday, isTomorrow } from "date-fns";

export const FOLLOW_UP_STATUS = "Aguardando retorno";

export type FollowUpState = "none" | "upcoming" | "today" | "overdue";

export interface FollowUpParts {
  date: string;
  time: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

export const getDefaultFollowUpParts = (now = new Date()): FollowUpParts => {
  const candidate = new Date(now);
  candidate.setHours(9, 0, 0, 0);
  if (candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return {
    date: `${candidate.getFullYear()}-${pad(candidate.getMonth() + 1)}-${pad(candidate.getDate())}`,
    time: "09:00",
  };
};

export const getFollowUpParts = (followUpAt?: string | null): FollowUpParts => {
  if (!followUpAt) return getDefaultFollowUpParts();
  const date = new Date(followUpAt);
  if (Number.isNaN(date.getTime())) return getDefaultFollowUpParts();

  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
};

export const combineFollowUpDateTime = (date: string, time: string): string | null => {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
};

export const getFollowUpState = (
  followUpAt?: string | null,
  now = new Date(),
): FollowUpState => {
  if (!followUpAt) return "none";
  const date = new Date(followUpAt);
  if (Number.isNaN(date.getTime())) return "none";
  if (date.getTime() < now.getTime()) return "overdue";

  const isSameLocalDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameLocalDay) return "today";
  return "upcoming";
};

export const formatFollowUpLabel = (followUpAt?: string | null): string => {
  if (!followUpAt) return "Agendar retorno";
  const date = new Date(followUpAt);
  if (Number.isNaN(date.getTime())) return "Agendar retorno";
  if (isToday(date)) return `Hoje às ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Amanhã às ${format(date, "HH:mm")}`;
  return format(date, "dd/MM/yyyy 'às' HH:mm");
};
