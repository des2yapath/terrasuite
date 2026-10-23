import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const Calendar = ({ className, ...props }: CalendarProps) => (
  <DayPicker
    className={cn("p-3", className)}
    classNames={{
      months: "flex flex-col sm:flex-row gap-4",
      month: "space-y-4",
      caption: "flex justify-center pt-1 relative items-center",
      caption_label: "text-sm font-medium",
      nav: "space-x-1 flex items-center",
      button_previous: "absolute left-1 h-7 w-7 rounded-md border border-border bg-transparent p-0 hover:bg-accent",
      button_next: "absolute right-1 h-7 w-7 rounded-md border border-border bg-transparent p-0 hover:bg-accent",
      month_grid: "w-full border-collapse space-y-1",
      weekdays: "flex",
      weekday: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
      week: "flex w-full mt-2",
      day: "h-8 w-8 text-center text-sm p-0 relative",
      day_button: "h-8 w-8 rounded-md p-0 font-normal hover:bg-accent",
      selected: "bg-primary text-primary-foreground hover:bg-primary",
      today: "bg-accent text-accent-foreground",
      outside: "text-muted-foreground opacity-50",
      disabled: "text-muted-foreground opacity-50",
      hidden: "invisible",
    }}
    {...props}
  />
);
Calendar.displayName = "Calendar";

export { Calendar };
