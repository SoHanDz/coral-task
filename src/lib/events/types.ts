export interface EventItem {
  id: string;
  title: string;
  eventDate: Date;
  /** Repeats every year on the same month/day (e.g. birthdays, anniversaries). */
  isRecurring: boolean;
}
