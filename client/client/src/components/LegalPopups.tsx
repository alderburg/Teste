import React, { useState, createContext, useContext } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';

// Criando um contexto para gerenciar os popups em qualquer lugar do app
interface LegalPopupsContextType {
  openTermos: () => void;
  openPrivacidade: () => void;
}

const LegalPopupsContext = createContext<LegalPopupsContextType | null>(null);

// Hook personalizado para facilitar o uso dos popups
export function useLegalPopups() {
  const context = useContext(LegalPopupsContext);
  if (!context) {
    throw new Error('useLegalPopups deve ser usado dentro de um LegalPopupsProvider');
  }
  return context;
}

// Provider para envolver o app
export function LegalPopupsProvider({ children }: { children: React.ReactNode }) {
  const [termosAbertos, setTermosAbertos] = useState(false);
  const [privacidadeAberta, setPrivacidadeAberta] = useState(false);
  
  // Funções para abrir os popups
  const openTermos = () => setTermosAbertos(true);
  const openPrivacidade = () => setPrivacidadeAberta(true);
  
  return (
    <LegalPopupsContext.Provider value={{ openTermos, openPrivacidade }}>
      {children}
      
      <TermosUsoPopup 
        isOpen={termosAbertos} 
        onClose={() => setTermosAbertos(false)} 
      />
      
      <PoliticaPrivacidadePopup 
        isOpen={privacidadeAberta} 
        onClose={() => setPrivacidadeAberta(false)} 
      />
    </LegalPopupsContext.Provider>
  );
}

