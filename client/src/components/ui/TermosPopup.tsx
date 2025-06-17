import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

interface TermosPopupProps {
  onClose: () => void;
}

export function TermosPopup({ onClose }: TermosPopupProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-fadeSlideUp">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Termos de Uso</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-6 overflow-y-auto">
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
        
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}