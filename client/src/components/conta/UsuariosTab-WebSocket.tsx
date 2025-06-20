import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Edit, Lock, Save, Shield, Trash, Trash2, User, UserPlus, X, Search } from "lucide-react";
import { useWebSocketData } from "@/hooks/useWebSocketData";
import { Pagination } from "@/components/Pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

// Schema para a aba de usuários
const usuarioTabSchema = z.object({
  nome: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  setor: z.string().min(1, { message: "Setor é obrigatório" }),
  perfil: z.string().min(1, { message: "Perfil é obrigatório" }),
  status: z.string().optional().default("ativo"),
  password: z.string().optional(),
});

// Interface para os dados do usuário com campos opcionais
interface UsuarioFormValues {
  id?: number;
  nome: string;
  email: string;
  setor: string;
  perfil: string;
  status: string;
  password?: string | null;
};

export function UsuariosTab() {
  const { toast } = useToast();
  
  // Estados locais
  const [showForm, setShowForm] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<UsuarioFormValues | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<UsuarioFormValues | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Hook do WebSocket para usuários
  const {
    data: usuariosData,
    loading: isLoadingUsuarios,
    createItem: createUsuario,
    updateItem: updateUsuario,
    deleteItem: deleteUsuario
  } = useWebSocketData<UsuarioFormValues>({
    endpoint: '/api/usuarios-adicionais',
    resource: 'usuarios'
  });

  // Formulário para usuários
  const usuarioForm = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioTabSchema),
    defaultValues: {
      nome: "",
      email: "",
      setor: "",
      perfil: "usuario",
      status: "ativo",
    },
  });

  // Filtrar e paginar usuários
  const filteredUsuarios = useMemo(() => {
    if (!usuariosData || !Array.isArray(usuariosData)) return [];
    
    return usuariosData.filter((usuario: UsuarioFormValues) =>
      usuario.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.setor?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [usuariosData, searchTerm]);

  const totalPages = Math.ceil(filteredUsuarios.length / itemsPerPage);
  const paginatedUsuarios = filteredUsuarios.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers do WebSocket
  const handleAddUsuario = async (formData: UsuarioFormValues) => {
    try {
      await createUsuario(formData);
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });
      setShowForm(false);
      usuarioForm.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar o usuário",
      });
    }
  };

  const handleEditUsuario = (usuario: UsuarioFormValues) => {
    setEditingUsuario(usuario);
    setShowForm(true);
    usuarioForm.reset(usuario);
  };

  const handleUpdateUsuario = async (formData: UsuarioFormValues) => {
    try {
      if (editingUsuario?.id) {
        await updateUsuario(editingUsuario.id, formData);
        toast({
          title: "Sucesso",
          description: "Usuário atualizado com sucesso!",
        });
        setShowForm(false);
        setEditingUsuario(null);
        usuarioForm.reset();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o usuário",
      });
    }
  };

  const handleDeleteUsuario = async (usuario: UsuarioFormValues) => {
    try {
      if (usuario.id) {
        await deleteUsuario(usuario.id);
        toast({
          title: "Sucesso",
          description: "Usuário excluído com sucesso!",
        });
        setDeleteDialogOpen(false);
        setUsuarioToDelete(null);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o usuário",
      });
    }
  };

  const handleSendPasswordEmail = async (usuario: UsuarioFormValues) => {
    try {
      const response = await fetch(`/api/usuarios-adicionais/${usuario.id}/send-password-email`, {
        method: "POST",
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Email enviado",
          description: "Email com link para definir senha enviado com sucesso!",
        });
      } else {
        throw new Error("Erro ao enviar email");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível enviar o email",
      });
    }
  };

  const onSubmit = (data: UsuarioFormValues) => {
    if (editingUsuario) {
      handleUpdateUsuario(data);
    } else {
      handleAddUsuario(data);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUsuario(null);
    usuarioForm.reset();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Usuários Adicionais
              </CardTitle>
              <CardDescription>
                Gerencie os usuários adicionais da sua conta
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Barra de pesquisa */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Pesquisar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoadingUsuarios ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Lista de usuários */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedUsuarios.map((usuario: UsuarioFormValues) => (
                  <Card key={usuario.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.nome || '')}&background=0084ff&color=fff`} />
                          <AvatarFallback>
                            {usuario.nome?.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {usuario.nome}
                            </h3>
                            <Badge variant={usuario.status === 'ativo' ? 'default' : 'secondary'}>
                              {usuario.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{usuario.email}</p>
                          <p className="text-xs text-gray-400">{usuario.setor}</p>
                          <p className="text-xs text-blue-600 font-medium">{usuario.perfil}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUsuario(usuario)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendPasswordEmail(usuario)}
                            className="flex items-center gap-1"
                          >
                            <Lock className="h-3 w-3" />
                            Senha
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUsuarioToDelete(usuario);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredUsuarios.length)} de {filteredUsuarios.length} usuários
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Formulário de usuário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}</span>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...usuarioForm}>
              <form onSubmit={usuarioForm.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={usuarioForm.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={usuarioForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={usuarioForm.control}
                    name="setor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Vendas, Compras, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={usuarioForm.control}
                    name="perfil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Perfil de Acesso *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o perfil" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="usuario">Usuário</SelectItem>
                            <SelectItem value="visualizador">Visualizador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {editingUsuario ? 'Atualizar' : 'Criar'} Usuário
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir o usuário "{usuarioToDelete?.nome}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => usuarioToDelete && handleDeleteUsuario(usuarioToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default UsuariosTab;