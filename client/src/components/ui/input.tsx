import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  mask?: 'email' | 'number' | 'currency'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, mask, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;

      if (mask === 'email') {
        value = value.toLowerCase();
      } else if (mask === 'number') {
        value = value.replace(/[^\d]/g, '');
      } else if (mask === 'currency') {
        // Remove tudo exceto números e ponto
        value = value.replace(/[^\d.]/g, '');

        // Converte para número e formata como moeda
        const number = parseFloat(value);
        if (!isNaN(number)) {
          value = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(number);
        }
      }

      // Atualiza o valor do input
      e.target.value = value;

      // Chama o onChange original se existir
      if (props.onChange) {
        props.onChange(e);
      }
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }