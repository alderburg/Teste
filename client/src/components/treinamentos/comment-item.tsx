import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronsDown, Send, Smile, Paperclip, X, ZoomIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
// Re-adicionando o import depois de instalar a dependência
import EmojiPicker from "emoji-picker-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Tipos
type Reply = {
  id: string;
  commentId: string;
  userName: string;
  text: string;
  createdAt: string;
  isAdmin: boolean;
  imageUrl?: string; // Adicionando campo opcional para URL da imagem
};

type Comment = {
  id: string;
  moduleId: string;
  userName: string;
  text: string;
  createdAt: string;
  type: 'question' | 'feedback' | 'suggestion';
  imageUrl?: string;
  replies: Reply[];
};

interface CommentItemProps {
  comment: Comment;
  onAddReply: (commentId: string, replyText: string, imageUrl?: string) => void;
}

export function CommentItem({ comment, onAddReply }: CommentItemProps) {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState('');

  // Estado para controlar a exibição do selecionador de emoji
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  // Função para lidar com o clique no ícone de emoji
  const handleEmojiClick = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };
  
  // Estado para armazenar a URL de preview da imagem
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Função para lidar com a seleção de um emoji
  const onEmojiClick = (emojiData: any) => {
    setReplyText((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };
  
  // Função para lidar com a seleção de arquivo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Arquivo selecionado:", file.name);
      
      // Criar uma URL de preview para a imagem
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Função para remover a imagem selecionada
  const removeSelectedImage = () => {
    setPreviewUrl(null);
    
    // Resetar o input de arquivo
    const fileInput = document.getElementById(`reply-file-${comment.id}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };
  
  // Função para lidar com cliques fora do selecionador de emoji
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Funções
  const toggleReplies = () => {
    setShowReplies(!showReplies);
  };

  const handleReply = () => {
    setShowReplyForm(!showReplyForm);
    if (!showReplyForm) {
      setReplyText('');
    }
  };

  const submitReply = () => {
    if (replyText.trim()) {
      // Incluir a URL da imagem na resposta, se estiver presente
      onAddReply(comment.id, replyText, previewUrl || undefined);
      setReplyText('');
      setPreviewUrl(null);
      setShowReplyForm(false);
      setShowReplies(true); // Expandir para mostrar todas as respostas, incluindo a nova
    }
  };



  return (
    <div className="bg-gray-50 rounded-lg p-3">
      {/* Modal para visualização ampliada de imagens */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-0">
          <div className="relative">
            <img 
              src={imageModalSrc}
              alt="Imagem ampliada" 
              className="w-full max-h-[80vh] object-contain bg-white rounded-lg"
            />
            <Button 
              variant="secondary" 
              size="icon" 
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 hover:bg-white"
              onClick={() => setImageModalOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Cabeçalho do comentário */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://avatar.vercel.sh/${comment.id}.webp`} alt={comment.userName} />
            <AvatarFallback>{comment.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{comment.userName}</span>
          <Badge variant="outline" className={cn(
            "text-xs",
            comment.type === 'question' && "bg-blue-50 text-blue-700 border-blue-200",
            comment.type === 'feedback' && "bg-green-50 text-green-700 border-green-200",
            comment.type === 'suggestion' && "bg-purple-50 text-purple-700 border-purple-200"
          )}>
            {comment.type === 'question' && "Pergunta"}
            {comment.type === 'feedback' && "Feedback"}
            {comment.type === 'suggestion' && "Sugestão"}
          </Badge>
        </div>
        <span className="text-xs text-gray-500">
          {new Date(comment.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Conteúdo do comentário */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm text-gray-700">{comment.text}</p>

          {/* Imagem do comentário (se existir) */}
          {comment.imageUrl && (
            <div className="mt-2">
              <img 
                src={comment.imageUrl} 
                alt="Imagem anexada" 
                className="max-w-full rounded-md border border-gray-200 max-h-60 object-contain cursor-pointer"
                onClick={() => {
                  setImageModalSrc(comment.imageUrl || '');
                  setImageModalOpen(true);
                }}
              />
            </div>
          )}
        </div>

        {/* Botão de resposta à direita */}
        <Button 
          variant="ghost"
          size="sm"
          className="ml-2 text-xs font-medium text-blue-500 hover:text-blue-600"
          onClick={handleReply}
        >
          Responder
        </Button>
      </div>

      {/* Formulário de resposta embutido */}
      {showReplyForm && (
        <div className="mt-2 pl-6 border-l-2 border-gray-200">
          <div className="flex flex-col gap-2 relative">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Digite sua resposta..."
              className="flex-1 min-h-[80px] p-2 text-sm border border-gray-200 rounded-md"
            />
            
            {/* Preview da imagem */}
            {previewUrl && (
              <div className="relative mt-2 border border-gray-200 rounded-md overflow-hidden">
                <img 
                  src={previewUrl} 
                  alt="Preview da imagem" 
                  className="max-h-48 max-w-full object-contain"
                />
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-70 hover:opacity-100"
                  onClick={removeSelectedImage}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
              </div>
            )}
            
            <div className="flex gap-2 justify-end">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id={`reply-file-${comment.id}`}
                  onChange={handleFileChange}
                />
                <label htmlFor={`reply-file-${comment.id}`} className="cursor-pointer inline-block">
                  <div 
                    className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <Paperclip className="h-4 w-4" />
                  </div>
                </label>
              </div>
              <div 
                className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                onClick={handleEmojiClick}
              >
                <Smile className="h-4 w-4" />
              </div>
              <Button 
                size="icon" 
                onClick={submitReply}
                disabled={!replyText.trim()}
                className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Seletor de emoji */}
            {showEmojiPicker && (
              <div className="absolute z-50 right-14 top-20">
                <div 
                  ref={emojiPickerRef}
                  className="bg-white border border-gray-200 shadow-lg rounded-md overflow-hidden"
                >
                  <EmojiPicker onEmojiClick={onEmojiClick} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão para mostrar/ocultar respostas */}
      {comment.replies && comment.replies.length > 0 && (
        <button 
          onClick={toggleReplies}
          className="flex items-center mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <ChevronsDown className={cn(
            "h-4 w-4 mr-1 transition-transform duration-200",
            showReplies && "transform rotate-180"
          )} />
          {showReplies 
            ? "Ocultar respostas" 
            : `Ver ${comment.replies.length} ${comment.replies.length === 1 ? 'resposta' : 'respostas'}`}
        </button>
      )}

      {/* Exibir respostas quando expandido */}
      {showReplies && comment.replies && (
        <div className="ml-8 mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="bg-white rounded-lg p-2 border border-gray-100">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={`https://avatar.vercel.sh/${reply.id}.webp`} alt={reply.userName} />
                    <AvatarFallback>{reply.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">{reply.userName}</span>
                  {reply.isAdmin && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Admin
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500 ml-auto">
                    {new Date(reply.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{reply.text}</p>
                
                {/* Exibir imagem da resposta (se existir) */}
                {reply.imageUrl && (
                  <div className="mt-2">
                    <img 
                      src={reply.imageUrl} 
                      alt="Imagem anexada" 
                      className="max-w-full rounded-md border border-gray-200 max-h-40 object-contain cursor-pointer"
                      onClick={() => {
                        setImageModalSrc(reply.imageUrl || '');
                        setImageModalOpen(true);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}