export interface LegalPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermosUsoPopup({ isOpen, onClose }: LegalPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-xl font-bold">Termos de Uso</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto overscroll-contain pr-4 py-4 my-1 custom-scrollbar">
          <div className="prose prose-blue max-w-none">
            <h3>1. Aceitação dos Termos</h3>
            <p>
              Ao acessar e utilizar nossa plataforma, você concorda com estes Termos de Uso e todas as leis e regulamentos aplicáveis. Se você não concordar com algum destes termos, está proibido de usar este serviço.
            </p>
            
            <h3>2. Uso da Plataforma</h3>
            <p>
              Nossa plataforma fornece ferramentas para gestão de negócios e precificação. Você concorda em usar estes serviços apenas para fins legítimos e de acordo com estes termos.
            </p>
            
            <h3>3. Conta de Usuário</h3>
            <p>
              Para acessar certos recursos da plataforma, você precisará criar uma conta. Você é responsável por manter a confidencialidade de sua conta e senha, e por restringir o acesso ao seu computador.
            </p>
            
            <h3>4. Conteúdo do Usuário</h3>
            <p>
              Qualquer conteúdo que você enviar, postar ou exibir em nossa plataforma é de sua responsabilidade. Você mantém seus direitos autorais sobre esse conteúdo, mas nos concede uma licença para usá-lo no contexto do serviço.
            </p>
            
            <h3>5. Propriedade Intelectual</h3>
            <p>
              A plataforma e seu conteúdo original, recursos e funcionalidades são e permanecerão propriedade exclusiva da empresa e seus licenciadores. O serviço é protegido por direitos autorais, marcas registradas e outras leis.
            </p>
            
            <h3>6. Restrições de Uso</h3>
            <p>
              Você concorda em não:</p>
              <ul>
                <li>Usar a plataforma de forma ilegal ou não autorizada</li>
                <li>Tentar acessar áreas restritas sem permissão</li>
                <li>Enviar malware ou código prejudicial</li>
                <li>Violar a segurança da plataforma</li>
                <li>Realizar engenharia reversa do código</li>
              </ul>
            
            <h3>7. Limitação de Responsabilidade</h3>
            <p>
              Em nenhum caso seremos responsáveis por quaisquer danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados ou outros intangíveis.
            </p>
            
            <h3>8. Alterações nos Termos</h3>
            <p>
              Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entram em vigor imediatamente após serem publicadas na plataforma. O uso contínuo do serviço após essas alterações constitui aceitação dos novos termos.
            </p>
            
            <h3>9. Lei Aplicável</h3>
            <p>
              Estes termos são regidos e interpretados de acordo com as leis do Brasil, e você se submete irrevogavelmente à jurisdição exclusiva dos tribunais naquele local.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button>Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PoliticaPrivacidadePopup({ isOpen, onClose }: LegalPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-xl font-bold">Política de Privacidade</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto overscroll-contain pr-4 py-4 my-1 custom-scrollbar">
          <div className="prose prose-blue max-w-none">
            <p>
              Sua privacidade é importante para nós. Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações quando você utiliza nossa plataforma.
            </p>
            
            <h3>1. Informações Coletadas</h3>
            <p>
              Podemos coletar as seguintes informações:
            </p>
            <ul>
              <li>Informações de identificação pessoal (nome, e-mail, telefone, etc.)</li>
              <li>Dados de uso da plataforma</li>
              <li>Informações do dispositivo e navegador</li>
              <li>Cookies e tecnologias similares</li>
              <li>Dados fornecidos voluntariamente</li>
            </ul>
            
            <h3>2. Uso das Informações</h3>
            <p>
              Utilizamos suas informações para:
            </p>
            <ul>
              <li>Fornecer e manter nossos serviços</li>
              <li>Melhorar e personalizar sua experiência</li>
              <li>Processar transações</li>
              <li>Enviar e-mails administrativos e atualizações</li>
              <li>Detectar e prevenir fraudes</li>
            </ul>
            
            <h3>3. Compartilhamento de Dados</h3>
            <p>
              Podemos compartilhar suas informações com:
            </p>
            <ul>
              <li>Prestadores de serviços que nos ajudam a operar a plataforma</li>
              <li>Parceiros de negócios com seu consentimento</li>
              <li>Autoridades legais quando obrigados por lei</li>
            </ul>
            <p>
              Não vendemos ou alugamos suas informações pessoais a terceiros.
            </p>
            
            <h3>4. Proteção de Dados</h3>
            <p>
              Implementamos medidas de segurança apropriadas para proteger contra acesso não autorizado, alteração, divulgação ou destruição de suas informações pessoais.
            </p>
            
            <h3>5. Seus Direitos</h3>
            <p>
              Você tem o direito de:
            </p>
            <ul>
              <li>Acessar suas informações pessoais</li>
              <li>Corrigir dados imprecisos</li>
              <li>Excluir suas informações em determinadas circunstâncias</li>
              <li>Restringir ou opor-se ao processamento</li>
              <li>Solicitar a portabilidade de dados</li>
            </ul>
            
            <h3>6. Cookies</h3>
            <p>
              Usamos cookies para melhorar sua experiência, entender como você interage com nossa plataforma e personalizar conteúdo. Você pode gerenciar as preferências de cookies através do seu navegador.
            </p>
            
            <h3>7. Crianças</h3>
            <p>
              Nossos serviços não são direcionados a pessoas com menos de 18 anos, e não coletamos intencionalmente informações pessoais de crianças.
            </p>
            
            <h3>8. Alterações nesta Política</h3>
            <p>
              Podemos atualizar nossa Política de Privacidade periodicamente. Notificaremos sobre mudanças significativas e a data em que entrarem em vigor.
            </p>
            
            <h3>9. Contato</h3>
            <p>
              Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco pelo e-mail privacy@exemplo.com.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button>Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componente de utilitário para gerenciar os links legais em qualquer tela do sistema
export function LegalLinks() {
  // Usando o contexto criado
  const { openTermos, openPrivacidade } = useLegalPopups();
  
  return (
    <div className="flex items-center justify-center space-x-4">
      <button 
        onClick={openTermos} 
        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        type="button"
      >
        Termos de Uso
      </button>
      <span className="text-gray-400">|</span>
      <button 
        onClick={openPrivacidade} 
        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        type="button"
      >
        Política de Privacidade
      </button>
    </div>
  );
}