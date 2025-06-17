import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, ThumbsUp, Star } from "lucide-react";

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rating: number;
  moduleType: string;
}

export function FeedbackDialog({
  isOpen,
  onClose,
  rating,
  moduleType,
}: FeedbackDialogProps) {
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    // Aqui você poderia enviar o feedback para alguma API
    // Por agora, apenas exibimos um toast de agradecimento
    
    if (feedback.trim()) {
      toast({
        title: "Feedback enviado",
        description: "Obrigado por compartilhar sua opinião! Vamos trabalhar para melhorar o sistema.",
      });
    }
    
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  // Determinar a cor do background baseado na avaliação
  const getBgGradient = () => {
    if (rating <= 2) return "from-red-50 to-orange-50 border-orange-200";
    if (rating <= 4) return "from-blue-50 to-indigo-50 border-blue-200";
    return "from-green-50 to-emerald-50 border-green-200";
  };

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
      <DialogContent className={`w-[90%] sm:max-w-[400px] bg-gradient-to-b ${getBgGradient()} border-2 shadow-lg p-4 max-h-[90vh] overflow-y-auto mt-5 sm:mt-5`}>
        <DialogHeader className="space-y-2 sm:space-y-2.5">
          <div className="mx-auto bg-white p-2 sm:p-2.5 rounded-full shadow-md">
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
          </div>
          <DialogTitle className="text-center text-base sm:text-lg font-bold">
            Sua opinião é importante para nós
          </DialogTitle>
          <DialogDescription className="text-center text-sm sm:text-base">
            <div className="flex justify-center mb-1.5 sm:mb-2">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={window.innerWidth < 640 ? 14 : 16} 
                  className={`mx-0.5 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                />
              ))}
            </div>
            <div className="space-y-1">
              <div>
                Você avaliou o
              </div>
              <div className="py-0.5">
                <span className="font-bold">{moduleType.includes("Dashboard de") ? `Módulo ${moduleType}` : `Módulo de ${moduleType}`}</span>
              </div>
              <div>
                com {rating} {rating === 1 ? 'estrela' : 'estrelas'}. Como podemos melhorar sua experiência?
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 sm:py-3">
          <Textarea
            className="min-h-20 sm:min-h-24 text-sm sm:text-base border-2 focus-visible:ring-offset-1 focus-visible:ring-blue-400 text-gray-700"
            placeholder="Compartilhe suas sugestões ou problemas que encontrou..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            autoFocus={false}
            tabIndex={2}
          />
        </div>
        <DialogFooter className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2">
          <Button 
            variant="outline" 
            onClick={handleSkip}
            className="w-full sm:w-auto text-sm sm:text-base h-9 sm:h-9"
            tabIndex={3}
          >
            Pular
          </Button>
          <Button 
            ref={submitButtonRef}
            onClick={handleSubmit} 
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-sm sm:text-base h-9 sm:h-9"
            tabIndex={1}
            autoFocus
          >
            <ThumbsUp className="mr-2 h-4 w-4" /> Enviar feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}