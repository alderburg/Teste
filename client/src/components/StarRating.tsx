import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FeedbackDialog } from "./FeedbackDialog";
import { FiveStarDialog } from "./FiveStarDialog";

interface StarRatingProps {
  totalStars?: number;
  initialRating?: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  label?: string;
  moduleType?: string; // Tipo do módulo sendo avaliado (Novos, Usados, etc.)
}

export function StarRating({
  totalStars = 5,
  initialRating = 0,
  onRatingChange,
  size = 24,
  label = "",  // Removendo o label padrão
  moduleType = "Produtos" // Valor padrão
}: StarRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showFiveStarDialog, setShowFiveStarDialog] = useState(false);
  const [currentRating, setCurrentRating] = useState(0); // Para guardar a avaliação atual quando o diálogo é aberto
  const { toast } = useToast();

  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    setCurrentRating(newRating);
    
    if (onRatingChange) {
      onRatingChange(newRating);
    }

    // Se a avaliação for 5 estrelas, mostrar o diálogo especial
    if (newRating === 5) {
      setShowFiveStarDialog(true);
    } 
    // Se a avaliação for 4 ou menor, mostrar o diálogo de feedback
    else if (newRating <= 4) {
      setShowFeedbackDialog(true);
    }
  };

  const handleCloseFeedbackDialog = () => {
    setShowFeedbackDialog(false);
    
    // Exibe o toast de confirmação após fechar o diálogo
    toast({
      title: "Nota salva",
      description: `Sua avaliação de ${currentRating} ${currentRating === 1 ? 'estrela' : 'estrelas'} foi registrada. Obrigado!`,
    });
  };
  
  const handleCloseFiveStarDialog = () => {
    setShowFiveStarDialog(false);
    
    // Exibe o toast de confirmação após fechar o diálogo
    toast({
      title: "Nota máxima salva!",
      description: "Obrigado pela avaliação de 5 estrelas! Estamos felizes que você gostou!",
      variant: "default",
    });
  };

  return (
    <div className="flex flex-col items-center">
      {label && <p className="text-sm text-gray-500 mb-1">{label}</p>}
      <div className="flex">
        {[...Array(totalStars)].map((_, index) => {
          const starValue = index + 1;
          return (
            <Star
              key={index}
              size={size}
              className={`
                ${starValue <= (hoverRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                mx-0.5 transition-all duration-150 cursor-pointer
              `}
              onMouseEnter={() => setHoverRating(starValue)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => handleRatingChange(starValue)}
            />
          );
        })}
      </div>
      
      {/* Diálogo de feedback para ratings <= 4 */}
      <FeedbackDialog 
        isOpen={showFeedbackDialog}
        onClose={handleCloseFeedbackDialog}
        rating={currentRating}
        moduleType={moduleType}
      />
      
      {/* Diálogo especial para 5 estrelas */}
      <FiveStarDialog
        isOpen={showFiveStarDialog}
        onClose={handleCloseFiveStarDialog}
        moduleType={moduleType}
      />
    </div>
  );
}