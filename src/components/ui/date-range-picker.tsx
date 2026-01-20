"use client"

import * as React from "react"
import { format, subDays } from "date-fns"
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateRangePickerProps {
  id?: string;
  date: DateRange | undefined;
  onSelect: (date: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  id,
  date,
  onSelect,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                  {format(date.to, "LLL dd, y", { locale: es })}
                </>
              ) : (
                format(date.from, "LLL dd, y", { locale: es })
              )
            ) : (
              <span>Seleccionar fecha</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col space-y-2 p-3">
              <Select
                  onValueChange={(value) => {
                      const now = new Date();
                      let from: Date | undefined;
                      let to: Date | undefined = now;
                      if (value === '7') {
                          from = subDays(now, 6);
                      } else if (value === '30') {
                          from = subDays(now, 29);
                      } else if (value === '90') {
                          from = subDays(now, 89);
                      } else if (value === 'mtd') {
                          from = new Date(now.getFullYear(), now.getMonth(), 1);
                      } else if (value === 'ytd') {
                          from = new Date(now.getFullYear(), 0, 1);
                      } else {
                          from = undefined;
                          to = undefined;
                      }
                      onSelect({ from, to });
                  }}
              >
                  <SelectTrigger>
                      <SelectValue placeholder="Selección rápida" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="custom">Rango personalizado</SelectItem>
                      <SelectItem value="7">Últimos 7 días</SelectItem>
                      <SelectItem value="30">Últimos 30 días</SelectItem>
                      <SelectItem value="90">Últimos 90 días</SelectItem>
                      <SelectItem value="mtd">Este mes</SelectItem>
                      <SelectItem value="ytd">Este año</SelectItem>
                  </SelectContent>
              </Select>
              <div className="rounded-md border">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={onSelect}
                    numberOfMonths={1}
                />
              </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
