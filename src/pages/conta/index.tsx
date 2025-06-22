import React, { useState, useEffect, useRef } from 'react';

// Estados para dados WebSocket
  const [perfilData, setPerfilData] = useState(null);
  const [enderecosData, setEnderecosData] = useState([]);
  const [contatosData, setContatosData] = useState([]);
  const [usuariosData, setUsuariosData] = useState([]);
  const [isLoadingPerfil, setIsLoadingPerfil] = useState(true);
  const [isLoadingEnderecos, setIsLoadingEnderecos] = useState(true);
  const [isLoadingContatos, setIsLoadingContatos] = useState(true);
  const [isLoadingUsuarios, setIsLoadingUsuarios] = useState(true);

  // Buscar dados via fetch direto (WebSocket apenas)
  const fetchPerfilDataWS = async () => {
    try {
      setIsLoadingPerfil(true);
      const response = await fetch(`/api/conta/perfil`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setPerfilData(data || {});
      }
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
    } finally {
      setIsLoadingPerfil(false);
    }
  };

  const fetchEnderecosDataWS = async () => {
    try {
      setIsLoadingEnderecos(true);
      const response = await fetch(`/api/enderecos`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setEnderecosData(data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar endereços:", error);
    } finally {
      setIsLoadingEnderecos(false);
    }
  };

  const fetchContatosDataWS = async () => {
    try {
      setIsLoadingContatos(true);
      const response = await fetch(`/api/contatos`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setContatosData(data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar contatos:", error);
    } finally {
      setIsLoadingContatos(false);
    }
  };

  const fetchUsuariosDataWS = async () => {
    try {
      setIsLoadingUsuarios(true);
      const response = await fetch(`/api/usuarios-adicionais`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUsuariosData(data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setIsLoadingUsuarios(false);
    }
  };
// Buscar dados iniciais e configurar listeners WebSocket
  useEffect(() => {
    // Buscar dados iniciais
    fetchPerfilDataWS();
    fetchEnderecosDataWS();
    fetchContatosDataWS();
    fetchUsuariosDataWS();

    // Listener para atualizações via WebSocket
    const handleWebSocketDataUpdate = (event: CustomEvent) => {
      const { resource, action, data } = event.detail;

      console.log('WebSocket data update received:', { resource, action, data });

      switch (resource) {
        case 'perfil':
          if (action === 'update') {
            setPerfilData(data);
          }
          break;
        case 'enderecos':
          if (action === 'create') {
            setEnderecosData(prev => [...prev, data]);
          } else if (action === 'update') {
            setEnderecosData(prev => prev.map(item => item.id === data.id ? data : item));
          } else if (action === 'delete') {
            setEnderecosData(prev => prev.filter(item => item.id !== data.id));
          }
          break;
        case 'contatos':
          if (action === 'create') {
            setContatosData(prev => [...prev, data]);
          } else if (action === 'update') {
            setContatosData(prev => prev.map(item => item.id === data.id ? data : item));
          } else if (action === 'delete') {
            setContatosData(prev => prev.filter(item => item.id !== data.id));
          }
          break;
        case 'usuarios_adicionais':
          if (action === 'create') {
            setUsuariosData(prev => [...prev, data]);
          } else if (action === 'update') {
            setUsuariosData(prev => prev.map(item => item.id === data.id ? data : item));
          } else if (action === 'delete') {
            setUsuariosData(prev => prev.filter(item => item.id !== data.id));
          }
          break;
      }
    };

    // Adicionar listener para atualizações WebSocket
    window.addEventListener('websocket-data-update', handleWebSocketDataUpdate as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('websocket-data-update', handleWebSocketDataUpdate as EventListener);
    };
  }, []);