import React, { useState, useRef, useEffect } from "react"
import { X, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export type OptionType = {
  label: string
  value: string
}

interface MultiSelectProps {
  options: OptionType[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  badgeClassName?: string
  disabled?: boolean
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Selecione opções",
  className,
  badgeClassName,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset open state when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item))
  }

  const handleSelect = (item: string) => {
    onChange(selected.includes(item) 
      ? selected.filter((i) => i !== item) 
      : [...selected, item])
  }

  // Find selected option labels
  const selectedLabels = selected.map(
    (value) => options.find((option) => option.value === value)?.label || value
  )

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between text-left font-normal",
              !selected.length && "text-muted-foreground",
              "min-h-10"
            )}
            onClick={() => setOpen(!open)}
            disabled={disabled}
          >
            {selected.length > 0 ? (
              <div className="flex flex-wrap gap-1 py-1">
                {selected.map((item) => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className={cn(
                      "mr-1 mb-1 cursor-pointer px-1.5",
                      badgeClassName
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUnselect(item)
                    }}
                  >
                    {options.find((option) => option.value === item)?.label || item}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command className="w-full">
            <CommandInput placeholder="Pesquisar opção..." />
            <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {options.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      handleSelect(option.value)
                    }}
                    className={cn("flex items-center gap-2", 
                      isSelected ? "bg-accent" : ""
                    )}
                  >
                    <div className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                    )}>
                      {isSelected && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}