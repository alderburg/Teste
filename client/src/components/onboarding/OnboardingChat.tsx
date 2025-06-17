import React, { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CustomDialog, CustomDialogContent } from "@/components/ui/custom-dialog";
import { useLocation } from 'wouter';
import { MessageSquare, Send, Smile, Volume2, VolumeX, MoreVertical, SkipForward, ArrowRight } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import ReactMarkdown from 'react-markdown';
import person2Image from "@/assets/images/users/webp/person2_new.webp";

// Componente para renderizar markdown com estilo apropriado
const FormattedMessage = ({ children }: { children: string }) => {
  return (
    <div className="whitespace-pre-line">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
};

// Tipos para as mensagens
type MessageType = 'system' | 'user' | 'options' | 'closeButton';

interface Message {
  id: number;
  text: string;
  type: MessageType;
  options?: string[];
  isTyping?: boolean;
  stepIndex?: number; // O índice do passo da conversa correspondente
  isActive?: boolean; // Indica se as opções estão clicáveis ou não
  respondingTo?: number; // Indica a qual passo da conversa esta mensagem está respondendo
  afterUserResponse?: boolean; // Indica se a mensagem deve aparecer após a resposta do usuário
}

interface ConversationStep {
  question: string;
  options: string[];
  key?: string;
  multiSelect?: boolean;
  isEnd?: boolean;
  freeInput?: boolean;
  showNextMessageAutomatically?: boolean;
  nextMessageDelay?: number;
}

interface OnboardingChatProps {
  open: boolean;
  onComplete: (answers: Record<string, string | string[]>) => void;
}

const OnboardingChat: React.FC<OnboardingChatProps> = ({ open, onComplete }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [multipleSelections, setMultipleSelections] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isWaitingForUserInput, setIsWaitingForUserInput] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false); // Inicializamos como fechado e abrimos após check
  
  // Efeito para abrir o diálogo apenas após o carregamento completo da página
  // e APENAS na página de dashboard
  useEffect(() => {
    // Matar todos os sons no unmount
    return () => {
      // Certifique-se de parar todos os sons quando o componente for desmontado
      if (sentSoundRef.current) {
        sentSoundRef.current.pause();
        sentSoundRef.current.currentTime = 0;
      }
      if (receivedSoundRef.current) {
        receivedSoundRef.current.pause();
        receivedSoundRef.current.currentTime = 0;
      }
      console.log("OnboardingChat desmontado: sons parados");
    };
  }, []);
  
  // Efeito para verificar a página atual e estado de abertura
  useEffect(() => {
    // Verificar se estamos na dashboard e se o onboarding deve ser mostrado
    console.log("Verificando se deve mostrar o onboarding...");
    
    // VERIFICAÇÃO CRÍTICA: Verificar se estamos na dashboard
    const isDashboardPage = window.location.pathname === '/dashboard';
    
    // Verificar se há um usuário logado
    const userData = localStorage.getItem('userData');
    const isLoggedIn = !!userData; 
    
    // SEMPRE fechar o diálogo se:
    // 1. Não estamos na dashboard OU
    // 2. Não estamos logados
    if (!isDashboardPage || !isLoggedIn) {
      console.log("Não estamos na dashboard ou não estamos logados, forçando diálogo fechado");
      console.log("isDashboardPage:", isDashboardPage, "isLoggedIn:", isLoggedIn);
      setDialogOpen(false);
      
      // Silenciar todos os sons
      if (sentSoundRef.current) {
        sentSoundRef.current.pause();
        sentSoundRef.current.currentTime = 0;
      }
      if (receivedSoundRef.current) {
        receivedSoundRef.current.pause();
        receivedSoundRef.current.currentTime = 0;
      }
      
      return;
    }
    
    const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
    console.log("onboardingCompleted:", onboardingCompleted);
    
    // Só abrimos se não estiver completo e se o prop open for true e estivermos na dashboard e logados
    if (open && !onboardingCompleted && isDashboardPage && isLoggedIn) {
      console.log("Abrindo diálogo de onboarding");
      setDialogOpen(true);
    } else {
      console.log("Mantendo diálogo fechado");
      setDialogOpen(false);
    }
  }, [open, window.location.pathname]);
  
  // Método de teste para simular o fluxo completo (para debugging)
  const testOnboardingComplete = () => {
    console.log("Iniciando teste de onboarding completo");
    
    // Limpe o localStorage primeiro para garantir que podemos testar novamente
    localStorage.removeItem('onboardingCompleted');
    localStorage.removeItem('onboardingAnswers');
    
    // Limpar mensagens atuais e mostrar as mensagens finais seguidas do botão
    const closeButtonId = Date.now();
    
    // Primeiro, adiciona apenas a primeira mensagem
    setMessages([
      {
        id: closeButtonId - 2,
        text: "✅ Perfeito, já tenho tudo que preciso 🙌 Vou analisar rapidinho e te mostrar o plano ideal...",
        type: "system"
      }
    ]);
    
    // Depois de um delay, adiciona a segunda mensagem e o botão
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: closeButtonId - 1,
          text: "Aguarde um instante, estamos te redirecionando para o seu plano ideal... ⏳",
          type: "system"
        },
        { 
          id: closeButtonId + 1,
          text: "",
          type: "closeButton",
          stepIndex: 9 // última etapa (agora é a 9 com a divisão)
        }
      ]);
    }, 1500);
    
    // Marca como completo no localStorage
    localStorage.setItem('onboardingCompleted', 'true');
    
    // Adiciona um handler para qualquer digitação ou Enter na última etapa
    const handleTestInput = (e: KeyboardEvent) => {
      console.log("Tecla pressionada durante teste, fechando diálogo");
      setDialogOpen(false);
      navigate("/planos-e-upgrades");
      window.removeEventListener('keydown', handleTestInput);
    };
    
    // Adiciona o event listener para qualquer tecla
    window.addEventListener('keydown', handleTestInput);
    
    // Ainda tenta o fechamento automático após 3 segundos como fallback
    setTimeout(() => {
      console.log("Tentando fechamento automático após 3s");
      setDialogOpen(false);
      navigate("/planos-e-upgrades");
      window.removeEventListener('keydown', handleTestInput);
    }, 3000);
    
    // Também chama onComplete como backup
    console.log("Chamando onComplete com dados de teste");
    onComplete({
      businessType: "Comércio",
      revenue: "Até 50 mil",
      businessArea: ["Moda", "Decoração"]
    });
    
    console.log("Aguardando fechamento automático ou clique no botão...");
  };
  const chatEndRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sentSoundRef = useRef<HTMLAudioElement | null>(null);
  const receivedSoundRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [_, navigate] = useLocation();

  // Definindo as etapas da conversa
  const conversationSteps: ConversationStep[] = [
    {
      // Primeira etapa com primeira mensagem apenas
      question: "👋 Olá! Seja bem-vindo(a) ao **Meu Preço Certo** – o sistema que já transformou a precificação de **mais de 20.000 negócios**! Você está a poucos passos de **revolucionar sua estratégia de preços**.",
      options: [], // Sem opções, permitindo digitação livre
      freeInput: true, // Flag para identificar que a primeira etapa aceita qualquer entrada
      showNextMessageAutomatically: true, // Flag para mostrar a próxima mensagem automaticamente
      nextMessageDelay: 2500, // Delay aumentado para 2.5 segundos entre primeira e segunda mensagem
    },
    {
      // Segunda mensagem da introdução
      question: "Nossos usuários **aumentam o lucro em até 40%** após apenas **30 dias** usando nossos planos personalizados. Para garantir que você tenha o mesmo sucesso, precisamos entender seu perfil e criar uma **recomendação exclusiva** para o seu negócio.",
      options: [],
      freeInput: false,
      showNextMessageAutomatically: true,
      nextMessageDelay: 3000, // Delay aumentado para 3 segundos entre segunda e terceira mensagem
    },
    {
      // Terceira mensagem da introdução
      question: "Vamos descobrir qual plano vai transformar seu negócio em apenas **60 segundos**? Responda algumas perguntas rápidas para desbloquear sua **estratégia de preços ideal**! 🚀",
      options: [],
      freeInput: false,
      showNextMessageAutomatically: true,
      nextMessageDelay: 2000, // Delay para a próxima mensagem
    },
    {
      // Quarta mensagem perguntando se podemos começar
      question: "**Podemos começar?**",
      options: ["Sim, vamos lá!"],
      freeInput: true,
    },
    {
      question: "**Como está formalizado o seu negócio hoje?**",
      options: ["Autônomo", "MEI", "Simples Nacional", "Lucro Presumido", "Lucro Real"],
      key: "businessType"
    },
    {
      question: "**E quanto você fatura por mês, em média?**",
      options: ["Até R$ 1.000", "Até R$ 10.000", "Até R$ 50.000", "Acima de R$ 100.000"],
      key: "revenue"
    },
    {
      question: "**Com o que você trabalha atualmente?** (pode selecionar mais de uma opção)",
      options: ["Produtos novos", "Usados", "Serviços", "Aluguéis"],
      key: "businessArea",
      multiSelect: true
    },
    {
      question: "**Vamos confirmar suas respostas:**\n\n[businessType]\n[revenue]\n[businessArea]\n\n**Estas informações estão corretas?**",
      options: ["Sim, estão corretas", "Não, quero refazer"],
      key: "confirmation"
    },
    {
      question: "✅ Perfeito, já tenho tudo que preciso 🙌\nVou analisar rapidinho e te mostrar o **plano ideal**...",
      options: [], // Sem opções para não mostrar o botão Continuar
      showNextMessageAutomatically: true,
      nextMessageDelay: 2000
    },
    {
      question: "Aguarde um instante, estamos te redirecionando para o seu **plano ideal**... ⏳",
      options: [], // Sem opções para não mostrar o botão Continuar
      isEnd: true
    }
  ];

  // Função para simular digitação e adicionar mensagem do sistema
  const addSystemMessage = (text: string, options?: string[]) => {
    setIsTyping(true);

    // Adiciona a mensagem de "digitando..."
    setMessages(prevMessages => [
      ...prevMessages,
      { id: Date.now(), text: "", type: "system" as MessageType, isTyping: true }
    ]);

    // Depois de um delay, remove o "digitando..." e adiciona a mensagem real
    setTimeout(() => {
      setIsTyping(false);
      
      // Toca o som de mensagem recebida
      playReceivedSound();
      
      setMessages(prevMessages => {
        const updatedMessages = prevMessages.filter(m => !m.isTyping);
        
        // Encontra o índice do passo da conversa correspondente a esta mensagem
        const stepIndex = conversationSteps.findIndex(step => step.question === text);
        
        // Processa o texto para substituir placeholders pelas respostas do usuário
        let processedText = text;
        
        // Verifica se estamos na etapa de confirmação (índice 7) 
        if (text.includes('[businessType]') || text.includes('[revenue]') || text.includes('[businessArea]')) {
          // Substitui os placeholders pelos valores reais das respostas
          processedText = processedText.replace('[businessType]', `**Negócio:** ${answers.businessType || 'Não informado'}`);
          processedText = processedText.replace('[revenue]', `**Faturamento:** ${answers.revenue || 'Não informado'}`);
          
          // Tratamento especial para businessArea que pode ser um array
          const businessArea = answers.businessArea;
          let businessAreaText = 'Não informado';
          
          if (businessArea) {
            if (Array.isArray(businessArea)) {
              businessAreaText = businessArea.join(', ');
            } else {
              businessAreaText = businessArea.toString();
            }
          }
          
          processedText = processedText.replace('[businessArea]', `**Áreas de atuação:** ${businessAreaText}`);
        }
        
        // Adiciona a mensagem do sistema
        const newMessages = [
          ...updatedMessages,
          { id: Date.now(), text: processedText, type: "system" as MessageType, stepIndex }
        ];
        
        // Se esta é a segunda parte da mensagem final (a que começa com "Aguarde")
        const isSecondFinalMessage = text.includes("Aguarde um instante");
        
        if (isSecondFinalMessage) {
          console.log("Segunda parte da mensagem final detectada, adicionando botão de continuar");
          // Adiciona o botão após a segunda parte da mensagem final
          newMessages.push({
            id: Date.now() + 1,
            text: "",
            type: "closeButton" as MessageType,
            stepIndex
          });
        }
        // Se há opções, adiciona como uma "mensagem" separada para garantir que apareça na ordem correta
        else if (options && options.length > 0) {
          newMessages.push({
            id: Date.now() + 2,
            text: "", // Texto vazio para as opções
            type: "options" as MessageType, // Marcamos como tipo options
            options,
            stepIndex,
            isActive: true // Marcamos esta opção como ativa (clicável)
          });
        }
        
        return newMessages;
      });
    }, 1500); // Delay de 1.5 segundo para simular digitação
  };

  // Função para tocar o som de mensagem enviada
  const playSentSound = () => {
    // Verifica se o diálogo está aberto antes de reproduzir o som
    if (soundEnabled && sentSoundRef.current && dialogOpen) {
      sentSoundRef.current.currentTime = 0;
      console.log("Tocando som de mensagem enviada");
      sentSoundRef.current.play()
        .then(() => console.log("Som de mensagem enviada tocado com sucesso"))
        .catch(e => console.error("Erro ao tocar som de mensagem enviada:", e));
    } else {
      console.log("Som não reproduzido: dialogOpen =", dialogOpen, "soundEnabled =", soundEnabled);
    }
  };
  
  // Função para tocar o som de mensagem recebida
  const playReceivedSound = () => {
    // Verifica se o diálogo está aberto antes de reproduzir o som
    if (soundEnabled && receivedSoundRef.current && dialogOpen) {
      receivedSoundRef.current.currentTime = 0;
      console.log("Tocando som de mensagem recebida");
      receivedSoundRef.current.play()
        .then(() => console.log("Som de mensagem recebida tocado com sucesso"))
        .catch(e => console.error("Erro ao tocar som de mensagem recebida:", e));
    } else {
      console.log("Som não reproduzido: dialogOpen =", dialogOpen, "soundEnabled =", soundEnabled);
    }
  };
  
  // Função para alternar o som
  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };
  
  // Função para pular o onboarding
  const skipOnboarding = () => {
    console.log("Pulando onboarding...");
    
    // Verificar se o usuário está logado
    const userData = localStorage.getItem('userData');
    if (!userData) {
      console.log("Usuário não está logado, não podemos pular o onboarding");
      // Fechar o diálogo sem salvar nada
      setDialogOpen(false);
      return;
    }
    
    // Salvar onboarding como completo no localStorage
    localStorage.setItem('onboardingCompleted', 'true');
    
    // Salvar dados básicos de onboarding padrão
    const defaultAnswers = {
      businessType: "Não informado",
      revenue: "Não informado",
      businessArea: ["Produtos"]
    };
    localStorage.setItem('onboardingAnswers', JSON.stringify(defaultAnswers));
    
    // Fechar o diálogo
    setDialogOpen(false);
    
    // Chamar onComplete com os dados padrão
    onComplete(defaultAnswers);
    
    // Redirecionar para a página de planos e upgrades
    navigate("/planos-e-upgrades");
  };

  // Função para adicionar mensagem do usuário
  const addUserMessage = (text: string): void => {
    // Adiciona a mensagem do usuário e impede que o usuário responda novamente até receber uma nova mensagem do sistema
    const userMessage: Message = {
      id: Date.now(),
      text: text,
      type: 'user',
      respondingTo: currentStep, // Indica que esta mensagem responde ao passo atual
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsWaitingForUserInput(false); // Impede novas respostas até receber nova mensagem do sistema
    
    // Toca o som de mensagem enviada
    playSentSound();
  };

  // Ref para o botão de confirmar seleções múltiplas
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  
  // Lidar com a escolha do usuário (opção clicada)
  const handleOptionClick = (option: string) => {
    // Limpa o temporizador quando o usuário clica em uma opção
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // IMPORTANTE: Desativa IMEDIATAMENTE as opções assim que o usuário clica
    // isso impede múltiplos cliques no mesmo botão
    setMessages(prevMessages => 
      prevMessages.map(msg => {
        if (msg.type === 'options' && msg.stepIndex === currentStep && msg.isActive) {
          return { ...msg, isActive: false };
        }
        return msg;
      })
    );
    
    // Se for múltipla seleção, trate de forma diferente
    if (conversationSteps[currentStep].multiSelect) {
      let updatedSelections;
      
      if (multipleSelections.includes(option)) {
        // Se já está selecionado, remove
        updatedSelections = multipleSelections.filter(item => item !== option);
      } else {
        // Se não está selecionado, adiciona
        updatedSelections = [...multipleSelections, option];
      }
      
      setMultipleSelections(updatedSelections);
      
      // Se o botão de confirmar deve aparecer (ou seja, se há pelo menos uma seleção)
      // fazemos um setTimeout para dar tempo do React renderizar o botão antes de scrollar
      if (updatedSelections.length > 0) {
        setTimeout(() => {
          // Checa se o botão existe e faz o scroll para ele
          if (confirmButtonRef.current) {
            confirmButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      
      // Reativa as opções para múltipla seleção
      setMessages(prevMessages => 
        prevMessages.map(msg => {
          if (msg.type === 'options' && msg.stepIndex === currentStep) {
            return { ...msg, isActive: true };
          }
          return msg;
        })
      );
      
      return;
    }

    // Desativa as opções atuais para que não sejam mais clicáveis
    // mas MANTÉM elas visíveis (apenas desabilitadas)
    setMessages(prevMessages => 
      prevMessages.map(msg => {
        if (msg.type === 'options' && msg.stepIndex === currentStep && msg.isActive) {
          return { ...msg, isActive: false };
        }
        return msg;
      })
    );

    // Adiciona a resposta do usuário
    addUserMessage(option);
    
    // Armazena a resposta
    if (conversationSteps[currentStep].key) {
      setAnswers(prev => ({ 
        ...prev, 
        [conversationSteps[currentStep].key as string]: option 
      }));
    }

    // Caso especial: etapa de confirmação (índice 7)
    if (currentStep === 7) {
      console.log("Etapa de CONFIRMAÇÃO detectada");
      
      // SOLUÇÃO RADICAL: Desabilita TODOS os botões da página para evitar cliques
      // Usando setTimeout(0) para garantir que execute após a renderização
      setTimeout(() => {
        console.log("Desativando TODOS os botões na tela de confirmação");
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(btn => {
          btn.disabled = true;
          btn.style.opacity = "0.7";
          btn.style.cursor = "auto";
        });
      }, 0);
      
      // Também desativa no estado dos componentes
      setMessages(prevMessages => 
        prevMessages.map(msg => {
          if (msg.type === 'options') {
            return { ...msg, isActive: false };
          }
          return msg;
        })
      );
      
      // Se o usuário selecionou "Não, quero refazer" ou uma resposta negativa
      if (option === "Não, quero refazer") {
        // Limpa as respostas anteriores (importante para mostrar as novas respostas na confirmação)
        setAnswers({});
        
        // Volta para a primeira pergunta de fato (índice 4: "Como está formalizado o seu negócio hoje?")
        setTimeout(() => {
          // Volta para o passo anterior
          setCurrentStep(4);
          
          // Limpa as seleções múltiplas
          setMultipleSelections([]);
          
          // Reativa os botões após retornar à etapa anterior
          setTimeout(() => {
            const allButtons = document.querySelectorAll('button');
            allButtons.forEach(btn => {
              btn.disabled = false;
              btn.style.opacity = "";
              btn.style.cursor = "";
            });
          }, 0);
          
          // Adiciona a mensagem do sistema
          addSystemMessage(
            conversationSteps[4].question,
            conversationSteps[4].options
          );
        }, 1000);
        
        return;
      }
      
      // Se o usuário selecionou "Sim, estão corretas", continuamos para a próxima etapa
      console.log("Confirmando respostas e avançando para etapa final...");
      
      // Avança para o passo 8 (primeira parte da mensagem final)
      // e deixa o fluxo normal do componente lidar com a exibição das mensagens
      setCurrentStep(8);
    }

    // Se for a última etapa (mensagem final)
    if (conversationSteps[currentStep].isEnd) {
      console.log("Etapa final atingida, exibindo mensagem final...");
      
      // Para evitar chamadas duplicadas, verificamos se já completamos
      const onboardingAlreadyCompleted = localStorage.getItem('onboardingCompleted') === 'true';
      
      // Salvar estado imediatamente no localStorage
      localStorage.setItem('onboardingCompleted', 'true');
      
      // SOLUÇÃO DIRETA PARA FECHAMENTO DO POPUP
      console.log("Configurando botão de fechamento imediato...");
      
      // Adicionamos apenas o botão diretamente, sem mensagem de instrução
      const closeButtonId = Date.now();
      
      // Adiciona o botão apenas se não houver já um botão de fechamento
      setMessages(prevMessages => {
        // Verifica se já existe um botão de fechamento
        const hasCloseButton = prevMessages.some(msg => msg.type === 'closeButton');
        
        if (!hasCloseButton) {
          console.log("Adicionando botão de fechamento (não encontrado na conversa)");
          return [
            ...prevMessages,
            { 
              id: closeButtonId + 1,
              text: "",
              type: "closeButton" as MessageType,
              stepIndex: currentStep
            }
          ];
        }
        
        // Se já existe, não adiciona novamente
        console.log("Botão de fechamento já existe, não adicionando outro");
        return prevMessages;
      });
      
      // Adiciona um handler para qualquer digitação ou Enter na última etapa
      const handleFinalStepInput = (e: KeyboardEvent) => {
        // Se o usuário pressionar qualquer tecla na etapa final, fechamos o diálogo
        if (conversationSteps[currentStep].isEnd) {
          console.log("Tecla pressionada na etapa final, fechando diálogo");
          setDialogOpen(false);
          navigate("/planos-e-upgrades");
          // Remove o event listener
          window.removeEventListener('keydown', handleFinalStepInput);
        }
      };
      
      // Adiciona o event listener para qualquer tecla
      window.addEventListener('keydown', handleFinalStepInput);
      
      // Não fechamos automaticamente após um tempo, apenas com interação do usuário
      console.log("Aguardando interação do usuário para fechar o popup");
      
      // Se ainda não foi chamado, chamamos onComplete também como backup
      if (!onboardingAlreadyCompleted) {
        // Chamamos o callback para persistir os dados
        console.log("Chamando onComplete para finalizar o onboarding...");
        onComplete(answers);
      } else {
        console.log("Onboarding já foi completado, evitando chamada duplicada.");
      }
      
      return;
    }

    // Adiciona a próxima mensagem do sistema após um delay (sem mudar o currentStep)
    setTimeout(() => {
      // Avança para o próximo passo
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      addSystemMessage(
        conversationSteps[nextStep].question,
        conversationSteps[nextStep].options
      );
    }, 1000);
  };

  // Função para confirmar múltiplas seleções
  const handleConfirmMultipleSelections = () => {
    if (multipleSelections.length === 0) return;
    
    // Desativa as opções atuais para que não sejam mais clicáveis
    // mas MANTÉM elas visíveis (apenas desabilitadas)
    setMessages(prevMessages => 
      prevMessages.map(msg => {
        if (msg.type === 'options' && msg.stepIndex === currentStep && msg.isActive) {
          return { ...msg, isActive: false };
        }
        return msg;
      })
    );
    
    // Adiciona as seleções como uma mensagem do usuário
    addUserMessage(multipleSelections.join(", "));
    
    // Armazena as respostas e usa o callback para garantir que temos o valor atualizado
    // antes de prosseguir para o próximo passo
    if (conversationSteps[currentStep].key) {
      const key = conversationSteps[currentStep].key as string;
      
      setAnswers(prev => {
        // Cria um novo objeto de respostas com a nova seleção
        const updatedAnswers = { 
          ...prev, 
          [key]: [...multipleSelections] // Usa uma cópia do array para garantir imutabilidade
        };
        
        // Usa setTimeout aqui dentro do callback para garantir que temos o valor atualizado
        setTimeout(() => {
          // Avança para o próximo passo
          const nextStep = currentStep + 1;
          setCurrentStep(nextStep);
          setMultipleSelections([]); // Limpa as seleções
          
          // Adiciona a mensagem de confirmação, mas usando os valores atualizados
          const nextQuestion = conversationSteps[nextStep].question;
          let processedQuestion = nextQuestion;
          
          // Se estamos na etapa de confirmação, substitui os placeholders
          if (nextQuestion.includes('[businessType]') || nextQuestion.includes('[revenue]') || nextQuestion.includes('[businessArea]')) {
            processedQuestion = processedQuestion.replace('[businessType]', `**Negócio:** ${updatedAnswers.businessType || 'Não informado'}`);
            processedQuestion = processedQuestion.replace('[revenue]', `**Faturamento:** ${updatedAnswers.revenue || 'Não informado'}`);
            
            // Tratamento especial para businessArea
            const businessArea = updatedAnswers.businessArea;
            let businessAreaText = 'Não informado';
            
            if (businessArea) {
              if (Array.isArray(businessArea)) {
                businessAreaText = businessArea.join(', ');
              } else {
                businessAreaText = businessArea.toString();
              }
            }
            
            processedQuestion = processedQuestion.replace('[businessArea]', `**Áreas de atuação:** ${businessAreaText}`);
          }
          
          // Adiciona a mensagem do sistema com o texto processado
          addSystemMessage(
            processedQuestion,
            conversationSteps[nextStep].options
          );
        }, 1000);
        
        return updatedAnswers;
      });
    }
  };
  
  // Função para lidar com o envio de mensagem pelo campo de texto
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    // Verifica se estamos na última etapa (isEnd=true)
    // Se estiver, qualquer mensagem digitada fecha o popup
    if (conversationSteps[currentStep].isEnd) {
      console.log("Usuário digitou texto na última etapa, fechando popup");
      setDialogOpen(false);
      navigate("/planos-e-upgrades");
      return;
    }
    
    // Limpa o temporizador quando o usuário envia uma mensagem
    // MAS apenas se não estivermos nas etapas iniciais (0, 1)
    if (timerRef.current && currentStep >= 2) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Guarda a mensagem original para usar depois
    const userMessageText = inputMessage.trim();
    
    // Se estamos nas etapas iniciais (0, 1) - antes da pergunta "Você está pronto?"
    // Apenas mostra a mensagem do usuário sem interromper o fluxo automático
    if (currentStep < 2) {
      // Apenas adiciona a mensagem do usuário e não interrompe o fluxo
      addUserMessage(userMessageText);
      setInputMessage("");
      
      // IMPORTANTE: Não interrompe o fluxo automático de mensagens
      // Portanto, NÃO reaproveita o temporizador que foi cancelado acima
      if (conversationSteps[currentStep]?.showNextMessageAutomatically) {
        const delay = conversationSteps[currentStep].nextMessageDelay || 1000;
        
        // Cria um novo temporizador para continuar o fluxo automático
        timerRef.current = setTimeout(() => {
          // Avança para o próximo passo
          const nextStep = currentStep + 1;
          setCurrentStep(nextStep);
          
          // Adiciona a próxima mensagem do sistema
          addSystemMessage(
            conversationSteps[nextStep].question,
            conversationSteps[nextStep].options
          );
        }, delay);
      }
      
      return;
    }
    
    // Desativa as opções atuais para que não sejam mais clicáveis
    // mas MANTÉM elas visíveis (apenas desabilitadas)
    setMessages(prevMessages => 
      prevMessages.map(msg => {
        if (msg.type === 'options' && msg.stepIndex === currentStep && msg.isActive) {
          return { ...msg, isActive: false };
        }
        return msg;
      })
    );
    
    // Adiciona a mensagem do usuário
    addUserMessage(userMessageText);
    
    // Limpa o campo de entrada
    setInputMessage("");
    
    // Verifica se estamos em uma etapa que aceita qualquer entrada
    if (conversationSteps[currentStep].freeInput) {
      // Adiciona a próxima mensagem do sistema após um delay
      setTimeout(() => {
        // Avança para o próximo passo
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        
        addSystemMessage(
          conversationSteps[nextStep].question,
          conversationSteps[nextStep].options
        );
      }, 1000);
      
      return;
    }
    
    // Caso especial para a etapa "Podemos começar?"
    if (currentStep === 3) {
      // Vai para a próxima etapa independente da resposta
      setTimeout(() => {
        // Avança para o próximo passo
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        
        addSystemMessage(
          conversationSteps[nextStep].question,
          conversationSteps[nextStep].options
        );
      }, 1000);
      
      return;
    }
    
    // Para outras etapas, verifica se a mensagem corresponde a alguma opção
    const userInput = userMessageText.toLowerCase();
    const currentOptions = conversationSteps[currentStep].options || [];
    
    // Função para normalizar texto (remover acentos, pontuações, etc)
    const normalizeText = (text: string): string => {
      return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")  // Remove acentos
        .replace(/[^\w\s]/g, "")          // Remove pontuações
        .toLowerCase()
        .trim();
    };
    
    // Função para extrair números de texto
    const extractNumbers = (text: string): number | null => {
      // Primeiro tenta encontrar padrões como "1 mil", "10 mil", etc.
      const suffixMap: {[key: string]: number} = {
        "mil": 1000,
        "k": 1000,
        "m": 1000000,
        "milhao": 1000000,
        "milhão": 1000000,
        "milhoes": 1000000,
        "milhões": 1000000
      };
      
      // Procura padrões como "X mil", "X k", etc.
      for (const [suffix, multiplier] of Object.entries(suffixMap)) {
        const regex = new RegExp(`(\\d+)[\\s]*${suffix}`, "i");
        const match = text.match(regex);
        if (match && match[1]) {
          return parseInt(match[1]) * multiplier;
        }
      }
      
      // Se não encontrou padrões com sufixos, tenta extrair números diretamente
      // Remove tudo exceto dígitos e pontos/vírgulas que podem ser separadores
      const numericText = text.replace(/[^\d.,]/g, "")
        .replace(/,/g, "."); // Converte vírgulas para pontos
        
      if (numericText) {
        // Remove todos os pontos exceto o último (que seria o decimal)
        const parts = numericText.split(".");
        if (parts.length > 1) {
          const decimal = parts.pop();
          const integer = parts.join("");
          return parseFloat(`${integer}.${decimal}`);
        } else {
          return parseFloat(numericText);
        }
      }
      
      return null;
    };
    
    // Verifica se a entrada do usuário corresponde a um valor monetário
    const getMonetaryMatch = (input: string, options: string[]): string | null => {
      // Verifica se estamos em uma etapa relacionada a valores
      const isMonetaryStep = currentStep === 4; // Etapa de faturamento
      
      if (!isMonetaryStep) return null;
      
      const inputNumber = extractNumbers(input);
      if (inputNumber === null) return null;
      
      // Compara com faixas de valores nas opções
      for (const option of options) {
        // Normaliza e extrai os números da opção
        const optionNormalized = normalizeText(option);
        
        // Verifica se é uma opção de "Até X"
        if (optionNormalized.includes("ate")) {
          const optionNumber = extractNumbers(option);
          if (optionNumber !== null) {
            // Se o valor digitado é menor ou igual ao limite da opção
            if (inputNumber <= optionNumber) {
              return option;
            }
          }
        }
        // Verifica se é uma opção de "Acima de X"
        else if (optionNormalized.includes("acima")) {
          const optionNumber = extractNumbers(option);
          if (optionNumber !== null) {
            // Se o valor digitado é maior que o limite da opção
            if (inputNumber > optionNumber) {
              return option;
            }
          }
        }
      }
      
      return null;
    };
    
    // Função para calcular a semelhança entre duas strings (distância de Levenshtein)
    const levenshteinDistance = (a: string, b: string): number => {
      const matrix = [];
      
      // Incremento para cada linha
      for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
      }
      
      // Incremento para cada coluna
      for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }
      
      // Preenche a matriz
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1, // substituição
              matrix[i][j - 1] + 1,     // inserção
              matrix[i - 1][j] + 1      // remoção
            );
          }
        }
      }
      
      return matrix[b.length][a.length];
    };
    
    // Função para calcular a similaridade entre duas strings (0 a 1)
    const stringSimilarity = (a: string, b: string): number => {
      const longer = a.length > b.length ? a : b;
      const shorter = a.length > b.length ? b : a;
      
      if (longer.length === 0) {
        return 1.0;
      }
      
      const distance = levenshteinDistance(longer, shorter);
      return (longer.length - distance) / longer.length;
    };
    
    // Tenta encontrar a opção mais próxima
    let matchingOption = null;
    let bestSimilarity = 0;
    
    // Caso especial para a tela de confirmação (etapa 7)
    if (currentStep === 7) {
      const normalizedInput = normalizeText(userInput);
      const positiveResponses = ['sim', 'esta sim', 'estao sim', 'sim estao', 'sim esta', 'correto', 'esta correto', 
                               'estao corretas', 'corretas', 'ok', 'esta ok', 'certo', 'confirmo'];
      const negativeResponses = ['nao', 'não', 'esta nao', 'estao nao', 'nao esta', 'nao estao', 'incorreto', 
                              'errado', 'refazer', 'quero refazer', 'voltar', 'quero voltar', 'erradas'];
      
      // Verifica se a entrada do usuário corresponde a uma resposta positiva
      for (const resp of positiveResponses) {
        if (normalizedInput.includes(resp)) {
          matchingOption = "Sim, estão corretas";
          break;
        }
      }
      
      // Verifica se a entrada do usuário corresponde a uma resposta negativa
      if (!matchingOption) {
        for (const resp of negativeResponses) {
          if (normalizedInput.includes(resp)) {
            matchingOption = "Não, quero refazer";
            break;
          }
        }
      }
      
      // Se encontrou uma correspondência, não precisa continuar verificando
      if (matchingOption) {
        // Continua a execução abaixo
      }
      // Caso contrário, segue para as outras verificações
    }
    
    // Se não achou correspondência na etapa de confirmação, segue verificando
    if (!matchingOption) {
      // Primeiro verifica correspondências monetárias
      const monetaryMatch = getMonetaryMatch(userInput, currentOptions);
      
      if (monetaryMatch) {
        matchingOption = monetaryMatch;
      } else {
        // Se não encontrou correspondência monetária, verifica outras correspondências
        const normalizedInput = normalizeText(userInput);
        
        // Verifica cada opção e calcula a similaridade
        for (const option of currentOptions) {
          const normalizedOption = normalizeText(option);
          const similarity = stringSimilarity(normalizedInput, normalizedOption);
          
          // Se a similaridade for maior que um limiar (por exemplo, 0.7 ou 70% de similaridade)
          // E for maior que a melhor similaridade encontrada até agora
          if (similarity > 0.7 && similarity > bestSimilarity) {
            bestSimilarity = similarity;
            matchingOption = option;
          }
        }
      }
    }
    
    if (matchingOption) {
      // Processa como se tivesse clicado na opção
      
      // Armazena a resposta
      if (conversationSteps[currentStep].key) {
        setAnswers(prev => ({ 
          ...prev, 
          [conversationSteps[currentStep].key as string]: matchingOption 
        }));
      }
    
      // Se for a última etapa
      if (conversationSteps[currentStep].isEnd) {
        setTimeout(() => {
          onComplete(answers);
        }, 2000);
        return;
      }
    
      // Adiciona a próxima mensagem do sistema após um delay
      setTimeout(() => {
        // Avança para o próximo passo
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        
        addSystemMessage(
          conversationSteps[nextStep].question,
          conversationSteps[nextStep].options
        );
      }, 1000);
    } else {
      // Se não encontrou correspondência, adiciona uma mensagem de erro
      
      // Mostramos o indicador de digitação antes da mensagem de erro
      setIsTyping(true);

      // Adicionamos indicador de digitação
      setMessages(prevMessages => [
        ...prevMessages,
        { 
          id: Date.now(), 
          text: "", 
          type: "system" as MessageType, 
          isTyping: true,
          stepIndex: currentStep
        }
      ]);
      
      // Após um delay, removemos o indicador e mostramos a mensagem de erro
      setTimeout(() => {
        setIsTyping(false);
        
        // Limpa as seleções múltiplas se estiver na etapa de múltipla escolha
        if (conversationSteps[currentStep].multiSelect) {
          setMultipleSelections([]);
        }
        
        // Removemos o indicador de digitação
        setMessages(prevMessages => 
          prevMessages.filter(msg => !msg.isTyping)
        );
        
        // Adicionamos o som de mensagem recebida
        playReceivedSound();
        
        // Conjunto de mensagens de erro + repetição da pergunta + opções
        const errorId = Date.now();
        
        // Criamos um grupo de mensagens que incluem o erro e as opções
        const errorGroup = [
          // Mensagem de erro
          {
            id: errorId,
            text: "Desculpe, não consegui identificar sua resposta. Por favor, escolha uma das opções abaixo:",
            type: 'system' as MessageType,
            stepIndex: currentStep,
            afterUserResponse: true,
          },
          // Pergunta original (opcional se quiser repetir a pergunta original)
          {
            id: errorId + 1,
            text: "",
            type: "options" as MessageType,
            options: conversationSteps[currentStep].options,
            stepIndex: currentStep,
            isActive: true
          }
        ];
        
        // Adicionamos todo o grupo de uma vez para garantir que fiquem juntos
        setMessages(prevMessages => [...prevMessages, ...errorGroup]);
        
        // Re-habilita a entrada de texto
        setIsWaitingForUserInput(true);
      }, 1500);
    }
  };
  
  // Efeito para lidar com mensagens automáticas
  useEffect(() => {
    // Limpeza de qualquer temporizador existente
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Se não houver etapa atual (antes de iniciar), não faz nada
    if (currentStep < 0 || !conversationSteps[currentStep]) return;
    
    // Lida com o avanco automático para mensagens iniciais
    if (conversationSteps[currentStep]?.showNextMessageAutomatically) {
      const delay = conversationSteps[currentStep].nextMessageDelay || 1000;
      
      timerRef.current = setTimeout(() => {
        // Avança para o próximo passo
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        
        // Adiciona a próxima mensagem do sistema
        addSystemMessage(
          conversationSteps[nextStep].question,
          conversationSteps[nextStep].options
        );
      }, delay);
      
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [currentStep]);

  // Inicia a conversa quando o componente carrega
  useEffect(() => {
    console.log("Efeito de iniciar conversa acionado. Open:", open, "dialogOpen:", dialogOpen, "messages.length:", messages.length);
    if (open && messages.length === 0) {
      setTimeout(() => {
        console.log("Iniciando a conversa após delay de 500ms");
        addSystemMessage(
          conversationSteps[0].question,
          conversationSteps[0].options
        );
      }, 500);
    }
  }, [open, dialogOpen]); // Adicionado dialogOpen como dependência para reiniciar quando mudar

  // Scroll para o fim da conversa quando novas mensagens são adicionadas
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  // Limpa o temporizador quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Atualizamos o estado dialogOpen quando a prop open muda
  useEffect(() => {
    console.log("Prop open mudou para:", open);
    
    // Verificamos novamente se o usuário está logado antes de abrir o diálogo
    const userData = localStorage.getItem('userData');
    const isLoggedIn = !!userData;
    const isDashboardPage = window.location.pathname === '/dashboard';
    
    // Só atualizamos para open se estamos na dashboard e logados
    if (open && isDashboardPage && isLoggedIn) {
      setDialogOpen(true);
    } else {
      setDialogOpen(false);
    }
  }, [open]);
  
  // Inicializa os elementos de áudio quando o componente é montado
  useEffect(() => {
    console.log("Inicializando elementos de áudio...");
    
    if (!sentSoundRef.current) {
      console.log("Referência de áudio de mensagem enviada nula, criando elemento...");
      const sentAudio = new Audio('/sounds/message-sent.mp3');
      sentAudio.preload = 'auto';
      sentSoundRef.current = sentAudio;
    }
    
    if (!receivedSoundRef.current) {
      console.log("Referência de áudio de mensagem recebida nula, criando elemento...");
      const receivedAudio = new Audio('/sounds/message-received.mp3');
      receivedAudio.preload = 'auto';
      receivedSoundRef.current = receivedAudio;
    }
    
    // Verifica se os áudios estão funcionando e pode ser tocados apenas se o diálogo estiver aberto
    const testAudio = () => {
      // Só testa o áudio se o diálogo estiver aberto
      if (sentSoundRef.current && dialogOpen) {
        console.log("Testando áudio com dialogOpen =", dialogOpen);
        sentSoundRef.current.play()
          .then(() => {
            sentSoundRef.current?.pause();
            sentSoundRef.current!.currentTime = 0;
            console.log("Teste de áudio de mensagem enviada realizado com sucesso");
          })
          .catch(e => console.error("Erro no teste de áudio de mensagem enviada:", e));
      } else {
        console.log("Teste de áudio ignorado porque dialogOpen =", dialogOpen);
      }
    };
    
    // Testa o áudio uma vez após 2 segundos (para evitar bloqueios do navegador)
    const audioTestTimeout = setTimeout(testAudio, 2000);
    
    return () => {
      clearTimeout(audioTestTimeout);
    };
  }, [dialogOpen]); // Adicionado dialogOpen como dependência
  
  // Função que controla o fechamento do diálogo
  const handleOpenChange = (isOpen: boolean) => {
    // Permitir o fechamento sempre
    if (!isOpen) {
      // Se o onboarding foi completado, redirecione para a página de planos e upgrades
      if (localStorage.getItem('onboardingCompleted') === 'true') {
        navigate("/planos-e-upgrades");
      }
      return true;
    }
  };

  // Registramos no unmount para garantir que os sons são parados
  useEffect(() => {
    // Quando o componente é desmontado, garantimos que os sons estão parados
    return () => {
      if (sentSoundRef.current) {
        sentSoundRef.current.pause();
        sentSoundRef.current.currentTime = 0;
      }
      if (receivedSoundRef.current) {
        receivedSoundRef.current.pause();
        receivedSoundRef.current.currentTime = 0;
      }
    };
  }, []);
  
  // Debug mínimo apenas quando estamos na dashboard
  const isDashboardPage = window.location.pathname === '/dashboard';
  if (isDashboardPage) {
    console.log("Renderizando OnboardingChat na dashboard, dialogOpen:", dialogOpen);
  }

  return (
    <CustomDialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <CustomDialogContent className="sm:max-w-md p-0 overflow-hidden sm:max-h-[80vh] sm:h-[600px] h-[100dvh] flex flex-col shadow-xl sm:rounded-2xl fixed-height" style={{overflow: 'hidden'}}>
        <DialogTitle className="sr-only">Chat de Onboarding</DialogTitle>
        <DialogDescription className="sr-only">
          Chat para configuração inicial do seu perfil no sistema
        </DialogDescription>
        
        {/* Elementos de áudio para os sons de mensagens */}
        <audio
          ref={sentSoundRef}
          src="/sounds/message-sent.mp3"
          preload="auto"
          className="hidden"
        />
        <audio
          ref={receivedSoundRef}
          src="/sounds/message-received.mp3"
          preload="auto"
          className="hidden"
        />
        
        {/* Header do chat com cor roxa característica do sistema */}
        <div className="text-white p-3 flex items-center justify-between sm:rounded-t-2xl md:sticky fixed top-0 left-0 right-0 z-10 shadow-md"
          style={{ backgroundColor: '#6D28D9' }}
        >
          <div className="flex items-center">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src={person2Image} alt="Ritiele M. Aldeburg" />
              <AvatarFallback style={{ backgroundColor: '#128c7e' }} className="text-white">
                RA
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">Ritiele M. Aldeburg</p>
              <p className="text-xs opacity-80">Online agora</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="p-2 rounded-full hover:bg-[#128c7e] transition-colors"
                title="Menu"
              >
                <MoreVertical size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white">
              <DropdownMenuItem onClick={skipOnboarding} className="cursor-pointer text-red-500">
                <SkipForward className="h-4 w-4 mr-2" />
                Pular onboarding
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Área de chat com padrão financeiro */}
        <div className="flex-1 overflow-y-auto relative p-0 m-0 pb-16 pt-14 mt-4 md:pt-0 md:mt-0 bg-[#f8f5ff]" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M25 25 L30 25 L30 30 L25 30 Z' fill='%236D28D9' fill-opacity='0.05'/%3E%3Cpath d='M60 60 L65 60 L65 65 L60 65 Z' fill='%236D28D9' fill-opacity='0.1'/%3E%3Cpath d='M40 20 L42 20 L42 22 L40 22 Z' fill='%236D28D9' fill-opacity='0.07'/%3E%3Cpath d='M70 50 L72 50 L72 52 L70 52 Z' fill='%236D28D9' fill-opacity='0.07'/%3E%3Cpath d='M50 80 L55 80 L55 85 L50 85 Z' fill='%236D28D9' fill-opacity='0.05'/%3E%3Cpath d='M30 70 L32 70 L32 72 L30 72 Z' fill='%236D28D9' fill-opacity='0.07'/%3E%3Ctext x='15' y='40' font-family='Arial' font-size='8' fill='%236D28D9' fill-opacity='0.07'%3E$%3C/text%3E%3Ctext x='75' y='30' font-family='Arial' font-size='7' fill='%236D28D9' fill-opacity='0.07'%3E$%3C/text%3E%3Ctext x='45' y='65' font-family='Arial' font-size='10' fill='%236D28D9' fill-opacity='0.07'%3E$%3C/text%3E%3Ctext x='30' y='85' font-family='Arial' font-size='6' fill='%236D28D9' fill-opacity='0.07'%3E%25%3C/text%3E%3Ctext x='65' y='85' font-family='Arial' font-size='6' fill='%236D28D9' fill-opacity='0.07'%3ER$%3C/text%3E%3Ctext x='85' y='15' font-family='Arial' font-size='5' fill='%236D28D9' fill-opacity='0.07'%3E%25%3C/text%3E%3Cpath d='M10 40 C15 37, 20 30, 25 35 C30 40, 35 37, 35 35' stroke='%236D28D9' stroke-opacity='0.05' fill='none' stroke-width='1'/%3E%3Cpath d='M65 25 C70 20, 75 15, 80 25 C85 35, 90 30, 90 25' stroke='%236D28D9' stroke-opacity='0.05' fill='none' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px',
          }}>
          <div className="px-4 space-y-1 pt-2 pb-2">
            {messages.map((message, index) => {
              // Determina se deve mostrar o elemento baseado no tipo da mensagem
              if (message.type === 'system') {
                return (
                  <div key={`msg-${message.id}`} className="flex justify-start mt-2">
                    <div 
                      className={`max-w-[80%] p-3 rounded-lg shadow-sm bg-white text-gray-800 rounded-bl-none relative ${
                        message.isTyping ? 'animate-pulse' : ''
                      }`}
                      style={{
                        boxShadow: '0 1px 0.5px rgba(0, 0, 0, 0.13)',
                        borderLeft: '2px solid #8b5cf6'
                      }}
                    >
                      {message.isTyping ? (
                        <div className="flex space-x-1">
                          <div className="bg-purple-500 rounded-full h-2 w-2 animate-bounce"></div>
                          <div className="bg-purple-500 rounded-full h-2 w-2 animate-bounce [animation-delay:0.2s]"></div>
                          <div className="bg-purple-500 rounded-full h-2 w-2 animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                      ) : (
                        <FormattedMessage>{message.text}</FormattedMessage>
                      )}
                    </div>
                  </div>
                );
              } else if (message.type === 'user') {
                return (
                  <div key={`msg-${message.id}`} className="flex justify-end mt-2">
                    <div 
                      className="max-w-[80%] p-3 rounded-lg shadow-sm text-gray-800 rounded-br-none relative"
                      style={{
                        backgroundColor: '#ede9fe',
                        boxShadow: '0 1px 0.5px rgba(0, 0, 0, 0.13)',
                        borderRight: '2px solid #8b5cf6'
                      }}
                    >
                      <FormattedMessage>{message.text}</FormattedMessage>
                    </div>
                  </div>
                );
              } else if (message.type === 'closeButton') {
                // Renderiza um botão de fechamento especial
                console.log("Renderizando botão 'Ir para Meu Plano Ideal'", message);
                return (
                  <div key={`msg-${message.id}`} className="mt-4 w-full pl-0 flex">
                    <div className="text-left ml-0" style={{ maxWidth: "80%" }}>
                      <button
                        onClick={() => {
                          // Fecha o diálogo e redireciona para a página de planos e upgrades
                          console.log("Botão de fechamento clicado, redirecionando para planos e upgrades");
                          setDialogOpen(false);
                          navigate("/planos-e-upgrades");
                        }}
                        className="px-6 py-4 bg-purple-600 text-white font-bold rounded-lg shadow-lg hover:bg-purple-700 transition-all flex items-center justify-start gap-2"
                        style={{width: "100%"}}
                      >
                        <ArrowRight size={20} />
                        Ir para Meu Plano Ideal
                      </button>
                    </div>
                  </div>
                );
              } else if (message.type === 'options') {
                const isActive = message.isActive === true;
                const stepInfo = conversationSteps[message.stepIndex || 0];
                const isMultiSelect = stepInfo?.multiSelect;
                
                if (isMultiSelect) {
                  return (
                    <div key={`msg-${message.id}`} className="flex flex-col items-start gap-2 mt-1">
                      <div className="flex flex-col items-start gap-2 mb-2">
                        {message.options?.map((option) => (
                          <button
                            key={`option-${option}-${message.id}`}
                            onClick={isActive ? () => handleOptionClick(option) : undefined}
                            disabled={!isActive}
                            className={`px-4 py-2 rounded-full text-sm transition-all ${
                              isActive && multipleSelections.includes(option) && message.stepIndex === currentStep
                                ? 'bg-purple-600 text-white'
                                : multipleSelections.includes(option) && message.stepIndex !== currentStep 
                                   ? 'bg-white text-gray-800 border border-gray-300'
                                   : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
                            } ${!isActive ? 'opacity-70 cursor-auto' : ''}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      {multipleSelections.length > 0 && isActive && (
                        <Button
                          ref={confirmButtonRef}
                          onClick={handleConfirmMultipleSelections}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Confirmar ({multipleSelections.length})
                        </Button>
                      )}
                    </div>
                  );
                }
                
                return (
                  <div key={`msg-${message.id}`} className="flex flex-col items-start gap-2 mt-1">
                    {message.options?.map((option) => (
                      <button
                        key={`option-${option}-${message.id}`}
                        onClick={
                          isActive 
                            ? () => {
                                // IMPORTANTE: Desativa TODOS os botões ANTES de chamar handleOptionClick
                                // para garantir que não haja múltiplos cliques
                                if (message.stepIndex === 7) {
                                  // Na tela de confirmação, desativamos todos os botões imediatamente
                                  const allButtons = document.querySelectorAll('button');
                                  allButtons.forEach(btn => {
                                    btn.disabled = true;
                                    btn.classList.add('opacity-70');
                                    btn.style.cursor = 'auto';
                                    btn.classList.remove('hover:bg-gray-100', 'cursor-pointer', 'cursor-default');
                                  });
                                }
                                handleOptionClick(option);
                              } 
                            : undefined
                        }
                        disabled={!isActive}
                        className={`px-4 py-2 rounded-full text-sm shadow-sm border border-gray-300 bg-white text-gray-800 ${
                          isActive 
                            ? "hover:bg-gray-100 cursor-pointer" 
                            : "opacity-70 cursor-auto"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                );
              }
              
              return null;
            })}
          </div>
          <div ref={chatEndRef} />
        </div>
        
        {/* Campo de entrada de texto com tema financeiro - ajustável com o teclado virtual */}
        <div className="bg-[#f8f5ff] p-3 pb-4 flex items-center gap-2 sm:rounded-b-2xl sticky bottom-0 left-0 right-0 z-20 shadow-md keyboard-adjustable border-t border-purple-200">
          <button 
            className="text-purple-500 hover:text-purple-700"
            onClick={() => testOnboardingComplete()}
            title="Testar fechamento automático"
          >
            <Smile size={24} />
          </button>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Digite uma mensagem..."
            className="flex-1 py-2 px-4 bg-white rounded-full border-none focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all"
            autoFocus
          />
          <button 
            onClick={handleSendMessage}
            className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-2 rounded-full hover:from-purple-700 hover:to-purple-900 transition-all shadow-md"
          >
            <Send size={18} />
          </button>
        </div>
      </CustomDialogContent>
    </CustomDialog>
  );
};

export default OnboardingChat;