import { useState, useEffect, useCallback } from 'react';
import { useWebSocketContext } from '@/components/WebSocketProvider';
import { useToast } from '@/hooks/use-toast';

interface UseWebSocketDataOptions {
  endpoint: string;
  resource: string;
  initialData?: any[];
  autoFetch?: boolean;
}

interface WebSocketDataState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

export function useWebSocketData<T = any>({
  endpoint,
  resource,
  initialData = [],
  autoFetch = true
}: UseWebSocketDataOptions) {
  const [state, setState] = useState<WebSocketDataState<T>>({
    data: initialData,
    loading: autoFetch,
    error: null
  });

  const { connected, sendMessage } = useWebSocketContext();
  const { toast } = useToast();

  // Função para buscar dados
  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch(endpoint, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar dados: ${response.status}`);
      }

      const data = await response.json();
      
      // Para recursos únicos como perfil, tratar tanto objeto único quanto array
      let normalizedData;
      if (resource === 'perfil') {
        normalizedData = data && typeof data === 'object' && !Array.isArray(data) ? [data] : (Array.isArray(data) ? data : []);
      } else {
        normalizedData = Array.isArray(data) ? data : [data];
      }
      
      setState({
        data: normalizedData,
        loading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      console.error(`Erro ao buscar ${resource}:`, error);
    }
  }, [endpoint, resource]);

  // Função para criar item
  const createItem = useCallback(async (data: Partial<T>) => {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ao criar ${resource}`);
      }

      const newItem = await response.json();
      
      setState(prev => ({
        ...prev,
        data: [...prev.data, newItem]
      }));

      toast({
        title: "Sucesso",
        description: `${resource} criado com sucesso`
      });

      return newItem;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    }
  }, [endpoint, resource, toast]);

  // Função para atualizar item
  const updateItem = useCallback(async (id: number, data: Partial<T>) => {
    try {
      const response = await fetch(`${endpoint}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ao atualizar ${resource}`);
      }

      const updatedItem = await response.json();
      
      setState(prev => ({
        ...prev,
        data: prev.data.map(item => 
          (item as any).id === id ? updatedItem : item
        )
      }));

      toast({
        title: "Sucesso",
        description: `${resource} atualizado com sucesso`
      });

      return updatedItem;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    }
  }, [endpoint, resource, toast]);

  // Função para deletar item
  const deleteItem = useCallback(async (id: number) => {
    try {
      const response = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ao deletar ${resource}`);
      }

      setState(prev => ({
        ...prev,
        data: prev.data.filter(item => (item as any).id !== id)
      }));

      toast({
        title: "Sucesso",
        description: `${resource} removido com sucesso`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    }
  }, [endpoint, resource, toast]);

  // Escutar atualizações via WebSocket
  useEffect(() => {
    const handleWebSocketMessage = (event: CustomEvent) => {
      const { resource: wsResource, action, data } = event.detail;
      
      if (wsResource === resource) {
        console.log(`WebSocket update for ${resource}:`, action, data);
        
        setState(prev => {
          switch (action) {
            case 'create':
              return {
                ...prev,
                data: [...prev.data, data]
              };
            case 'update':
              return {
                ...prev,
                data: prev.data.map(item => 
                  (item as any).id === data.id ? data : item
                )
              };
            case 'delete':
              return {
                ...prev,
                data: prev.data.filter(item => (item as any).id !== data.id)
              };
            default:
              return prev;
          }
        });
      }
    };

    window.addEventListener('websocket-data-update', handleWebSocketMessage as EventListener);
    
    return () => {
      window.removeEventListener('websocket-data-update', handleWebSocketMessage as EventListener);
    };
  }, [resource]);

  // Buscar dados iniciais
  useEffect(() => {
    if (autoFetch && connected) {
      fetchData();
    }
  }, [fetchData, autoFetch, connected]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchData,
    createItem,
    updateItem,
    deleteItem
  };
}