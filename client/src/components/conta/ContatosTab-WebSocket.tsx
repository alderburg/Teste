import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { PlusCircle, Edit3, Trash2, Save, X, Building, CheckCircle, AlertTriangle, Loader2, Phone, Mail, User, Briefcase, Smartphone, Search } from "lucide-react";
// Schema do contato local
const contatoSchema = z.object({
  nome: z.string().min(1, { message: "Nome do contato é obrigatório" }),
  setor: z.string().min(1, { message: "Setor é obrigatório" }).default("comercial"),
  cargo: z.string().min(1, { message: "Cargo/Função é obrigatório" }),
  telefone: z.string().min(1, { message: "Telefone é obrigatório" }),
  celular: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("Email inválido").min(1, { message: "Email é obrigatório" }),
  principal: z.boolean().default(false),
  tipo: z.string().default("comercial"),
});
import { Checkbox } from "@/components/ui/checkbox";
import { useWebSocketData } from "@/hooks/useWebSocketData";
import InputMask from "react-input-mask";
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

interface ContatoFormValues extends z.infer<typeof contatoSchema> {
  id?: number;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function ContatosTabWebSocket() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showAddContato, setShowAddContato] = useState(false);
  const [editingContato, setEditingContato] = useState<ContatoFormValues | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contatoToDelete, setContatoToDelete] = useState<ContatoFormValues | null>(null);

  // Usar WebSocket para gerenciar dados
  const {
    data: contatos,
    loading: isLoadingContatos,
    createItem: createContato,
    updateItem: updateContato,
    deleteItem: deleteContato
  } = useWebSocketData<ContatoFormValues>({
    endpoint: '/api/contatos',
    resource: 'contatos'
  });

  // Formulário
  const form = useForm<ContatoFormValues>({
    resolver: zodResolver(contatoSchema),
    defaultValues: {
      nome: "",
      setor: "comercial",
      cargo: "",
      telefone: "",
      celular: "",
      whatsapp: "",
      email: "",
      principal: false,
      tipo: "comercial"
    },
    mode: "onSubmit",
  });

  // Função para submeter o formulário
  const onSubmit = useCallback(async (data: ContatoFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingContato) {
        await updateContato(editingContato.id!, data);
        setEditingContato(null);
      } else {
        await createContato(data);
        setShowAddContato(false);
      }
      form.reset();
    } catch (error) {
      // Erro já tratado no hook useWebSocketData
    } finally {
      setIsSubmitting(false);
    }
  }, [editingContato, updateContato, createContato, form]);

  // Função para confirmar exclusão
  const handleDeleteContato = useCallback(async () => {
    if (contatoToDelete) {
      await deleteContato(contatoToDelete.id!);
      setContatoToDelete(null);
    }
  }, [contatoToDelete, deleteContato]);

  // Função para editar contato
  const handleEditContato = useCallback((contato: ContatoFormValues) => {
    setEditingContato(contato);
    form.reset(contato);
    setShowAddContato(true);
  }, [form]);

  // Função para cancelar edição
  const handleCancelEdit = useCallback(() => {
    setEditingContato(null);
    setShowAddContato(false);
    form.reset();
  }, [form]);

  // Filtrar contatos por pesquisa
  const contatosFiltrados = contatos.filter(contato =>
    contato.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contato.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contato.setor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contato.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginação
  const totalPages = Math.ceil(contatosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const contatosPaginados = contatosFiltrados.slice(startIndex, startIndex + itemsPerPage);

  // Reset da página quando filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium">Contatos Empresariais</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie seus contatos de fornecedores e clientes
          </p>
        </div>
        <Button 
          onClick={() => setShowAddContato(true)}
          className="flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Adicionar Contato
        </Button>
      </div>

      {/* Barra de pesquisa */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Pesquisar contatos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoadingContatos && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Carregando contatos...</span>
        </div>
      )}

      {/* Lista de contatos */}
      {!isLoadingContatos && (
        <div className="grid gap-4">
          {contatosPaginados.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? "Nenhum contato encontrado" : "Nenhum contato cadastrado"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            contatosPaginados.map((contato) => (
              <Card key={contato.id} className="relative">
                <CardContent className="pt-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{contato.nome}</h4>
                        {contato.principal && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-3 h-3" />
                          <span>{contato.cargo || "Cargo não informado"}</span>
                          <Building className="w-3 h-3 ml-2" />
                          <span>{contato.setor}</span>
                        </div>
                        {contato.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            <span>{contato.email}</span>
                          </div>
                        )}
                        {contato.telefone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            <span>{contato.telefone}</span>
                          </div>
                        )}
                        {contato.celular && (
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-3 h-3" />
                            <span>{contato.celular}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditContato(contato)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setContatoToDelete(contato)}
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
      {showAddContato && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingContato ? "Editar Contato" : "Adicionar Novo Contato"}
            </CardTitle>
            <CardDescription>
              {editingContato ? "Atualize as informações do contato" : "Preencha os dados do novo contato"}
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
                          <Input placeholder="Nome do contato" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cargo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Gerente de Vendas" {...field} />
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contato@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <InputMask
                            mask="(99) 9999-9999"
                            value={field.value}
                            onChange={field.onChange}
                          >
                            {(inputProps: any) => (
                              <Input {...inputProps} placeholder="(11) 3333-3333" />
                            )}
                          </InputMask>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="celular"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Celular</FormLabel>
                        <FormControl>
                          <InputMask
                            mask="(99) 99999-9999"
                            value={field.value}
                            onChange={field.onChange}
                          >
                            {(inputProps: any) => (
                              <Input {...inputProps} placeholder="(11) 99999-9999" />
                            )}
                          </InputMask>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="principal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Contato Principal
                        </FormLabel>
                        <FormDescription>
                          Marque se este é o contato principal da empresa
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="flex justify-end gap-2">
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
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    )}
                    <Save className="w-4 h-4 mr-2" />
                    {editingContato ? "Salvar Alterações" : "Adicionar Contato"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!contatoToDelete} onOpenChange={() => setContatoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contato "{contatoToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContato}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { ContatosTabWebSocket };