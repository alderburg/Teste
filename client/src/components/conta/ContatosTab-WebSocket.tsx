
import { useState, useEffect, useCallback, useMemo } from "react";
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
  const [contatoParaExcluir, setContatoParaExcluir] = useState<ContatoFormValues | null>(null);

  // Estado para controlar a validação de campos
  const [camposContatoValidados, setCamposContatoValidados] = useState({
    nome: true,
    setor: true,
    email: true,
    telefone: true,
    cargo: true
  });

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
  const contatoForm = useForm<ContatoFormValues>({
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

  // Função para verificar se o email é válido
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Função para submeter o formulário
  const handleSaveContato = useCallback(async (formData: ContatoFormValues) => {
    setIsSubmitting(true);
    try {
      // Garantir que o tipo está presente e definido como "comercial"
      const formDataWithTipo = {
        ...formData,
        tipo: "comercial"
      };
      
      // Validação manual dos campos obrigatórios
      const camposValidos = {
        nome: formData.nome.trim() !== '',
        setor: formData.setor.trim() !== '',
        email: isValidEmail(formData.email),
        telefone: formData.telefone.trim() !== '',
        cargo: formData.cargo.trim() !== ''
      };

      setCamposContatoValidados(camposValidos);

      // Verificar se há campos inválidos
      const camposInvalidos = Object.entries(camposValidos)
        .filter(([_, valido]) => !valido)
        .map(([campo, _]) => {
          switch(campo) {
            case 'nome': return 'Nome';
            case 'email': return 'E-mail';
            case 'telefone': return 'Telefone';
            case 'cargo': return 'Cargo';
            case 'setor': return 'Setor';
            default: return campo;
          }
        });

      if (camposInvalidos.length > 0) {
        toast({
          title: "Erro de validação",
          description: `Verifique os seguintes campos: ${camposInvalidos.join(', ')}`,
          variant: "destructive",
        });
        return;
      }
      
      if (editingContato) {
        await updateContato(editingContato.id!, formDataWithTipo);
        setEditingContato(null);
        toast({
          title: "Contato atualizado",
          description: "O contato foi atualizado com sucesso",
          variant: "default",
          className: "bg-white border-gray-200",
        });
      } else {
        await createContato(formDataWithTipo);
        toast({
          title: "Contato adicionado",
          description: "O contato foi adicionado com sucesso",
          variant: "default",
          className: "bg-white border-gray-200",
        });
      }
      
      setShowAddContato(false);
      contatoForm.reset({
        nome: "",
        setor: "comercial",
        cargo: "",
        telefone: "",
        celular: "",
        whatsapp: "",
        email: "",
        principal: false,
        tipo: "comercial"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar contato",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [editingContato, updateContato, createContato, contatoForm, toast]);

  // Função para editar contato
  const handleEditContato = useCallback((contato: ContatoFormValues) => {
    setEditingContato(contato);
    Object.keys(contatoForm.getValues()).forEach((key) => {
      contatoForm.setValue(key as any, contato[key as keyof ContatoFormValues]);
    });
    
    // Resetar estado de validação para não mostrar erros enquanto edita
    setCamposContatoValidados({
      nome: true,
      setor: true,
      email: true,
      telefone: true,
      cargo: true
    });
    
    setShowAddContato(true);
  }, [contatoForm]);

  // Função para confirmar exclusão
  const confirmarExclusaoContato = useCallback(async () => {
    if (contatoParaExcluir && contatoParaExcluir.id) {
      try {
        await deleteContato(contatoParaExcluir.id);
        toast({
          title: "Contato excluído",
          description: "O contato foi excluído com sucesso",
          variant: "default",
          className: "bg-white border-gray-200",
        });
        setContatoParaExcluir(null);
      } catch (error: any) {
        toast({
          title: "Erro ao excluir contato",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  }, [contatoParaExcluir, deleteContato, toast]);

  // Função para lidar com o evento onBlur dos campos de contato
  const handleContatoInputBlur = () => {
    const nome = contatoForm.getValues().nome;
    const setor = contatoForm.getValues().setor;
    const email = contatoForm.getValues().email;
    const telefone = contatoForm.getValues().telefone;
    const cargo = contatoForm.getValues().cargo;
    
    setCamposContatoValidados({
      nome: nome ? nome.trim() !== '' : false,
      setor: setor ? setor.trim() !== '' : false,
      email: isValidEmail(email || ''),
      telefone: telefone ? telefone.trim() !== '' : false,
      cargo: cargo ? cargo.trim() !== '' : false
    });
  };

  // Função para obter a cor do setor
  const getSetorColor = (setor: string) => {
    switch (setor) {
      case "comercial":
        return "bg-blue-100 text-blue-700";
      case "financeiro":
        return "bg-green-100 text-green-700";
      case "operacional":
        return "bg-orange-100 text-orange-700";
      case "administrativo":
        return "bg-purple-100 text-purple-700";
      case "tecnico":
        return "bg-indigo-100 text-indigo-700";
      case "juridico":
        return "bg-red-100 text-red-700";
      case "rh":
        return "bg-pink-100 text-pink-700";
      case "marketing":
        return "bg-yellow-100 text-yellow-700";
      case "vendas":
        return "bg-cyan-100 text-cyan-700";
      case "compras":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Função para filtrar contatos baseado no termo de pesquisa e aplicar paginação
  const { filteredContatos, paginatedContatos, totalPages } = useMemo(() => {
    const filtered = contatos.filter(contato => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        contato.nome?.toLowerCase().includes(searchLower) ||
        contato.setor?.toLowerCase().includes(searchLower) ||
        contato.cargo?.toLowerCase().includes(searchLower) ||
        contato.telefone?.toLowerCase().includes(searchLower) ||
        contato.celular?.toLowerCase().includes(searchLower) ||
        contato.whatsapp?.toLowerCase().includes(searchLower) ||
        contato.email?.toLowerCase().includes(searchLower)
      );
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

    return {
      filteredContatos: filtered,
      paginatedContatos: paginated,
      totalPages
    };
  }, [contatos, searchTerm, currentPage, itemsPerPage]);

  // Reset da página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Meus Contatos</CardTitle>
            <CardDescription>
              Gerencie os contatos associados à sua conta
            </CardDescription>
          </div>
          {!showAddContato && (
            <Button
              onClick={() => {
                setEditingContato(null);
                contatoForm.reset({
                  nome: "",
                  setor: "comercial",
                  cargo: "",
                  telefone: "",
                  celular: "",
                  whatsapp: "",
                  email: "",
                  principal: false,
                  tipo: "comercial"
                });
                setCamposContatoValidados({
                  nome: true,
                  setor: true,
                  email: true,
                  telefone: true,
                  cargo: true
                });
                setShowAddContato(true);
              }}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={isSubmitting}
            >
              <Phone className="mr-2 h-4 w-4" />
              Adicionar Contato
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Campo de pesquisa */}
        {!showAddContato && (
          <div className="mb-6 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar contatos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {showAddContato ? (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {editingContato ? "Editar Contato" : "Novo Contato"}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowAddContato(false);
                  setEditingContato(null);
                  contatoForm.reset();
                  setCamposContatoValidados({
                    nome: true,
                    setor: true,
                    email: true,
                    telefone: true,
                    cargo: true
                  });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <Form {...contatoForm}>
              <form onSubmit={contatoForm.handleSubmit(handleSaveContato)} className="space-y-4">
                <input type="hidden" {...contatoForm.register("tipo")} value="comercial" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={contatoForm.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`${!camposContatoValidados.nome ? 'text-red-500' : ''}`}>
                          Nome Completo: <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Nome completo do contato" 
                            className={`${!camposContatoValidados.nome ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                            onBlur={handleContatoInputBlur}
                            onChange={(e) => {
                              field.onChange(e);
                              setCamposContatoValidados(prev => ({
                                ...prev,
                                nome: e.target.value ? e.target.value.trim() !== '' : false
                              }));
                            }}
                          />
                        </FormControl>
                        {!camposContatoValidados.nome && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Nome não pode estar vazio
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={contatoForm.control}
                    name="setor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`${!camposContatoValidados.setor ? 'text-red-500' : ''}`}>
                          Setor: <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setCamposContatoValidados(prev => ({
                              ...prev,
                              setor: value ? value.trim() !== '' : false
                            }));
                            handleContatoInputBlur();
                          }}
                        >
                          <SelectTrigger className={`${!camposContatoValidados.setor ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}>
                            <SelectValue placeholder="Selecione o setor" />
                          </SelectTrigger>
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
                        {!camposContatoValidados.setor && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Selecione um setor
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={contatoForm.control}
                  name="cargo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`${!camposContatoValidados.cargo ? 'text-red-500' : ''}`}>
                        Cargo/Função: <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Cargo ou função do contato" 
                          className={`${!camposContatoValidados.cargo ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                          onBlur={handleContatoInputBlur}
                          onChange={(e) => {
                            field.onChange(e);
                            setCamposContatoValidados(prev => ({
                              ...prev,
                              cargo: e.target.value ? e.target.value.trim() !== '' : false
                            }));
                          }}
                        />
                      </FormControl>
                      {!camposContatoValidados.cargo && (
                        <p className="mt-1 text-red-300 text-xs flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Cargo não pode estar vazio
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={contatoForm.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`${!camposContatoValidados.telefone ? 'text-red-500' : ''}`}>
                          Telefone: <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <InputMask 
                            mask="(99) 9999-9999"
                            maskChar={null}
                            value={field.value}
                            onBlur={handleContatoInputBlur}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              field.onChange(e);
                              setCamposContatoValidados(prev => ({
                                ...prev,
                                telefone: e.target.value ? e.target.value.trim() !== '' : false
                              }));
                            }}
                          >
                            {(inputProps: any) => (
                              <Input 
                                {...inputProps} 
                                placeholder="(00) 0000-0000" 
                                className={`${!camposContatoValidados.telefone ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                              />
                            )}
                          </InputMask>
                        </FormControl>
                        {!camposContatoValidados.telefone && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Telefone não pode estar vazio
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={contatoForm.control}
                    name="celular"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Celular:</FormLabel>
                        <FormControl>
                          <InputMask 
                            mask="(99) 99999-9999"
                            maskChar={null}
                            value={field.value}
                            onChange={field.onChange}
                          >
                            {(inputProps: any) => (
                              <Input 
                                {...inputProps} 
                                placeholder="(00) 00000-0000" 
                              />
                            )}
                          </InputMask>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={contatoForm.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp:</FormLabel>
                        <FormControl>
                          <InputMask 
                            mask="(99) 99999-9999"
                            maskChar={null}
                            value={field.value}
                            onChange={field.onChange}
                          >
                            {(inputProps: any) => (
                              <Input 
                                {...inputProps} 
                                placeholder="(00) 00000-0000" 
                              />
                            )}
                          </InputMask>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={contatoForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`${!camposContatoValidados.email ? 'text-red-500' : ''}`}>
                          Email: <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="text" 
                            placeholder="email@exemplo.com" 
                            className={`${!camposContatoValidados.email ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                            onBlur={handleContatoInputBlur}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              field.onChange(e);
                              const emailValido = isValidEmail(e.target.value) || e.target.value.trim() === '';
                              setCamposContatoValidados(prev => ({
                                ...prev,
                                email: emailValido
                              }));
                            }}
                          />
                        </FormControl>
                        {!camposContatoValidados.email && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Formato de e-mail inválido
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={contatoForm.control}
                  name="principal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Definir como contato principal
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 mt-6">
                  <Button 
                    type="button" 
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => {
                      setShowAddContato(false);
                      setEditingContato(null);
                      setCamposContatoValidados({
                        nome: true,
                        setor: true,
                        email: true,
                        telefone: true,
                        cargo: true
                      });
                      contatoForm.reset({
                        nome: "",
                        setor: "comercial",
                        cargo: "",
                        telefone: "",
                        celular: "",
                        whatsapp: "",
                        email: "",
                        principal: false,
                        tipo: "comercial"
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-purple-600 animate-spin mr-2"></div>
                        {editingContato ? "Atualizando..." : "Salvando..."}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {editingContato ? "Atualizar Contato" : "Salvar Contato"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : null}

        {!showAddContato && (
          <>
            {isLoadingContatos ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-purple-600 animate-spin mb-2"></div>
                <p className="text-gray-500">Carregando contatos...</p>
              </div>
            ) : paginatedContatos.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Phone className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum contato cadastrado</h3>
                <p className="text-gray-500 mb-4">Adicione seu primeiro contato para facilitar a comunicação.</p>
                <Button 
                  onClick={() => {
                    contatoForm.reset({
                      nome: "",
                      setor: "comercial",
                      cargo: "",
                      telefone: "",
                      celular: "",
                      whatsapp: "",
                      email: "",
                      principal: false,
                      tipo: "comercial"
                    });
                    setCamposContatoValidados({
                      nome: true,
                      setor: true,
                      email: true,
                      telefone: true,
                      cargo: true
                    });
                    setShowAddContato(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Adicionar Contato
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedContatos.map((contato, index) => (
                  <div 
                    key={index} 
                    className={`border rounded-lg p-4 relative ${contato.principal ? 'border-purple-200 bg-purple-50' : 'border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full ${
                          contato.setor === 'comercial' ? 'bg-blue-100' : 
                          contato.setor === 'financeiro' ? 'bg-green-100' : 
                          contato.setor === 'operacional' ? 'bg-orange-100' : 
                          contato.setor === 'administrativo' ? 'bg-purple-100' : 
                          contato.setor === 'tecnico' ? 'bg-indigo-100' : 
                          'bg-gray-100'
                        }`}>
                          <Phone className={`h-5 w-5 ${
                            contato.setor === 'comercial' ? 'text-blue-600' : 
                            contato.setor === 'financeiro' ? 'text-green-600' : 
                            contato.setor === 'operacional' ? 'text-orange-600' : 
                            contato.setor === 'administrativo' ? 'text-purple-600' : 
                            contato.setor === 'tecnico' ? 'text-indigo-600' : 
                            'text-gray-600'
                          }`} />
                        </div>
                        <h3 className="font-medium text-lg ml-2">{contato.nome}</h3>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditContato(contato)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setContatoParaExcluir(contato)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    
                    {contato.cargo && (
                      <div className="text-sm text-gray-800 font-medium mb-2">
                        {contato.cargo}
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-700 mb-3">
                      <div className="flex items-center mb-1">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{contato.telefone}</span>
                      </div>
                      
                      {contato.celular && (
                        <div className="flex items-center mb-1">
                          <Smartphone className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{contato.celular}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{contato.email}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center flex-wrap gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full uppercase font-medium ${getSetorColor(contato.setor)}`}>
                        {contato.setor}
                      </span>
                      
                      {contato.principal && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Principal
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoadingContatos && filteredContatos.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                totalItems={filteredContatos.length}
              />
            )}
          </>
        )}
      </CardContent>

      {/* AlertDialog para confirmação de exclusão */}
      <AlertDialog open={contatoParaExcluir !== null} onOpenChange={(open) => !open && setContatoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contato <span className="font-semibold">{contatoParaExcluir?.nome}</span>?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarExclusaoContato} 
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

export { ContatosTabWebSocket };
