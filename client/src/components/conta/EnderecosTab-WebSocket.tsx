import { useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocketData } from "@/hooks/useWebSocketData";
import { MapPin, PlusCircle, Edit3, Trash2, Save, X, Building, Home, Briefcase, CheckCircle, Loader2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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

// Schema de validação para endereços
const enderecoSchema = z.object({
  tipo: z.enum(["comercial", "residencial", "outro"], {
    required_error: "Selecione um tipo de endereço",
  }),
  cep: z.string().min(8, "CEP deve ter pelo menos 8 caracteres"),
  logradouro: z.string().min(1, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z.string().length(2, "Estado deve ter 2 caracteres"),
  principal: z.boolean().default(false),
});

interface EnderecoFormValues extends z.infer<typeof enderecoSchema> {
  id?: number;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function EnderecosTab() {
  const { user } = useAuth();
  const [showAddEndereco, setShowAddEndereco] = useState(false);
  const [editingEndereco, setEditingEndereco] = useState<EnderecoFormValues | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enderecoParaExcluir, setEnderecoParaExcluir] = useState<EnderecoFormValues | null>(null);

  // Estados para CEP
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepErro, setCepErro] = useState<string | null>(null);

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

  // Form para endereços
  const enderecoForm = useForm<EnderecoFormValues>({
    resolver: zodResolver(enderecoSchema),
    defaultValues: {
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      principal: false,
      tipo: "comercial"
    },
    mode: "onSubmit",
  });

  // Função para consultar CEP
  const consultarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');

    if (cepLimpo.length !== 8) {
      setCepErro('CEP inválido. O CEP deve ter 8 dígitos.');
      return;
    }

    setCepErro(null);

    try {
      setIsLoadingCep(true);
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        setCepErro('CEP não encontrado');
        return;
      }

      enderecoForm.setValue('logradouro', data.logradouro || '');
      enderecoForm.setValue('bairro', data.bairro || '');
      enderecoForm.setValue('cidade', data.localidade || '');
      enderecoForm.setValue('estado', data.uf || '');

      if (!enderecoForm.getValues().numero) {
        setTimeout(() => {
          const numeroInput = document.querySelector('input[name="numero"]');
          if (numeroInput) {
            (numeroInput as HTMLInputElement).focus();
          }
        }, 100);
      }
    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
      setCepErro('Erro ao consultar o CEP. Verifique sua conexão.');
    } finally {
      setIsLoadingCep(false);
    }
  };

  // Função para formatar CEP
  const formatarCep = (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length <= 5) {
      return cepLimpo;
    } else {
      return cepLimpo.slice(0, 5) + '-' + cepLimpo.slice(5, 8);
    }
  };

  // Função para submeter o formulário
  const onSubmit = useCallback(async (data: EnderecoFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingEndereco) {
        await updateEndereco(editingEndereco.id!, data);
        setEditingEndereco(null);
      } else {
        await createEndereco(data);
      }
      setShowAddEndereco(false);
      enderecoForm.reset();
    } catch (error) {
      // Erro já tratado no hook useWebSocketData
    } finally {
      setIsSubmitting(false);
    }
  }, [editingEndereco, updateEndereco, createEndereco, enderecoForm]);

  // Função para confirmar exclusão
  const confirmarExclusaoEndereco = useCallback(async () => {
    if (enderecoParaExcluir) {
      await deleteEndereco(enderecoParaExcluir.id!);
      setEnderecoParaExcluir(null);
    }
  }, [enderecoParaExcluir, deleteEndereco]);

  // Função para editar endereço
  const handleEditEndereco = useCallback((endereco: EnderecoFormValues) => {
    setEditingEndereco(endereco);
    enderecoForm.reset(endereco);
    setShowAddEndereco(true);
  }, [enderecoForm]);

  // Função para cancelar edição
  const handleCancelEdit = useCallback(() => {
    setEditingEndereco(null);
    setShowAddEndereco(false);
    enderecoForm.reset();
  }, [enderecoForm]);

  // Função para definir endereço como principal
  const handleSetPrincipal = useCallback(async (endereco: EnderecoFormValues) => {
    try {
      const response = await fetch(`/api/enderecos/${endereco.id}/principal`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erro ao definir endereço principal: ${response.status}`);
      }

      // O WebSocket irá atualizar automaticamente os dados
    } catch (error) {
      console.error('Erro ao definir endereço principal:', error);
    }
  }, []);

  // Filtrar endereços por pesquisa
  const filteredEnderecos = enderecos.filter(endereco => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      endereco.logradouro?.toLowerCase().includes(searchLower) ||
      endereco.bairro?.toLowerCase().includes(searchLower) ||
      endereco.cidade?.toLowerCase().includes(searchLower) ||
      endereco.tipo?.toLowerCase().includes(searchLower)
    );
  });

  // Paginação
  const totalPages = Math.ceil(filteredEnderecos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEnderecos = filteredEnderecos.slice(startIndex, endIndex);

  if (isLoadingEnderecos) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="ml-2 text-gray-600">Carregando endereços...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium">Endereços</h3>
          <p className="text-sm text-gray-500">Gerencie seus endereços de entrega e cobrança</p>
        </div>
        <Button 
          onClick={() => {
            setEditingEndereco(null);
            enderecoForm.reset({
              cep: "",
              logradouro: "",
              numero: "",
              complemento: "",
              bairro: "",
              cidade: "",
              estado: "",
              principal: false,
              tipo: "comercial"
            });
            setShowAddEndereco(true);
          }}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Adicionar Endereço
        </Button>
      </div>

      {/* Barra de pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Pesquisar endereços..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Formulário de adicionar/editar endereço */}
      {showAddEndereco && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {editingEndereco ? 'Editar Endereço' : 'Adicionar Novo Endereço'}
            </CardTitle>
            <CardDescription>
              {editingEndereco ? 'Atualize as informações do endereço' : 'Preencha os dados do novo endereço'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...enderecoForm}>
              <form onSubmit={enderecoForm.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={enderecoForm.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Endereço</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="comercial">Comercial</SelectItem>
                            <SelectItem value="residencial">Residencial</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={enderecoForm.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <InputMask
                            mask="99999-999"
                            value={field.value}
                            onChange={(e) => {
                              const formattedValue = formatarCep(e.target.value);
                              field.onChange(formattedValue);
                            }}
                            onBlur={() => {
                              if (field.value && field.value.length >= 8) {
                                consultarCep(field.value);
                              }
                            }}
                          >
                            {(inputProps) => (
                              <div className="relative">
                                <Input {...inputProps} placeholder="00000-000" />
                                {isLoadingCep && (
                                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                                )}
                              </div>
                            )}
                          </InputMask>
                        </FormControl>
                        {cepErro && <p className="text-sm text-red-500">{cepErro}</p>}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={enderecoForm.control}
                  name="logradouro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Rua, Avenida, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={enderecoForm.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={enderecoForm.control}
                    name="complemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Apto, Casa, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={enderecoForm.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do bairro" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={enderecoForm.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome da cidade" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={enderecoForm.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="SP" maxLength={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={enderecoForm.control}
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
                          Definir como endereço principal
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {editingEndereco ? 'Atualizar' : 'Salvar'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancelEdit}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Lista de endereços */}
      {paginatedEnderecos.length > 0 ? (
        <div className="grid gap-4">
          {paginatedEnderecos.map((endereco) => (
            <Card key={endereco.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {endereco.tipo === 'comercial' && <Briefcase className="h-4 w-4 text-blue-600" />}
                      {endereco.tipo === 'residencial' && <Home className="h-4 w-4 text-green-600" />}
                      {endereco.tipo === 'outro' && <Building className="h-4 w-4 text-gray-600" />}
                      <span className="font-medium text-sm text-gray-700 capitalize">{endereco.tipo}</span>
                      {endereco.principal && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Principal
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{endereco.logradouro}, {endereco.numero}</p>
                      {endereco.complemento && (
                        <p className="text-sm text-gray-600">{endereco.complemento}</p>
                      )}
                      <p className="text-sm text-gray-600">
                        {endereco.bairro}, {endereco.cidade} - {endereco.estado}
                      </p>
                      <p className="text-sm text-gray-600">CEP: {endereco.cep}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!endereco.principal && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetPrincipal(endereco)}
                        className="text-purple-600 border-purple-600 hover:bg-purple-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Principal
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditEndereco(endereco)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEnderecoParaExcluir(endereco)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum endereço encontrado</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Nenhum endereço corresponde à sua pesquisa' : 'Você ainda não cadastrou nenhum endereço'}
            </p>
            {!searchTerm && (
              <Button 
                onClick={() => setShowAddEndereco(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Adicionar Primeiro Endereço
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Paginação */}
      {filteredEnderecos.length > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          totalItems={filteredEnderecos.length}
        />
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!enderecoParaExcluir} onOpenChange={() => setEnderecoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este endereço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusaoEndereco}
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