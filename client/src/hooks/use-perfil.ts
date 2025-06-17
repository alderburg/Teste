import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface PerfilData {
  id: number;
  userId: number;
  primeiroNome: string;
  ultimoNome: string;
  razaoSocial: string;
  nomeFantasia: string;
  tipoPessoa: string;
  cpfCnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  cnae: string;
  regimeTributario: string;
  atividadePrincipal: string;
  responsavelNome: string;
  responsavelEmail: string;
  responsavelTelefone: string;
  responsavelSetor: string;
  contadorNome: string;
  contadorEmail: string;
  contadorTelefone: string;
  logoUrl: string;
  configuracoes: {
    tema: string;
    notificacoes: boolean;
    exibirTutorial: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Hook customizado para buscar e gerenciar dados do perfil do usuário
 * @param userId ID do usuário
 * @returns Objeto com dados do perfil e funções para gerenciá-los
 */
export function usePerfil(userId: number) {
  const [perfilData, setPerfilData] = useState<PerfilData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Função para buscar perfil diretamente
  const fetchPerfil = async (forceRefresh: boolean = false): Promise<PerfilData | null> => {
    if (!userId) {
      console.error("Tentativa de buscar perfil sem ID de usuário");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`Buscando dados do perfil para usuário ID: ${userId}`);
      const cacheControl = forceRefresh ? 'no-cache, no-store, must-revalidate' : '';
      
      const response = await fetch(`/api/minha-conta/perfil?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': cacheControl,
          'Pragma': forceRefresh ? 'no-cache' : '',
          'Expires': forceRefresh ? '0' : ''
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar perfil: ${response.status}`);
      }

      const data = await response.json();
      console.log("Dados do perfil recebidos:", data);
      
      setPerfilData(data);
      setIsLoading(false);
      return data;
    } catch (err: any) {
      console.error("Erro ao buscar perfil:", err);
      setError(err);
      setIsLoading(false);
      
      toast({
        title: "Erro ao carregar perfil",
        description: err.message || "Não foi possível carregar seus dados. Tente novamente.",
        variant: "destructive",
      });
      
      return null;
    }
  };

  // Função para atualizar perfil
  const updatePerfil = async (data: Partial<PerfilData>): Promise<PerfilData | null> => {
    if (!userId) {
      return null;
    }

    try {
      const response = await fetch(`/api/minha-conta/perfil/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Erro ao atualizar perfil: ${response.status}`);
      }

      const updatedData = await response.json();
      setPerfilData(updatedData);
      
      toast({
        title: "Perfil atualizado",
        description: "Seus dados foram atualizados com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      
      return updatedData;
    } catch (err: any) {
      console.error("Erro ao atualizar perfil:", err);
      
      toast({
        title: "Erro ao atualizar perfil",
        description: err.message || "Não foi possível atualizar seus dados. Tente novamente.",
        variant: "destructive",
      });
      
      return null;
    }
  };

  // Buscar dados ao montar o componente
  useEffect(() => {
    if (userId) {
      fetchPerfil();
    }
  }, [userId]);

  return {
    perfil: perfilData,
    isLoading,
    error,
    fetchPerfil,
    updatePerfil
  };
}

export default usePerfil;