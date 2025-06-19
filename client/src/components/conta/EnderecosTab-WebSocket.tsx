import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, PlusCircle, Edit3, Trash2, Save, X, Building, Home, Briefcase, CheckCircle, AlertTriangle, Loader2, Search } from "lucide-react";
import { enderecoSchema } from "@/pages/conta/index";
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

interface EnderecoFormValues extends z.infer<typeof enderecoSchema> {
  id?: number;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function EnderecosTabWebSocket() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showAddEndereco, setShowAddEndereco] = useState(false);
  const [editingEndereco, setEditingEndereco] = useState<EnderecoFormValues | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enderecoToDelete, setEnderecoToDelete] = useState<EnderecoFormValues | null>(null);

  // Usar WebSocket para gerenciar dados
  const {
    data: enderecos,
    loading: isLoadingEnderecos,
    createItem: createEndereco,
    updateItem: updateEndereco,
    deleteItem: deleteEndereco
  } = useWebSocketData<EnderecoFormValues>({
    endpoint: '/api/enderecos',
    resource: 'enderecos'
  });

  // Formulário
  const form = useForm<EnderecoFormValues>({
    resolver: zodResolver(enderecoSchema),
    defaultValues: {
      nome: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      tipo: "comercial",
      principal: false
    },
    mode: "onSubmit",
  });

  // Função para submeter o formulário
  const onSubmit = useCallback(async (data: EnderecoFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingEndereco) {
        await updateEndereco(editingEndereco.id!, data);
        setEditingEndereco(null);
      } else {
        await createEndereco(data);
        setShowAddEndereco(false);
      }
      form.reset();
    } catch (error) {
      // Erro já tratado no hook useWebSocketData
    } finally {
      setIsSubmitting(false);
    }
  }, [editingEndereco, updateEndereco, createEndereco, form]);

  // Função para confirmar exclusão
  const handleDeleteEndereco = useCallback(async () => {
    if (enderecoToDelete) {
      await deleteEndereco(enderecoToDelete.id!);
      setEnderecoToDelete(null);
    }
  }, [enderecoToDelete, deleteEndereco]);

  // Função para editar endereço
  const handleEditEndereco = useCallback((endereco: EnderecoFormValues) => {
    setEditingEndereco(endereco);
    form.reset(endereco);
    setShowAddEndereco(true);
  }, [form]);

  // Função para cancelar edição
  const handleCancelEdit = useCallback(() => {
    setEditingEndereco(null);
    setShowAddEndereco(false);
    form.reset();
  }, [form]);

  // Função para buscar CEP
  const buscarCEP = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          form.setValue('logradouro', data.logradouro || '');
          form.setValue('bairro', data.bairro || '');
          form.setValue('cidade', data.localidade || '');
          form.setValue('estado', data.uf || '');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  }, [form]);

  // Filtrar endereços por pesquisa
  const enderecosFiltrados = enderecos.filter(endereco =>
    endereco.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endereco.logradouro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endereco.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endereco.bairro?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginação
  const totalPages = Math.ceil(enderecosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const enderecosPaginados = enderecosFiltrados.slice(startIndex, startIndex + itemsPerPage);

  // Reset da página quando filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium">Endereços</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie seus endereços de entrega e cobrança
          </p>
        </div>
        <Button 
          onClick={() => setShowAddEndereco(true)}
          className="flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Adicionar Endereço
        </Button>
      </div>

      {/* Barra de pesquisa */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Pesquisar endereços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoadingEnderecos && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Carregando endereços...</span>
        </div>
      )}

      {/* Lista de endereços */}
      {!isLoadingEnderecos && (
        <div className="grid gap-4">
          {enderecosPaginados.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? "Nenhum endereço encontrado" : "Nenhum endereço cadastrado"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            enderecosPaginados.map((endereco) => (
              <Card key={endereco.id} className="relative">
                <CardContent className="pt-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{endereco.nome}</h4>
                        {endereco.principal && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          {endereco.tipo === 'residencial' ? (
                            <Home className="w-3 h-3" />
                          ) : endereco.tipo === 'comercial' ? (
                            <Building className="w-3 h-3" />
                          ) : (
                            <Briefcase className="w-3 h-3" />
                          )}
                          <span className="capitalize">{endereco.tipo}</span>
                        </div>
                        <div>
                          {endereco.logradouro}, {endereco.numero}
                          {endereco.complemento && `, ${endereco.complemento}`}
                        </div>
                        <div>
                          {endereco.bairro} - {endereco.cidade}/{endereco.estado}
                        </div>
                        <div>CEP: {endereco.cep}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditEndereco(endereco)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEnderecoToDelete(endereco)}
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
      {showAddEndereco && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingEndereco ? "Editar Endereço" : "Adicionar Novo Endereço"}
            </CardTitle>
            <CardDescription>
              {editingEndereco ? "Atualize as informações do endereço" : "Preencha os dados do novo endereço"}
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
                        <FormLabel>Nome do Endereço *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Casa, Escritório, Loja" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="residencial">Residencial</SelectItem>
                            <SelectItem value="comercial">Comercial</SelectItem>
                            <SelectItem value="industrial">Industrial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP *</FormLabel>
                        <FormControl>
                          <InputMask
                            mask="99999-999"
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(e);
                              buscarCEP(e.target.value);
                            }}
                          >
                            {(inputProps: any) => (
                              <Input {...inputProps} placeholder="00000-000" />
                            )}
                          </InputMask>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="logradouro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logradouro *</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua, Avenida, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número *</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="complemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input placeholder="Apto, Sala, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro *</FormLabel>
                        <FormControl>
                          <Input placeholder="Bairro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade *</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado *</FormLabel>
                        <FormControl>
                          <Input placeholder="SP" maxLength={2} {...field} />
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
                          Endereço Principal
                        </FormLabel>
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
                    {editingEndereco ? "Salvar Alterações" : "Adicionar Endereço"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!enderecoToDelete} onOpenChange={() => setEnderecoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o endereço "{enderecoToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEndereco}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}