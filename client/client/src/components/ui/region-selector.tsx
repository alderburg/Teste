import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RegionOption = {
  label: string;
  value: string;
};

interface RegionSelectorProps {
  options: RegionOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function RegionSelector({
  options,
  selected,
  onChange,
  placeholder = "Selecione as regiões",
  disabled = false,
  className,
}: RegionSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtra as opções disponíveis com base no termo de pesquisa e nas opções já selecionadas
  const filteredOptions = options.filter(
    (option) =>
      !selected.includes(option.value) &&
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Manipula a seleção de uma região
  const handleSelectRegion = (value: string) => {
    if (value === "TODAS") {
      // Se selecionar "TODAS", removemos todas as outras e selecionamos apenas "TODAS"
      onChange(selected.includes("TODAS") ? [] : ["TODAS"]);
    } else {
      // Verifica se com essa nova seleção todas as regiões (exceto "TODAS") estarão selecionadas
      const allRegions = options
        .filter(option => option.value !== "TODAS")
        .map(option => option.value);
        
      const currentSelected = [...selected.filter(val => val !== "TODAS"), value];
      
      // Se todas as regiões específicas estiverem selecionadas, substituir por "TODAS"
      const allSelected = allRegions.every(region => 
        currentSelected.includes(region) || region === value
      );
      
      if (allSelected) {
        onChange(["TODAS"]);
      } else {
        // Se "TODAS" está selecionado e estamos selecionando uma região específica,
        // removemos "TODAS" e adicionamos apenas a região específica
        const newSelected = selected.includes("TODAS")
          ? [value]
          : currentSelected;
        onChange(newSelected);
      }
    }
    setSearchTerm("");
    setShowOptions(false);
    inputRef.current?.focus();
  };

  // Manipula a remoção de uma região
  const handleRemoveRegion = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  // Fecha o dropdown quando clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Obtém as labels para os valores selecionados
  const getSelectedLabels = () => {
    return selected.map(value => {
      const option = options.find(opt => opt.value === value);
      return option?.label || value;
    });
  };

  return (
    <div className={cn("relative", className)} ref={selectorRef}>
      {/* Campo de pesquisa com tags dentro */}
      <div className="relative">
        <div className="flex items-center px-3 py-2 w-full rounded-md border border-input bg-background text-sm ring-offset-background">
          <div className="flex flex-wrap items-center gap-1 flex-1">
            {selected.length > 0 ? (
              <>
                {selected.map((value) => {
                  const option = options.find((opt) => opt.value === value);
                  return (
                    <Badge
                      key={value}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-0.5 h-6 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      {option?.label || value}
                      <X
                        className="h-3 w-3 cursor-pointer text-blue-600 hover:text-blue-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveRegion(value);
                        }}
                      />
                    </Badge>
                  );
                })}
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-sm min-w-[60px]"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowOptions(true);
                  }}
                  onFocus={() => setShowOptions(true)}
                  disabled={disabled}
                  placeholder={selected.length > 0 ? "" : placeholder}
                />
              </>
            ) : (
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-sm"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowOptions(true);
                }}
                onFocus={() => setShowOptions(true)}
                disabled={disabled}
                placeholder={placeholder}
              />
            )}
          </div>
        </div>
      </div>

      {/* Lista de opções */}
      {showOptions && (
        <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg border">
          <ul className="max-h-60 overflow-auto rounded-md py-1 text-base no-scrollbar">
            <li
              key="todas"
              className="cursor-pointer select-none px-3 py-2 hover:bg-gray-100 font-semibold"
              onClick={() => handleSelectRegion("TODAS")}
            >
              Todas as Regiões
            </li>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <li
                  key={option.value}
                  className="cursor-pointer select-none px-3 py-2 hover:bg-gray-100"
                  onClick={() => handleSelectRegion(option.value)}
                >
                  {option.label}
                </li>
              ))
            ) : (
              <li className="select-none px-3 py-2 text-gray-500">
                Nenhuma opção disponível
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}