
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
      setState({
        data: Array.isArray(data) ? data : [data],
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error(`Erro ao buscar dados de ${resource}:`, error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  }, [endpoint, resource]);

  // Função para criar item
  const createItem = useCallback(async (itemData: Partial<T>) => {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(itemData)
      });

      if (!response.ok) {
        throw new Error(`Erro ao criar item: ${response.status}`);
      }

      const newItem = await response.json();
      setState(prev => ({
        ...prev,
        data: [...prev.data, newItem]
      }));

      toast({
        title: "Sucesso",
        description: "Item criado com sucesso!",
      });

      return newItem;
    } catch (error: any) {
      console.error(`Erro ao criar item em ${resource}:`, error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }, [endpoint, resource, toast]);

  // Função para atualizar item
  const updateItem = useCallback(async (id: number | string, itemData: Partial<T>) => {
    try {
      const response = await fetch(`${endpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(itemData)
      });

      if (!response.ok) {
        throw new Error(`Erro ao atualizar item: ${response.status}`);
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
        description: "Item atualizado com sucesso!",
      });

      return updatedItem;
    } catch (error: any) {
      console.error(`Erro ao atualizar item em ${resource}:`, error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }, [endpoint, resource, toast]);

  // Função para deletar item
  const deleteItem = useCallback(async (id: number | string) => {
    try {
      const response = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erro ao deletar item: ${response.status}`);
      }

      setState(prev => ({
        ...prev,
        data: prev.data.filter(item => (item as any).id !== id)
      }));

      toast({
        title: "Sucesso",
        description: "Item removido com sucesso!",
      });
    } catch (error: any) {
      console.error(`Erro ao deletar item em ${resource}:`, error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
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
