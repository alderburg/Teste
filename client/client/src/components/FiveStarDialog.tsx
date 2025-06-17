import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Star, PartyPopper, Trophy, ThumbsUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface FiveStarDialogProps {
  isOpen: boolean;
  onClose: () => void;
  moduleType: string;
}

export function FiveStarDialog({
  isOpen,
  onClose,
  moduleType,
}: FiveStarDialogProps) {
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();
  
  // Ref para o botão de envio para podermos dar foco a ele
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  
  // Quando o diálogo abrir, damos foco ao botão de envio
  useEffect(() => {
    if (isOpen && submitButtonRef.current) {
      // Pequeno delay para garantir que o diálogo esteja renderizado
      const timer = setTimeout(() => {
        submitButtonRef.current?.focus();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90%] sm:max-w-[400px] bg-gradient-to-b from-yellow-50 to-amber-50 border-2 border-yellow-300 shadow-xl p-4 sm:p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pt-0">
          <div className="mx-auto -mt-1 bg-gradient-to-br from-yellow-400 to-amber-500 p-2 sm:p-2.5 rounded-full shadow-lg mb-2">
            <Trophy className="h-5 w-5 sm:h-5 sm:w-5 text-white" />
          </div>
          <DialogTitle className="text-center text-base sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-amber-600">
            Avaliação Perfeita! 
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-2 sm:py-3 space-y-2 sm:space-y-3">
          <div className="flex items-center justify-center relative">
            {/* Estrelas */}
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={window.innerWidth < 640 ? 20 : 28} 
                  className="fill-yellow-400 text-yellow-400 mx-0.5 sm:mx-1 animate-pulse" 
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            
            {/* Ícones de festa nos cantos */}
            <PartyPopper className="absolute -top-2 sm:-top-2 -left-2 sm:-left-3 h-3 w-3 sm:h-4 sm:w-4 text-amber-500 transform rotate-[-45deg]" />
            <PartyPopper className="absolute -top-2 sm:-top-2 -right-2 sm:-right-3 h-3 w-3 sm:h-4 sm:w-4 text-amber-500 transform rotate-[45deg]" />
          </div>
          
          <div className="text-center space-y-1 sm:space-y-2">
            <h3 className="font-bold text-amber-600 text-base sm:text-lg">Uau, 5 estrelas!</h3>
            <div className="text-xs sm:text-sm text-gray-800 max-w-md space-y-1">
              <div>
                Estamos muito felizes que você está <span className="font-semibold">amando</span> nosso
              </div>
              <div className="py-0.5">
                <span className="font-bold">{moduleType.includes("Dashboard de") ? `Módulo ${moduleType}` : `Módulo de ${moduleType}`}</span>
              </div>
              <div>
                Continuaremos trabalhando para manter essa qualidade!
              </div>
            </div>
          </div>
          
          <div className="w-full px-0 sm:px-2">
            <div className="text-amber-700 font-medium mb-1 text-xs sm:text-sm">Deixe seu Feedback:</div>
            <Textarea
              className="min-h-16 sm:min-h-20 text-xs sm:text-sm border-2 border-amber-200 focus-visible:ring-amber-400 bg-white/80"
              placeholder="Conte-nos o que você mais gostou..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              autoFocus={false}
              tabIndex={2}
            />
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row justify-between sm:justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-2">
          <Button 
            variant="outline"
            onClick={onClose}
            className="w-full text-xs sm:text-sm sm:w-auto border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50 h-8 sm:h-9"
            tabIndex={3}
          >
            Pular
          </Button>
          <Button 
            ref={submitButtonRef}
            onClick={() => {
              if (feedback.trim()) {
                toast({
                  title: "Feedback enviado",
                  description: "Muito obrigado pelo seu feedback positivo!",
                  variant: "default",
                });
              }
              onClose();
            }}
            className="w-full text-xs sm:text-sm sm:w-auto bg-amber-500 hover:bg-amber-600 text-white h-8 sm:h-9"
            tabIndex={1}
            autoFocus
          >
            <ThumbsUp className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" /> Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}