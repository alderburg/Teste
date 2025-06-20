import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Plus, Edit2, Trash2, Star, Search, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Pagination } from '@/components/Pagination';
import { useWebSocketData } from "@/hooks/useWebSocketData";

// Schema para validação de endereços
const enderecoSchema = z.object({
  cep: z.string().min(8, "CEP deve ter 8 dígitos").regex(/^[0-9]{8}$/, "CEP deve conter apenas números"),
  logradouro: z.string().min(5, "Logradouro deve ter pelo menos 5 caracteres"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(2, "Bairro deve ter pelo menos 2 caracteres"),
  cidade: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
  estado: z.string().min(2, "Estado deve ter pelo menos 2 caracteres"),
  tipo: z.enum(["residencial", "comercial"]),
  principal: z.boolean().default(false),
});

interface EnderecoFormValues extends z.infer<typeof enderecoSchema> {
  id?: number;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function EnderecosTab() {
  const { toast } = useToast();
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

  // Estado para controlar quais botões estão desabilitados durante operações
  const [disabledButtons, setDisabledButtons] = useState<{[key: number]: boolean}>({});

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
      tipo: "comercial",
      principal: false
    },
    mode: "onSubmit",
  });

  // Função para buscar CEP
  const buscarCep = async (cep: string) => {
    if (cep.length !== 8) return;
    
    setIsLoadingCep(true);
    setCepErro(null);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        setCepErro("CEP não encontrado");
        return;
      }
      
      enderecoForm.setValue("logradouro", data.logradouro || "");
      enderecoForm.setValue("bairro", data.bairro || "");
      enderecoForm.setValue("cidade", data.localidade || "");
      enderecoForm.setValue("estado", data.uf || "");
    } catch (error) {
      setCepErro("Erro ao buscar CEP");
    } finally {
      setIsLoadingCep(false);
    }
  };

  // Função para salvar endereço
  const handleSaveEndereco = async (formData: EnderecoFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (editingEndereco && editingEndereco.id) {
        await updateEndereco(editingEndereco.id, formData);
      } else {
        await createEndereco(formData);
      }
      
      setShowAddEndereco(false);
      setEditingEndereco(null);
      enderecoForm.reset();
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para editar endereço
  const handleEditEndereco = (endereco: EnderecoFormValues) => {
    setEditingEndereco(endereco);
    enderecoForm.reset(endereco);
    setShowAddEndereco(true);
  };

  // Função para confirmar exclusão
  const confirmarExclusaoEndereco = async () => {
    if (enderecoParaExcluir?.id) {
      await deleteEndereco(enderecoParaExcluir.id);
      setEnderecoParaExcluir(null);
    }
  };

  // Função para definir como principal
  const handleSetPrincipal = async (endereco: EnderecoFormValues) => {
    if (!endereco.id) return;
    
    setDisabledButtons(prev => ({ ...prev, [endereco.id!]: true }));
    
    try {
      const response = await fetch(`/api/enderecos/${endereco.id}/principal`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao definir endereço principal');
      }
      
      toast({
        title: "Endereço principal definido",
        description: "O endereço foi definido como principal com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao definir endereço como principal",
        variant: "destructive"
      });
    } finally {
      setDisabledButtons(prev => ({ ...prev, [endereco.id!]: false }));
    }
  };

  // Filtrar endereços
  const filteredEnderecos = enderecos.filter(endereco =>
    endereco.logradouro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endereco.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endereco.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginação
  const totalPages = Math.ceil(filteredEnderecos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEnderecos = filteredEnderecos.slice(startIndex, startIndex + itemsPerPage);

  // Reset da página quando pesquisa ou itens por página mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Meus Endereços</CardTitle>
            <CardDescription>
              Gerencie os endereços associados à sua conta
            </CardDescription>
          </div>
          {!showAddEndereco && (
            <Button
              onClick={() => {
                setEditingEndereco(null);
                enderecoForm.reset();
                setShowAddEndereco(true);
              }}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={isSubmitting}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Endereço
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {showAddEndereco ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                {editingEndereco ? "Editar Endereço" : "Adicionar Endereço"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddEndereco(false);
                  setEditingEndereco(null);
                  enderecoForm.reset();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Form {...enderecoForm}>
              <form onSubmit={enderecoForm.handleSubmit(handleSaveEndereco)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={enderecoForm.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="residencial">Residencial</SelectItem>
                            <SelectItem value="comercial">Comercial</SelectItem>
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
                          <Input
                            {...field}
                            placeholder="00000000"
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              field.onChange(value);
                              if (value.length === 8) {
                                buscarCep(value);
                              }
                            }}
                            disabled={isLoadingCep}
                          />
                        </FormControl>
                        {cepErro && <p className="text-sm text-red-600">{cepErro}</p>}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
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
                  </div>

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
                </div>

                <FormField
                  control={enderecoForm.control}
                  name="complemento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento (opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Apartamento, bloco, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={enderecoForm.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Centro" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={enderecoForm.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="São Paulo" />
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
                          <Input {...field} placeholder="SP" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <FormField
                    control={enderecoForm.control}
                    name="principal"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Definir como endereço principal
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddEndereco(false);
                      setEditingEndereco(null);
                      enderecoForm.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Salvando..." : "Salvar Endereço"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : (
          <>
            {/* Barra de pesquisa */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Pesquisar por logradouro, bairro ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoadingEnderecos ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-purple-600 animate-spin mb-2"></div>
                <p className="text-gray-500">Carregando endereços...</p>
              </div>
            ) : filteredEnderecos.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <MapPin className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  {searchTerm ? "Nenhum endereço encontrado" : "Nenhum endereço cadastrado"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? "Tente refinar sua pesquisa" : "Adicione seu primeiro endereço"}
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setShowAddEndereco(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Endereço
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {paginatedEnderecos.map((endereco) => (
                  <div key={endereco.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={endereco.tipo === 'residencial' ? 'default' : 'secondary'}>
                            {endereco.tipo}
                          </Badge>
                          {endereco.principal && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              <Star className="h-3 w-3 mr-1 fill-current" />
                              Principal
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {endereco.logradouro}, {endereco.numero}
                            {endereco.complemento && `, ${endereco.complemento}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {endereco.bairro}, {endereco.cidade} - {endereco.estado}
                          </p>
                          <p className="text-sm text-gray-600">
                            CEP: {endereco.cep?.replace(/(\d{5})(\d{3})/, '$1-$2')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!endereco.principal && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetPrincipal(endereco)}
                            disabled={disabledButtons[endereco.id!]}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEndereco(endereco)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEnderecoParaExcluir(endereco)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoadingEnderecos && filteredEnderecos.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                totalItems={filteredEnderecos.length}
              />
            )}
          </>
        )}
      </CardContent>

      {/* AlertDialog para confirmação de exclusão */}
      <AlertDialog open={enderecoParaExcluir !== null} onOpenChange={(open) => !open && setEnderecoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o endereço <span className="font-semibold">{enderecoParaExcluir?.logradouro}</span>?
              <br />
              Esta ação não pode ser desfeita.
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
    </Card>
  );
}