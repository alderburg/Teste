import React from 'react';
import { Users, Package } from 'lucide-react';

interface InfoBoxProps {
  estatisticas: {
    usuariosCadastrados?: number;
    produtosCadastrados?: number;
    servicosCadastrados?: number;
  };
  limitesCadastro: {
    usuarios?: string | number;
    produtos?: string | number;
    servicos?: string | number;
  };
}

export default function InfoBox({ estatisticas, limitesCadastro }: InfoBoxProps) {
  // Função para calcular porcentagem utilizada
  const calcularPorcentagem = (usado: number = 0, limite: string | number): number => {
    if (limite === 'Ilimitado') return 25; // Para ilimitado, mostra 25% por padrão
    if (typeof limite === 'number' && limite > 0) {
      return Math.min(100, (usado * 100) / limite);
    }
    if (typeof limite === 'string') {
      const limiteNumerico = parseInt(limite, 10);
      if (!isNaN(limiteNumerico) && limiteNumerico > 0) {
        return Math.min(100, (usado * 100) / limiteNumerico);
      }
    }
    return 0;
  };

  return (
    <div className="space-y-4">
      {/* Informações sobre usuários do plano */}
      {limitesCadastro.usuarios && (
        <div className="p-3 bg-purple-50 rounded-lg mb-4 border border-purple-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-purple-700">Usuários:</span>
            </div>
            <span className="text-sm font-bold text-purple-800">
              {estatisticas.usuariosCadastrados || 1}/{' '}
              {limitesCadastro.usuarios === 'Ilimitado' 
                ? 'Ilimitado' 
                : limitesCadastro.usuarios}
            </span>
          </div>
          <div className="mt-2 relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-purple-500 rounded-full" 
              style={{ 
                width: `${calcularPorcentagem(estatisticas.usuariosCadastrados || 1, limitesCadastro.usuarios)}%` 
              }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Informações sobre produtos e serviços */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
        <div className="flex items-center mb-2">
          <Package className="h-4 w-4 text-teal-600 mr-2" />
          <span className="text-sm font-medium text-gray-700">Cadastros:</span>
        </div>
        <div className="space-y-2 pl-6">
          {limitesCadastro.produtos && (
            <div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-600">Produtos:</span>
                <span className="text-xs font-medium">
                  {estatisticas.produtosCadastrados || 0}/{' '}
                  {limitesCadastro.produtos === 'Ilimitado' 
                    ? 'Ilimitado' 
                    : limitesCadastro.produtos}
                </span>
              </div>
              <div className="mt-1 relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-teal-500 rounded-full" 
                  style={{ 
                    width: `${calcularPorcentagem(estatisticas.produtosCadastrados || 0, limitesCadastro.produtos)}%` 
                  }}
                ></div>
              </div>
            </div>
          )}
          
          {limitesCadastro.servicos && (
            <div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-600">Serviços:</span>
                <span className="text-xs font-medium">
                  {estatisticas.servicosCadastrados || 0}/{' '}
                  {limitesCadastro.servicos === 'Ilimitado' 
                    ? 'Ilimitado' 
                    : limitesCadastro.servicos}
                </span>
              </div>
              <div className="mt-1 relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-teal-500 rounded-full" 
                  style={{ 
                    width: `${calcularPorcentagem(estatisticas.servicosCadastrados || 0, limitesCadastro.servicos)}%` 
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}