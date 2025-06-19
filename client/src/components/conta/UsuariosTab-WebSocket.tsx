import { useState, useEffect, useCallback } from "react";
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
import { AlertTriangle, Edit, Lock, Plus, PlusCircle, Save, Shield, Trash, Trash2, User, UserPlus, X, Search } from "lucide-react";
import { usuarioSchema } from "@/pages/conta/index";
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
  email: z.string().email({ message: "Formato de e-mail inválido" }),
  setor: z.string().min(1, { message: "O setor é obrigatório" }),
  permissao: z.string().min(1, { message: "A permissão é obrigatória" }),
  ativo: z.boolean().default(true),
});

// Interface estendida para incluir campos necessários do backend
interface UsuarioFormValues extends z.infer<typeof usuarioTabSchema> {
  id?: number;
  perfil?: string;
  status?: string;
  password?: string | null;
};

export default function UsuariosTabWebSocket() {
  const { toast } = useToast();
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<UsuarioFormValues | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<UsuarioFormValues | null>(null);

  // Usar WebSocket para gerenciar dados
  const {
    data: usuarios,
    loading: isLoadingUsuarios,
    createItem: createUsuario,
    updateItem: updateUsuario,
    deleteItem: deleteUsuario
  } = useWebSocketData<UsuarioFormValues>({
    endpoint: '/api/usuarios-adicionais',
    resource: 'usuarios_adicionais'
  });

  // Formulário
  const form = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioTabSchema),
    defaultValues: {
      nome: "",
      email: "",
      setor: "comercial",
      permissao: "usuario",
      ativo: true
    },
    mode: "onSubmit",
  });

  // Função para submeter o formulário
  const onSubmit = useCallback(async (data: UsuarioFormValues) => {
    setIsSubmitting(true);
    try {
      // Mapear permissao para perfil para compatibilidade com o backend
      const userData = {
        ...data,
        perfil: data.permissao,
        status: data.ativo ? "ativo" : "inativo"
      };

      if (editingUsuario) {
        await updateUsuario(editingUsuario.id!, userData);
        setEditingUsuario(null);
      } else {
        await createUsuario(userData);
        setShowAddUser(false);
      }
      form.reset();
    } catch (error) {
      // Erro já tratado no hook useWebSocketData
    } finally {
      setIsSubmitting(false);
    }
  }, [editingUsuario, updateUsuario, createUsuario, form]);

  // Função para confirmar exclusão
  const handleDeleteUsuario = useCallback(async () => {
    if (usuarioToDelete) {
      await deleteUsuario(usuarioToDelete.id!);
      setUsuarioToDelete(null);
    }
  }, [usuarioToDelete, deleteUsuario]);

  // Função para editar usuário
  const handleEditUsuario = useCallback((usuario: UsuarioFormValues) => {
    setEditingUsuario(usuario);
    // Mapear perfil para permissao para o formulário
    const formData = {
      ...usuario,
      permissao: usuario.perfil || "usuario",
      ativo: usuario.status === "ativo"
    };
    form.reset(formData);
    setShowAddUser(true);
  }, [form]);

  // Função para cancelar edição
  const handleCancelEdit = useCallback(() => {
    setEditingUsuario(null);
    setShowAddUser(false);
    form.reset();
  }, [form]);

  // Filtrar usuários por pesquisa
  const usuariosFiltrados = usuarios.filter(usuario =>
    usuario.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.setor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginação
  const totalPages = Math.ceil(usuariosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const usuariosPaginados = usuariosFiltrados.slice(startIndex, startIndex + itemsPerPage);

  // Reset da página quando filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Função para obter as iniciais do nome
  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Função para obter cor do badge baseado no status
  const getStatusBadge = (status: string) => {
    return status === "ativo" ? "default" : "secondary";
  };

  // Função para obter cor do badge baseado no perfil
  const getPerfilBadge = (perfil: string) => {
    switch (perfil) {
      case "admin":
        return "destructive";
      case "gerente":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium">Usuários Adicionais</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie usuários com acesso ao sistema
          </p>
        </div>
        <Button 
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Adicionar Usuário
        </Button>
      </div>

      {/* Barra de pesquisa */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Pesquisar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoadingUsuarios && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2">Carregando usuários...</span>
        </div>
      )}

      {/* Lista de usuários */}
      {!isLoadingUsuarios && (
        <div className="grid gap-4">
          {usuariosPaginados.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário adicional cadastrado"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            usuariosPaginados.map((usuario) => (
              <Card key={usuario.id} className="relative">
                <CardContent className="pt-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src="" alt={usuario.nome} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(usuario.nome || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{usuario.nome}</h4>
                          <Badge variant={getStatusBadge(usuario.status || "ativo")}>
                            {usuario.status === "ativo" ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant={getPerfilBadge(usuario.perfil || "usuario")}>
                            {usuario.perfil === "admin" ? "Admin" : 
                             usuario.perfil === "gerente" ? "Gerente" : "Usuário"}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>{usuario.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Setor: {usuario.setor}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUsuario(usuario)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUsuarioToDelete(usuario)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Formulário */}
      {showAddUser && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingUsuario ? "Editar Usuário" : "Adicionar Novo Usuário"}
            </CardTitle>
            <CardDescription>
              {editingUsuario ? "Atualize as informações do usuário" : "Preencha os dados do novo usuário"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do usuário" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="usuario@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="setor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o setor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="comercial">Comercial</SelectItem>
                            <SelectItem value="financeiro">Financeiro</SelectItem>
                            <SelectItem value="operacional">Operacional</SelectItem>
                            <SelectItem value="administrativo">Administrativo</SelectItem>
                            <SelectItem value="tecnico">Técnico</SelectItem>
                            <SelectItem value="juridico">Jurídico</SelectItem>
                            <SelectItem value="rh">Recursos Humanos</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="vendas">Vendas</SelectItem>
                            <SelectItem value="compras">Compras</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="permissao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Permissão *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a permissão" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="usuario">Usuário</SelectItem>
                            <SelectItem value="gerente">Gerente</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        <FormDescription>
                          Define o nível de acesso do usuário no sistema
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="ativo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Usuário Ativo
                        </FormLabel>
                        <FormDescription>
                          Define se o usuário pode acessar o sistema
                        </FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    )}
                    <Save className="w-4 h-4 mr-2" />
                    {editingUsuario ? "Salvar Alterações" : "Adicionar Usuário"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!usuarioToDelete} onOpenChange={() => setUsuarioToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário "{usuarioToDelete?.nome}"?
              Esta ação não pode ser desfeita e o usuário perderá acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUsuario}
            >
              Remover Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}