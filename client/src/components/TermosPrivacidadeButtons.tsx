import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function TermosPrivacidadeButtons() {
  const [termosAbertos, setTermosAbertos] = useState(false);
  const [privacidadeAberta, setPrivacidadeAberta] = useState(false);
  
  return (
    <>
      <div className="flex items-center justify-center space-x-4">
        <button 
          onClick={() => setTermosAbertos(true)} 
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          type="button"
          data-terms-button="true"
        >
          Termos de Uso
        </button>
        <span className="text-gray-400">|</span>
        <button 
          onClick={() => setPrivacidadeAberta(true)} 
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          type="button"
          data-privacy-button="true"
        >
          Política de Privacidade
        </button>
      </div>
      
      {/* Termos de Uso Popup */}
      <Dialog open={termosAbertos} onOpenChange={setTermosAbertos}>
        <DialogContent className="w-[90vw] max-w-3xl max-h-[85vh] overflow-hidden flex flex-col rounded-xl">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-xl font-bold">Termos de Uso</DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto overscroll-contain pr-4 py-4 my-1 custom-scrollbar max-h-[50vh] md:max-h-[60vh]">
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
          
          <DialogFooter className="px-6 py-4 border-t bg-gray-50 rounded-b-xl">
            <DialogClose asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 rounded-lg">
                Entendi
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Política de Privacidade Popup */}
      <Dialog open={privacidadeAberta} onOpenChange={setPrivacidadeAberta}>
        <DialogContent className="w-[90vw] max-w-3xl max-h-[85vh] overflow-hidden flex flex-col rounded-xl">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-xl font-bold">Política de Privacidade</DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto overscroll-contain pr-4 py-4 my-1 custom-scrollbar max-h-[50vh] md:max-h-[60vh]">
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
                Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco pelo e-mail contato@meuprecocerto.com.
              </p>
            </div>
          </div>
          
          <DialogFooter className="px-6 py-4 border-t bg-gray-50 rounded-b-xl">
            <DialogClose asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 rounded-lg">
                Entendi
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}