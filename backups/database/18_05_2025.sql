PGDMP  3    +    	            }            meuprecocerto    15.6    17.4 �    p           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                           false            q           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                           false            r           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                           false            s           1262    350261    meuprecocerto    DATABASE     y   CREATE DATABASE meuprecocerto WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.UTF-8';
    DROP DATABASE meuprecocerto;
                     meuprecocerto    false            t           0    0    SCHEMA public    ACL     y   REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;
                        pg_database_owner    false    5            �           1247    671046    categoria_tipo    TYPE     h   CREATE TYPE public.categoria_tipo AS ENUM (
    'produto',
    'servico',
    'despesa',
    'custo'
);
 !   DROP TYPE public.categoria_tipo;
       public               meuprecocerto    false            �           1247    671016 
   custo_tipo    TYPE     t   CREATE TYPE public.custo_tipo AS ENUM (
    'novo',
    'usado',
    'aluguel',
    'servico',
    'marketplace'
);
    DROP TYPE public.custo_tipo;
       public               meuprecocerto    false            �           1247    671028    despesa_tipo    TYPE     H   CREATE TYPE public.despesa_tipo AS ENUM (
    'fixa',
    'variavel'
);
    DROP TYPE public.despesa_tipo;
       public               meuprecocerto    false            �           1247    671034    forma_pagamento    TYPE     �   CREATE TYPE public.forma_pagamento AS ENUM (
    'a_vista',
    'cartao_credito',
    'boleto',
    'pix',
    'transferencia'
);
 "   DROP TYPE public.forma_pagamento;
       public               meuprecocerto    false            �           1247    671011    produto_tipo    TYPE     E   CREATE TYPE public.produto_tipo AS ENUM (
    'novo',
    'usado'
);
    DROP TYPE public.produto_tipo;
       public               meuprecocerto    false            �            1259    670988    activity_logs    TABLE     l  CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    tipo_operacao text NOT NULL,
    entidade text NOT NULL,
    entidade_id integer,
    descricao text NOT NULL,
    detalhes json,
    ip_address text,
    user_agent text,
    created_at timestamp without time zone DEFAULT now(),
    user_type character varying(20)
);
 !   DROP TABLE public.activity_logs;
       public         heap r       meuprecocerto    false            �            1259    670987    activity_logs_id_seq    SEQUENCE     �   CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 +   DROP SEQUENCE public.activity_logs_id_seq;
       public               meuprecocerto    false    219            u           0    0    activity_logs_id_seq    SEQUENCE OWNED BY     M   ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;
          public               meuprecocerto    false    218                       1259    705059 %   additional_user_password_reset_tokens    TABLE     *  CREATE TABLE public.additional_user_password_reset_tokens (
    id integer NOT NULL,
    token text NOT NULL,
    usuario_adicional_id integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);
 9   DROP TABLE public.additional_user_password_reset_tokens;
       public         heap r       meuprecocerto    false                       1259    705058 ,   additional_user_password_reset_tokens_id_seq    SEQUENCE     �   CREATE SEQUENCE public.additional_user_password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 C   DROP SEQUENCE public.additional_user_password_reset_tokens_id_seq;
       public               meuprecocerto    false    260            v           0    0 ,   additional_user_password_reset_tokens_id_seq    SEQUENCE OWNED BY     }   ALTER SEQUENCE public.additional_user_password_reset_tokens_id_seq OWNED BY public.additional_user_password_reset_tokens.id;
          public               meuprecocerto    false    259            �            1259    672047    assinaturas    TABLE     �  CREATE TABLE public.assinaturas (
    id integer NOT NULL,
    user_id integer NOT NULL,
    plano_id integer NOT NULL,
    stripe_subscription_id text,
    data_inicio timestamp without time zone DEFAULT now() NOT NULL,
    data_fim timestamp without time zone,
    status text DEFAULT 'ativa'::text NOT NULL,
    tipo_cobranca text NOT NULL,
    valor_pago numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    plano text
);
    DROP TABLE public.assinaturas;
       public         heap r       meuprecocerto    false            �            1259    672046    assinaturas_id_seq    SEQUENCE     �   CREATE SEQUENCE public.assinaturas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public.assinaturas_id_seq;
       public               meuprecocerto    false    248            w           0    0    assinaturas_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public.assinaturas_id_seq OWNED BY public.assinaturas.id;
          public               meuprecocerto    false    247            �            1259    671168 
   categorias    TABLE     M  CREATE TABLE public.categorias (
    id integer NOT NULL,
    nome text NOT NULL,
    descricao text,
    tipo public.categoria_tipo NOT NULL,
    ordem integer,
    ativa boolean DEFAULT true,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
    DROP TABLE public.categorias;
       public         heap r       meuprecocerto    false    911            �            1259    671167    categorias_id_seq    SEQUENCE     �   CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 (   DROP SEQUENCE public.categorias_id_seq;
       public               meuprecocerto    false    236            x           0    0    categorias_id_seq    SEQUENCE OWNED BY     G   ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;
          public               meuprecocerto    false    235            �            1259    671313    contatos    TABLE     �  CREATE TABLE public.contatos (
    id integer NOT NULL,
    user_id integer NOT NULL,
    nome text NOT NULL,
    tipo text NOT NULL,
    setor text DEFAULT 'comercial'::text,
    cargo text NOT NULL,
    telefone text NOT NULL,
    celular text,
    whatsapp text,
    email text NOT NULL,
    principal boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
    DROP TABLE public.contatos;
       public         heap r       meuprecocerto    false            �            1259    671312    contatos_id_seq    SEQUENCE     �   CREATE SEQUENCE public.contatos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public.contatos_id_seq;
       public               meuprecocerto    false    242            y           0    0    contatos_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public.contatos_id_seq OWNED BY public.contatos.id;
          public               meuprecocerto    false    241            �            1259    671104    custos    TABLE     5  CREATE TABLE public.custos (
    id integer NOT NULL,
    descricao text NOT NULL,
    valor numeric NOT NULL,
    tipo public.custo_tipo NOT NULL,
    observacoes text,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
    DROP TABLE public.custos;
       public         heap r       meuprecocerto    false    902            �            1259    671103    custos_id_seq    SEQUENCE     �   CREATE SEQUENCE public.custos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 $   DROP SEQUENCE public.custos_id_seq;
       public               meuprecocerto    false    228            z           0    0    custos_id_seq    SEQUENCE OWNED BY     ?   ALTER SEQUENCE public.custos_id_seq OWNED BY public.custos.id;
          public               meuprecocerto    false    227            �            1259    671120    despesas    TABLE     �  CREATE TABLE public.despesas (
    id integer NOT NULL,
    descricao text NOT NULL,
    valor numeric NOT NULL,
    tipo public.despesa_tipo NOT NULL,
    categoria public.custo_tipo NOT NULL,
    ocorrencia_meses integer,
    observacoes text,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
    DROP TABLE public.despesas;
       public         heap r       meuprecocerto    false    902    905            �            1259    671119    despesas_id_seq    SEQUENCE     �   CREATE SEQUENCE public.despesas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public.despesas_id_seq;
       public               meuprecocerto    false    230            {           0    0    despesas_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public.despesas_id_seq OWNED BY public.despesas.id;
          public               meuprecocerto    false    229            �            1259    677166    email_verification_tokens    TABLE     &  CREATE TABLE public.email_verification_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL
);
 -   DROP TABLE public.email_verification_tokens;
       public         heap r       meuprecocerto    false            �            1259    677165     email_verification_tokens_id_seq    SEQUENCE     �   CREATE SEQUENCE public.email_verification_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 7   DROP SEQUENCE public.email_verification_tokens_id_seq;
       public               meuprecocerto    false    254            |           0    0     email_verification_tokens_id_seq    SEQUENCE OWNED BY     e   ALTER SEQUENCE public.email_verification_tokens_id_seq OWNED BY public.email_verification_tokens.id;
          public               meuprecocerto    false    253            �            1259    671295 	   enderecos    TABLE     �  CREATE TABLE public.enderecos (
    id integer NOT NULL,
    user_id integer NOT NULL,
    tipo text NOT NULL,
    cep text NOT NULL,
    logradouro text NOT NULL,
    numero text NOT NULL,
    complemento text,
    bairro text NOT NULL,
    cidade text NOT NULL,
    estado text NOT NULL,
    principal boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
    DROP TABLE public.enderecos;
       public         heap r       meuprecocerto    false            �            1259    671294    enderecos_id_seq    SEQUENCE     �   CREATE SEQUENCE public.enderecos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 '   DROP SEQUENCE public.enderecos_id_seq;
       public               meuprecocerto    false    240            }           0    0    enderecos_id_seq    SEQUENCE OWNED BY     E   ALTER SEQUENCE public.enderecos_id_seq OWNED BY public.enderecos.id;
          public               meuprecocerto    false    239            �            1259    671088    itens_aluguel    TABLE     `  CREATE TABLE public.itens_aluguel (
    id integer NOT NULL,
    nome text NOT NULL,
    descricao text,
    valor_equipamento numeric NOT NULL,
    frete numeric,
    retorno_investimento_meses integer NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
 !   DROP TABLE public.itens_aluguel;
       public         heap r       meuprecocerto    false            �            1259    671087    itens_aluguel_id_seq    SEQUENCE     �   CREATE SEQUENCE public.itens_aluguel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 +   DROP SEQUENCE public.itens_aluguel_id_seq;
       public               meuprecocerto    false    226            ~           0    0    itens_aluguel_id_seq    SEQUENCE OWNED BY     M   ALTER SEQUENCE public.itens_aluguel_id_seq OWNED BY public.itens_aluguel.id;
          public               meuprecocerto    false    225                       1259    686946 
   pagamentos    TABLE     e  CREATE TABLE public.pagamentos (
    id integer NOT NULL,
    user_id integer NOT NULL,
    assinatura_id integer,
    stripe_payment_intent_id text,
    stripe_invoice_id text,
    valor numeric(10,2) NOT NULL,
    status character varying(50) NOT NULL,
    plano_nome character varying(100),
    metodo_pagamento character varying(50),
    fatura_url text,
    data_pagamento timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    periodo character varying(20),
    valor_cartao numeric(10,2) DEFAULT 0,
    valor_credito numeric(10,2) DEFAULT 0,
    stripe_customer_id character varying(255),
    stripe_subscription_id character varying(255),
    valor_diferenca numeric(10,2),
    credito_gerado numeric(10,2),
    creditos_conta numeric(10,2)
);
    DROP TABLE public.pagamentos;
       public         heap r       meuprecocerto    false                       1259    686945    pagamentos_id_seq    SEQUENCE     �   CREATE SEQUENCE public.pagamentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 (   DROP SEQUENCE public.pagamentos_id_seq;
       public               meuprecocerto    false    258                       0    0    pagamentos_id_seq    SEQUENCE OWNED BY     G   ALTER SEQUENCE public.pagamentos_id_seq OWNED BY public.pagamentos.id;
          public               meuprecocerto    false    257                        1259    677591    password_reset_tokens    TABLE     "  CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL
);
 )   DROP TABLE public.password_reset_tokens;
       public         heap r       meuprecocerto    false            �            1259    677590    password_reset_tokens_id_seq    SEQUENCE     �   CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 3   DROP SEQUENCE public.password_reset_tokens_id_seq;
       public               meuprecocerto    false    256            �           0    0    password_reset_tokens_id_seq    SEQUENCE OWNED BY     ]   ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;
          public               meuprecocerto    false    255            �            1259    671903    payment_methods    TABLE     �  CREATE TABLE public.payment_methods (
    id integer NOT NULL,
    user_id integer NOT NULL,
    stripe_payment_method_id text NOT NULL,
    brand text NOT NULL,
    last4 text NOT NULL,
    exp_month integer NOT NULL,
    exp_year integer NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    stripe_customer_id text
);
 #   DROP TABLE public.payment_methods;
       public         heap r       meuprecocerto    false            �            1259    671902    payment_methods_id_seq    SEQUENCE     �   CREATE SEQUENCE public.payment_methods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 -   DROP SEQUENCE public.payment_methods_id_seq;
       public               meuprecocerto    false    246            �           0    0    payment_methods_id_seq    SEQUENCE OWNED BY     Q   ALTER SEQUENCE public.payment_methods_id_seq OWNED BY public.payment_methods.id;
          public               meuprecocerto    false    245            �            1259    672094    planos    TABLE     w  CREATE TABLE public.planos (
    id integer NOT NULL,
    nome text NOT NULL,
    descricao text,
    valor_mensal numeric NOT NULL,
    valor_anual numeric NOT NULL,
    economia_anual numeric NOT NULL,
    valor_anual_total numeric NOT NULL,
    ordem integer NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    dashboard boolean DEFAULT false NOT NULL,
    precificacao boolean DEFAULT false NOT NULL,
    precificacao_unitaria boolean DEFAULT false NOT NULL,
    gerenciamento_taxas boolean DEFAULT false NOT NULL,
    gerenciamento_tributacao boolean DEFAULT false NOT NULL,
    integracao_marketplaces boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    limite_produtos integer,
    limite_usuarios integer,
    central_treinamento text DEFAULT ''::text NOT NULL,
    suporte text DEFAULT ''::text NOT NULL,
    relatorios_personalizados text DEFAULT ''::text NOT NULL,
    importacao text DEFAULT 'X'::text NOT NULL,
    cadastro_clientes integer DEFAULT 0 NOT NULL,
    gerenciamento_custos text DEFAULT 'Parcial'::text NOT NULL
);
    DROP TABLE public.planos;
       public         heap r       meuprecocerto    false            �            1259    672093    planos_temp_id_seq    SEQUENCE     �   CREATE SEQUENCE public.planos_temp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public.planos_temp_id_seq;
       public               meuprecocerto    false    250            �           0    0    planos_temp_id_seq    SEQUENCE OWNED BY     D   ALTER SEQUENCE public.planos_temp_id_seq OWNED BY public.planos.id;
          public               meuprecocerto    false    249            �            1259    671185    precificacoes    TABLE       CREATE TABLE public.precificacoes (
    id integer NOT NULL,
    nome text NOT NULL,
    tipo public.custo_tipo NOT NULL,
    reference_id integer,
    valor_custo numeric NOT NULL,
    frete numeric,
    lucro numeric NOT NULL,
    forma_pagamento public.forma_pagamento NOT NULL,
    parcelas integer,
    deslocamento numeric,
    valor_venda numeric NOT NULL,
    lucro_bruto numeric NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
 !   DROP TABLE public.precificacoes;
       public         heap r       meuprecocerto    false    902    908            �            1259    671184    precificacoes_id_seq    SEQUENCE     �   CREATE SEQUENCE public.precificacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 +   DROP SEQUENCE public.precificacoes_id_seq;
       public               meuprecocerto    false    238            �           0    0    precificacoes_id_seq    SEQUENCE OWNED BY     M   ALTER SEQUENCE public.precificacoes_id_seq OWNED BY public.precificacoes.id;
          public               meuprecocerto    false    237            �            1259    671056    produtos    TABLE     \  CREATE TABLE public.produtos (
    id integer NOT NULL,
    nome text NOT NULL,
    descricao text,
    codigo text,
    tipo public.produto_tipo NOT NULL,
    valor_custo numeric NOT NULL,
    frete numeric,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
    DROP TABLE public.produtos;
       public         heap r       meuprecocerto    false    899            �            1259    671055    produtos_id_seq    SEQUENCE     �   CREATE SEQUENCE public.produtos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public.produtos_id_seq;
       public               meuprecocerto    false    222            �           0    0    produtos_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public.produtos_id_seq OWNED BY public.produtos.id;
          public               meuprecocerto    false    221            �            1259    671072    servicos    TABLE       CREATE TABLE public.servicos (
    id integer NOT NULL,
    nome text NOT NULL,
    descricao text,
    valor_custo numeric NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
    DROP TABLE public.servicos;
       public         heap r       meuprecocerto    false            �            1259    671071    servicos_id_seq    SEQUENCE     �   CREATE SEQUENCE public.servicos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public.servicos_id_seq;
       public               meuprecocerto    false    224            �           0    0    servicos_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public.servicos_id_seq OWNED BY public.servicos.id;
          public               meuprecocerto    false    223            �            1259    671002    session    TABLE     �   CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);
    DROP TABLE public.session;
       public         heap r       meuprecocerto    false            �            1259    672135    stripe_customers    TABLE     +  CREATE TABLE public.stripe_customers (
    id integer NOT NULL,
    user_id integer NOT NULL,
    stripe_customer_id text NOT NULL,
    email text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
 $   DROP TABLE public.stripe_customers;
       public         heap r       meuprecocerto    false            �            1259    672134    stripe_customers_id_seq    SEQUENCE     �   CREATE SEQUENCE public.stripe_customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 .   DROP SEQUENCE public.stripe_customers_id_seq;
       public               meuprecocerto    false    252            �           0    0    stripe_customers_id_seq    SEQUENCE OWNED BY     S   ALTER SEQUENCE public.stripe_customers_id_seq OWNED BY public.stripe_customers.id;
          public               meuprecocerto    false    251            �            1259    671136    taxas    TABLE        CREATE TABLE public.taxas (
    id integer NOT NULL,
    nome text NOT NULL,
    descricao text,
    valor numeric NOT NULL,
    tipo text NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
    DROP TABLE public.taxas;
       public         heap r       meuprecocerto    false            �            1259    671135    taxas_id_seq    SEQUENCE     �   CREATE SEQUENCE public.taxas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public.taxas_id_seq;
       public               meuprecocerto    false    232            �           0    0    taxas_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public.taxas_id_seq OWNED BY public.taxas.id;
          public               meuprecocerto    false    231            �            1259    671152    tributos    TABLE     !  CREATE TABLE public.tributos (
    id integer NOT NULL,
    nome text NOT NULL,
    sigla text,
    porcentagem numeric NOT NULL,
    descricao text,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
    DROP TABLE public.tributos;
       public         heap r       meuprecocerto    false            �            1259    671151    tributos_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tributos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public.tributos_id_seq;
       public               meuprecocerto    false    234            �           0    0    tributos_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public.tributos_id_seq OWNED BY public.tributos.id;
          public               meuprecocerto    false    233            �            1259    670970    user_profiles    TABLE     �  CREATE TABLE public.user_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    primeiro_nome text,
    ultimo_nome text,
    razao_social text,
    cpf_cnpj text,
    logo_url text,
    configuracoes json,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    nome_fantasia text,
    tipo_pessoa text DEFAULT 'fisica'::text,
    inscricao_estadual text,
    inscricao_municipal text,
    cnae text,
    regime_tributario text,
    atividade_principal text,
    responsavel_nome text,
    responsavel_email text,
    responsavel_telefone text,
    responsavel_setor text,
    contador_nome text,
    contador_email text,
    contador_telefone text
);
 !   DROP TABLE public.user_profiles;
       public         heap r       meuprecocerto    false            �            1259    670969    user_profiles_id_seq    SEQUENCE     �   CREATE SEQUENCE public.user_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 +   DROP SEQUENCE public.user_profiles_id_seq;
       public               meuprecocerto    false    217            �           0    0    user_profiles_id_seq    SEQUENCE OWNED BY     M   ALTER SEQUENCE public.user_profiles_id_seq OWNED BY public.user_profiles.id;
          public               meuprecocerto    false    216                       1259    705183    user_sessions    TABLE     �  CREATE TABLE public.user_sessions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token text NOT NULL,
    device_info text,
    browser text,
    ip text,
    location text,
    last_activity timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
 !   DROP TABLE public.user_sessions;
       public         heap r       meuprecocerto    false                       1259    705111    user_sessions_additional    TABLE       CREATE TABLE public.user_sessions_additional (
    id integer NOT NULL,
    user_id integer NOT NULL,
    user_type character varying(20) DEFAULT 'main'::character varying NOT NULL,
    token character varying(255) NOT NULL,
    device_info text,
    browser character varying(255),
    ip character varying(45),
    location character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_activity timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone NOT NULL,
    is_active boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_user_type CHECK (((user_type)::text = ANY ((ARRAY['main'::character varying, 'additional'::character varying])::text[])))
);
 ,   DROP TABLE public.user_sessions_additional;
       public         heap r       meuprecocerto    false                       1259    705110    user_sessions_additional_id_seq    SEQUENCE     �   CREATE SEQUENCE public.user_sessions_additional_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 6   DROP SEQUENCE public.user_sessions_additional_id_seq;
       public               meuprecocerto    false    262            �           0    0    user_sessions_additional_id_seq    SEQUENCE OWNED BY     c   ALTER SEQUENCE public.user_sessions_additional_id_seq OWNED BY public.user_sessions_additional.id;
          public               meuprecocerto    false    261                       1259    705182    user_sessions_id_seq    SEQUENCE     �   CREATE SEQUENCE public.user_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 +   DROP SEQUENCE public.user_sessions_id_seq;
       public               meuprecocerto    false    264            �           0    0    user_sessions_id_seq    SEQUENCE OWNED BY     M   ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;
          public               meuprecocerto    false    263            �            1259    670953    users    TABLE     t  CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    stripe_customer_id text,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    two_factor_secret text,
    last_password_change timestamp without time zone,
    email_verified boolean DEFAULT false NOT NULL,
    stripe_plan_id text
);
    DROP TABLE public.users;
       public         heap r       meuprecocerto    false            �            1259    670952    users_id_seq    SEQUENCE     �   CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public.users_id_seq;
       public               meuprecocerto    false    215            �           0    0    users_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
          public               meuprecocerto    false    214            �            1259    671331    usuarios_adicionais    TABLE     �  CREATE TABLE public.usuarios_adicionais (
    id integer NOT NULL,
    user_id integer NOT NULL,
    nome text NOT NULL,
    email text NOT NULL,
    perfil text NOT NULL,
    status text DEFAULT 'ativo'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    setor text DEFAULT 'comercial'::text NOT NULL,
    two_factor_enabled boolean DEFAULT false,
    two_factor_secret text,
    last_login timestamp without time zone,
    last_password_change timestamp without time zone,
    email_verified boolean DEFAULT false,
    role text DEFAULT 'user'::text,
    password text
);
 '   DROP TABLE public.usuarios_adicionais;
       public         heap r       meuprecocerto    false            �            1259    671330    usuarios_adicionais_id_seq    SEQUENCE     �   CREATE SEQUENCE public.usuarios_adicionais_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 1   DROP SEQUENCE public.usuarios_adicionais_id_seq;
       public               meuprecocerto    false    244            �           0    0    usuarios_adicionais_id_seq    SEQUENCE OWNED BY     Y   ALTER SEQUENCE public.usuarios_adicionais_id_seq OWNED BY public.usuarios_adicionais.id;
          public               meuprecocerto    false    243            �           2604    670991    activity_logs id    DEFAULT     t   ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);
 ?   ALTER TABLE public.activity_logs ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    218    219    219            .           2604    705062 (   additional_user_password_reset_tokens id    DEFAULT     �   ALTER TABLE ONLY public.additional_user_password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.additional_user_password_reset_tokens_id_seq'::regclass);
 W   ALTER TABLE public.additional_user_password_reset_tokens ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    260    259    260            
           2604    672050    assinaturas id    DEFAULT     p   ALTER TABLE ONLY public.assinaturas ALTER COLUMN id SET DEFAULT nextval('public.assinaturas_id_seq'::regclass);
 =   ALTER TABLE public.assinaturas ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    248    247    248            �           2604    671171    categorias id    DEFAULT     n   ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);
 <   ALTER TABLE public.categorias ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    235    236    236            �           2604    671316    contatos id    DEFAULT     j   ALTER TABLE ONLY public.contatos ALTER COLUMN id SET DEFAULT nextval('public.contatos_id_seq'::regclass);
 :   ALTER TABLE public.contatos ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    242    241    242            �           2604    671107 	   custos id    DEFAULT     f   ALTER TABLE ONLY public.custos ALTER COLUMN id SET DEFAULT nextval('public.custos_id_seq'::regclass);
 8   ALTER TABLE public.custos ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    228    227    228            �           2604    671123    despesas id    DEFAULT     j   ALTER TABLE ONLY public.despesas ALTER COLUMN id SET DEFAULT nextval('public.despesas_id_seq'::regclass);
 :   ALTER TABLE public.despesas ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    229    230    230            "           2604    677169    email_verification_tokens id    DEFAULT     �   ALTER TABLE ONLY public.email_verification_tokens ALTER COLUMN id SET DEFAULT nextval('public.email_verification_tokens_id_seq'::regclass);
 K   ALTER TABLE public.email_verification_tokens ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    253    254    254            �           2604    671298    enderecos id    DEFAULT     l   ALTER TABLE ONLY public.enderecos ALTER COLUMN id SET DEFAULT nextval('public.enderecos_id_seq'::regclass);
 ;   ALTER TABLE public.enderecos ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    239    240    240            �           2604    671091    itens_aluguel id    DEFAULT     t   ALTER TABLE ONLY public.itens_aluguel ALTER COLUMN id SET DEFAULT nextval('public.itens_aluguel_id_seq'::regclass);
 ?   ALTER TABLE public.itens_aluguel ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    225    226    226            (           2604    686949    pagamentos id    DEFAULT     n   ALTER TABLE ONLY public.pagamentos ALTER COLUMN id SET DEFAULT nextval('public.pagamentos_id_seq'::regclass);
 <   ALTER TABLE public.pagamentos ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    258    257    258            %           2604    677594    password_reset_tokens id    DEFAULT     �   ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);
 G   ALTER TABLE public.password_reset_tokens ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    255    256    256                       2604    671906    payment_methods id    DEFAULT     x   ALTER TABLE ONLY public.payment_methods ALTER COLUMN id SET DEFAULT nextval('public.payment_methods_id_seq'::regclass);
 A   ALTER TABLE public.payment_methods ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    246    245    246                       2604    672097 	   planos id    DEFAULT     k   ALTER TABLE ONLY public.planos ALTER COLUMN id SET DEFAULT nextval('public.planos_temp_id_seq'::regclass);
 8   ALTER TABLE public.planos ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    250    249    250            �           2604    671188    precificacoes id    DEFAULT     t   ALTER TABLE ONLY public.precificacoes ALTER COLUMN id SET DEFAULT nextval('public.precificacoes_id_seq'::regclass);
 ?   ALTER TABLE public.precificacoes ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    237    238    238            �           2604    671059    produtos id    DEFAULT     j   ALTER TABLE ONLY public.produtos ALTER COLUMN id SET DEFAULT nextval('public.produtos_id_seq'::regclass);
 :   ALTER TABLE public.produtos ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    221    222    222            �           2604    671075    servicos id    DEFAULT     j   ALTER TABLE ONLY public.servicos ALTER COLUMN id SET DEFAULT nextval('public.servicos_id_seq'::regclass);
 :   ALTER TABLE public.servicos ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    223    224    224                       2604    672138    stripe_customers id    DEFAULT     z   ALTER TABLE ONLY public.stripe_customers ALTER COLUMN id SET DEFAULT nextval('public.stripe_customers_id_seq'::regclass);
 B   ALTER TABLE public.stripe_customers ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    252    251    252            �           2604    671139    taxas id    DEFAULT     d   ALTER TABLE ONLY public.taxas ALTER COLUMN id SET DEFAULT nextval('public.taxas_id_seq'::regclass);
 7   ALTER TABLE public.taxas ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    231    232    232            �           2604    671155    tributos id    DEFAULT     j   ALTER TABLE ONLY public.tributos ALTER COLUMN id SET DEFAULT nextval('public.tributos_id_seq'::regclass);
 :   ALTER TABLE public.tributos ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    233    234    234            �           2604    670973    user_profiles id    DEFAULT     t   ALTER TABLE ONLY public.user_profiles ALTER COLUMN id SET DEFAULT nextval('public.user_profiles_id_seq'::regclass);
 ?   ALTER TABLE public.user_profiles ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    217    216    217            7           2604    705186    user_sessions id    DEFAULT     t   ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);
 ?   ALTER TABLE public.user_sessions ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    264    263    264            1           2604    705114    user_sessions_additional id    DEFAULT     �   ALTER TABLE ONLY public.user_sessions_additional ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_additional_id_seq'::regclass);
 J   ALTER TABLE public.user_sessions_additional ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    261    262    262            �           2604    670956    users id    DEFAULT     d   ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
 7   ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    214    215    215            �           2604    671334    usuarios_adicionais id    DEFAULT     �   ALTER TABLE ONLY public.usuarios_adicionais ALTER COLUMN id SET DEFAULT nextval('public.usuarios_adicionais_id_seq'::regclass);
 E   ALTER TABLE public.usuarios_adicionais ALTER COLUMN id DROP DEFAULT;
       public               meuprecocerto    false    243    244    244            @          0    670988    activity_logs 
   TABLE DATA           �   COPY public.activity_logs (id, user_id, tipo_operacao, entidade, entidade_id, descricao, detalhes, ip_address, user_agent, created_at, user_type) FROM stdin;
    public               meuprecocerto    false    219   DK      i          0    705059 %   additional_user_password_reset_tokens 
   TABLE DATA           ~   COPY public.additional_user_password_reset_tokens (id, token, usuario_adicional_id, expires_at, used, created_at) FROM stdin;
    public               meuprecocerto    false    260   M�      ]          0    672047    assinaturas 
   TABLE DATA           �   COPY public.assinaturas (id, user_id, plano_id, stripe_subscription_id, data_inicio, data_fim, status, tipo_cobranca, valor_pago, created_at, updated_at, plano) FROM stdin;
    public               meuprecocerto    false    248   d�      Q          0    671168 
   categorias 
   TABLE DATA           n   COPY public.categorias (id, nome, descricao, tipo, ordem, ativa, user_id, created_at, updated_at) FROM stdin;
    public               meuprecocerto    false    236   ��      W          0    671313    contatos 
   TABLE DATA           �   COPY public.contatos (id, user_id, nome, tipo, setor, cargo, telefone, celular, whatsapp, email, principal, created_at, updated_at) FROM stdin;
    public               meuprecocerto    false    242   ��      I          0    671104    custos 
   TABLE DATA           j   COPY public.custos (id, descricao, valor, tipo, observacoes, user_id, created_at, updated_at) FROM stdin;
    public               meuprecocerto    false    228   y�      K          0    671120    despesas 
   TABLE DATA           �   COPY public.despesas (id, descricao, valor, tipo, categoria, ocorrencia_meses, observacoes, user_id, created_at, updated_at) FROM stdin;
    public               meuprecocerto    false    230   ��      c          0    677166    email_verification_tokens 
   TABLE DATA           e   COPY public.email_verification_tokens (id, user_id, token, created_at, expires_at, used) FROM stdin;
    public               meuprecocerto    false    254   ��      U          0    671295 	   enderecos 
   TABLE DATA           �   COPY public.enderecos (id, user_id, tipo, cep, logradouro, numero, complemento, bairro, cidade, estado, principal, created_at, updated_at) FROM stdin;
    public               meuprecocerto    false    240   ��      G          0    671088    itens_aluguel 
   TABLE DATA           �   COPY public.itens_aluguel (id, nome, descricao, valor_equipamento, frete, retorno_investimento_meses, user_id, created_at, updated_at) FROM stdin;
    public               meuprecocerto    false    226   y�      g          0    686946 
   pagamentos 
   TABLE DATA           Q  COPY public.pagamentos (id, user_id, assinatura_id, stripe_payment_intent_id, stripe_invoice_id, valor, status, plano_nome, metodo_pagamento, fatura_url, data_pagamento, created_at, updated_at, periodo, valor_cartao, valor_credito, stripe_customer_id, stripe_subscription_id, valor_diferenca, credito_gerado, creditos_conta) FROM stdin;
    public               meuprecocerto    false    258   ��      e          0    677591    password_reset_tokens 
   TABLE DATA           a   COPY public.password_reset_tokens (id, user_id, token, created_at, expires_at, used) FROM stdin;
    public               meuprecocerto    false    256   m:      [          0    671903    payment_methods 
   TABLE DATA           �   COPY public.payment_methods (id, user_id, stripe_payment_method_id, brand, last4, exp_month, exp_year, is_default, created_at, updated_at, stripe_customer_id) FROM stdin;
    public               meuprecocerto    false    246   �:      _          0    672094    planos 
   TABLE DATA           �  COPY public.planos (id, nome, descricao, valor_mensal, valor_anual, economia_anual, valor_anual_total, ordem, ativo, dashboard, precificacao, precificacao_unitaria, gerenciamento_taxas, gerenciamento_tributacao, integracao_marketplaces, created_at, updated_at, limite_produtos, limite_usuarios, central_treinamento, suporte, relatorios_personalizados, importacao, cadastro_clientes, gerenciamento_custos) FROM stdin;
    public               meuprecocerto    false    250   m;      S          0    671185    precificacoes 
   TABLE DATA           �   COPY public.precificacoes (id, nome, tipo, reference_id, valor_custo, frete, lucro, forma_pagamento, parcelas, deslocamento, valor_venda, lucro_bruto, user_id, created_at, updated_at) FROM stdin;
    public               meuprecocerto    false    238   =      C          0    671056    produtos 
   TABLE DATA           z   COPY public.produtos (id, nome, descricao, codigo, tipo, valor_custo, frete, user_id, created_at, updated_at) FROM stdin;
    public               meuprecocerto    false    222   9=      E          0    671072    servicos 
   TABLE DATA           e   COPY public.servicos (id, nome, descricao, valor_custo, user_id, created_at, updated_at) FROM stdin;
    public               meuprecocerto    false    224   �=      A          0    671002    session 
   TABLE DATA           4   COPY public.session (sid, sess, expire) FROM stdin;
    public               meuprecocerto    false    220   �=      a          0    672135    stripe_customers 
   TABLE DATA           j   COPY public.stripe_customers (id, user_id, stripe_customer_id, email, created_at, updated_at) FROM stdin;
    public               meuprecocerto    false    252    ?      M          0    671136    taxas 
   TABLE DATA           b   COPY public.taxas (id, nome, descricao, valor, tipo, user_id, created_at, updated_at) FROM stdin;
    public               meuprecocerto    false    232   ?      O          0    671152    tributos 
   TABLE DATA           l   COPY public.tributos (id, nome, sigla, porcentagem, descricao, user_id, created_at, updated_at) FROM stdin;
    public               meuprecocerto    false    234   :?      >          0    670970    user_profiles 
   TABLE DATA           �  COPY public.user_profiles (id, user_id, primeiro_nome, ultimo_nome, razao_social, cpf_cnpj, logo_url, configuracoes, created_at, updated_at, nome_fantasia, tipo_pessoa, inscricao_estadual, inscricao_municipal, cnae, regime_tributario, atividade_principal, responsavel_nome, responsavel_email, responsavel_telefone, responsavel_setor, contador_nome, contador_email, contador_telefone) FROM stdin;
    public               meuprecocerto    false    217   W?      m          0    705183    user_sessions 
   TABLE DATA           �   COPY public.user_sessions (id, user_id, token, device_info, browser, ip, location, last_activity, expires_at, is_active, created_at, updated_at) FROM stdin;
    public               meuprecocerto    false    264   J@      k          0    705111    user_sessions_additional 
   TABLE DATA           �   COPY public.user_sessions_additional (id, user_id, user_type, token, device_info, browser, ip, location, created_at, last_activity, expires_at, is_active, updated_at) FROM stdin;
    public               meuprecocerto    false    262   g@      <          0    670953    users 
   TABLE DATA           �   COPY public.users (id, username, password, email, role, is_active, last_login, created_at, updated_at, stripe_customer_id, two_factor_enabled, two_factor_secret, last_password_change, email_verified, stripe_plan_id) FROM stdin;
    public               meuprecocerto    false    215   B      Y          0    671331    usuarios_adicionais 
   TABLE DATA           �   COPY public.usuarios_adicionais (id, user_id, nome, email, perfil, status, created_at, updated_at, setor, two_factor_enabled, two_factor_secret, last_login, last_password_change, email_verified, role, password) FROM stdin;
    public               meuprecocerto    false    244   C      �           0    0    activity_logs_id_seq    SEQUENCE SET     E   SELECT pg_catalog.setval('public.activity_logs_id_seq', 1236, true);
          public               meuprecocerto    false    218            �           0    0 ,   additional_user_password_reset_tokens_id_seq    SEQUENCE SET     Z   SELECT pg_catalog.setval('public.additional_user_password_reset_tokens_id_seq', 8, true);
          public               meuprecocerto    false    259            �           0    0    assinaturas_id_seq    SEQUENCE SET     B   SELECT pg_catalog.setval('public.assinaturas_id_seq', 318, true);
          public               meuprecocerto    false    247            �           0    0    categorias_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public.categorias_id_seq', 2, true);
          public               meuprecocerto    false    235            �           0    0    contatos_id_seq    SEQUENCE SET     >   SELECT pg_catalog.setval('public.contatos_id_seq', 36, true);
          public               meuprecocerto    false    241            �           0    0    custos_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public.custos_id_seq', 1, true);
          public               meuprecocerto    false    227            �           0    0    despesas_id_seq    SEQUENCE SET     =   SELECT pg_catalog.setval('public.despesas_id_seq', 1, true);
          public               meuprecocerto    false    229            �           0    0     email_verification_tokens_id_seq    SEQUENCE SET     O   SELECT pg_catalog.setval('public.email_verification_tokens_id_seq', 46, true);
          public               meuprecocerto    false    253            �           0    0    enderecos_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public.enderecos_id_seq', 39, true);
          public               meuprecocerto    false    239            �           0    0    itens_aluguel_id_seq    SEQUENCE SET     C   SELECT pg_catalog.setval('public.itens_aluguel_id_seq', 1, false);
          public               meuprecocerto    false    225            �           0    0    pagamentos_id_seq    SEQUENCE SET     B   SELECT pg_catalog.setval('public.pagamentos_id_seq', 5884, true);
          public               meuprecocerto    false    257            �           0    0    password_reset_tokens_id_seq    SEQUENCE SET     K   SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 12, true);
          public               meuprecocerto    false    255            �           0    0    payment_methods_id_seq    SEQUENCE SET     E   SELECT pg_catalog.setval('public.payment_methods_id_seq', 88, true);
          public               meuprecocerto    false    245            �           0    0    planos_temp_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public.planos_temp_id_seq', 1, false);
          public               meuprecocerto    false    249            �           0    0    precificacoes_id_seq    SEQUENCE SET     B   SELECT pg_catalog.setval('public.precificacoes_id_seq', 1, true);
          public               meuprecocerto    false    237            �           0    0    produtos_id_seq    SEQUENCE SET     =   SELECT pg_catalog.setval('public.produtos_id_seq', 1, true);
          public               meuprecocerto    false    221            �           0    0    servicos_id_seq    SEQUENCE SET     >   SELECT pg_catalog.setval('public.servicos_id_seq', 1, false);
          public               meuprecocerto    false    223            �           0    0    stripe_customers_id_seq    SEQUENCE SET     F   SELECT pg_catalog.setval('public.stripe_customers_id_seq', 1, false);
          public               meuprecocerto    false    251            �           0    0    taxas_id_seq    SEQUENCE SET     :   SELECT pg_catalog.setval('public.taxas_id_seq', 1, true);
          public               meuprecocerto    false    231            �           0    0    tributos_id_seq    SEQUENCE SET     =   SELECT pg_catalog.setval('public.tributos_id_seq', 1, true);
          public               meuprecocerto    false    233            �           0    0    user_profiles_id_seq    SEQUENCE SET     C   SELECT pg_catalog.setval('public.user_profiles_id_seq', 29, true);
          public               meuprecocerto    false    216            �           0    0    user_sessions_additional_id_seq    SEQUENCE SET     N   SELECT pg_catalog.setval('public.user_sessions_additional_id_seq', 91, true);
          public               meuprecocerto    false    261            �           0    0    user_sessions_id_seq    SEQUENCE SET     C   SELECT pg_catalog.setval('public.user_sessions_id_seq', 1, false);
          public               meuprecocerto    false    263            �           0    0    users_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public.users_id_seq', 40, true);
          public               meuprecocerto    false    214            �           0    0    usuarios_adicionais_id_seq    SEQUENCE SET     I   SELECT pg_catalog.setval('public.usuarios_adicionais_id_seq', 46, true);
          public               meuprecocerto    false    243            F           2606    670996     activity_logs activity_logs_pkey 
   CONSTRAINT     ^   ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);
 J   ALTER TABLE ONLY public.activity_logs DROP CONSTRAINT activity_logs_pkey;
       public                 meuprecocerto    false    219            �           2606    705068 P   additional_user_password_reset_tokens additional_user_password_reset_tokens_pkey 
   CONSTRAINT     �   ALTER TABLE ONLY public.additional_user_password_reset_tokens
    ADD CONSTRAINT additional_user_password_reset_tokens_pkey PRIMARY KEY (id);
 z   ALTER TABLE ONLY public.additional_user_password_reset_tokens DROP CONSTRAINT additional_user_password_reset_tokens_pkey;
       public                 meuprecocerto    false    260            �           2606    705070 U   additional_user_password_reset_tokens additional_user_password_reset_tokens_token_key 
   CONSTRAINT     �   ALTER TABLE ONLY public.additional_user_password_reset_tokens
    ADD CONSTRAINT additional_user_password_reset_tokens_token_key UNIQUE (token);
    ALTER TABLE ONLY public.additional_user_password_reset_tokens DROP CONSTRAINT additional_user_password_reset_tokens_token_key;
       public                 meuprecocerto    false    260            �           2606    705072 d   additional_user_password_reset_tokens additional_user_password_reset_tokens_usuario_adicional_id_key 
   CONSTRAINT     �   ALTER TABLE ONLY public.additional_user_password_reset_tokens
    ADD CONSTRAINT additional_user_password_reset_tokens_usuario_adicional_id_key UNIQUE (usuario_adicional_id);
 �   ALTER TABLE ONLY public.additional_user_password_reset_tokens DROP CONSTRAINT additional_user_password_reset_tokens_usuario_adicional_id_key;
       public                 meuprecocerto    false    260            e           2606    672058    assinaturas assinaturas_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public.assinaturas
    ADD CONSTRAINT assinaturas_pkey PRIMARY KEY (id);
 F   ALTER TABLE ONLY public.assinaturas DROP CONSTRAINT assinaturas_pkey;
       public                 meuprecocerto    false    248            Y           2606    671178    categorias categorias_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);
 D   ALTER TABLE ONLY public.categorias DROP CONSTRAINT categorias_pkey;
       public                 meuprecocerto    false    236            _           2606    671324    contatos contatos_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public.contatos
    ADD CONSTRAINT contatos_pkey PRIMARY KEY (id);
 @   ALTER TABLE ONLY public.contatos DROP CONSTRAINT contatos_pkey;
       public                 meuprecocerto    false    242            Q           2606    671113    custos custos_pkey 
   CONSTRAINT     P   ALTER TABLE ONLY public.custos
    ADD CONSTRAINT custos_pkey PRIMARY KEY (id);
 <   ALTER TABLE ONLY public.custos DROP CONSTRAINT custos_pkey;
       public                 meuprecocerto    false    228            S           2606    671129    despesas despesas_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public.despesas
    ADD CONSTRAINT despesas_pkey PRIMARY KEY (id);
 @   ALTER TABLE ONLY public.despesas DROP CONSTRAINT despesas_pkey;
       public                 meuprecocerto    false    230            q           2606    677175 8   email_verification_tokens email_verification_tokens_pkey 
   CONSTRAINT     v   ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);
 b   ALTER TABLE ONLY public.email_verification_tokens DROP CONSTRAINT email_verification_tokens_pkey;
       public                 meuprecocerto    false    254            s           2606    677177 =   email_verification_tokens email_verification_tokens_token_key 
   CONSTRAINT     y   ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_key UNIQUE (token);
 g   ALTER TABLE ONLY public.email_verification_tokens DROP CONSTRAINT email_verification_tokens_token_key;
       public                 meuprecocerto    false    254            ]           2606    671306    enderecos enderecos_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public.enderecos
    ADD CONSTRAINT enderecos_pkey PRIMARY KEY (id);
 B   ALTER TABLE ONLY public.enderecos DROP CONSTRAINT enderecos_pkey;
       public                 meuprecocerto    false    240            O           2606    671097     itens_aluguel itens_aluguel_pkey 
   CONSTRAINT     ^   ALTER TABLE ONLY public.itens_aluguel
    ADD CONSTRAINT itens_aluguel_pkey PRIMARY KEY (id);
 J   ALTER TABLE ONLY public.itens_aluguel DROP CONSTRAINT itens_aluguel_pkey;
       public                 meuprecocerto    false    226            �           2606    686956    pagamentos pagamentos_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_pkey PRIMARY KEY (id);
 D   ALTER TABLE ONLY public.pagamentos DROP CONSTRAINT pagamentos_pkey;
       public                 meuprecocerto    false    258            �           2606    687088 +   pagamentos pagamentos_stripe_invoice_id_key 
   CONSTRAINT     s   ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_stripe_invoice_id_key UNIQUE (stripe_invoice_id);
 U   ALTER TABLE ONLY public.pagamentos DROP CONSTRAINT pagamentos_stripe_invoice_id_key;
       public                 meuprecocerto    false    258            w           2606    677600 0   password_reset_tokens password_reset_tokens_pkey 
   CONSTRAINT     n   ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);
 Z   ALTER TABLE ONLY public.password_reset_tokens DROP CONSTRAINT password_reset_tokens_pkey;
       public                 meuprecocerto    false    256            y           2606    677602 5   password_reset_tokens password_reset_tokens_token_key 
   CONSTRAINT     q   ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);
 _   ALTER TABLE ONLY public.password_reset_tokens DROP CONSTRAINT password_reset_tokens_token_key;
       public                 meuprecocerto    false    256            c           2606    671913 $   payment_methods payment_methods_pkey 
   CONSTRAINT     b   ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);
 N   ALTER TABLE ONLY public.payment_methods DROP CONSTRAINT payment_methods_pkey;
       public                 meuprecocerto    false    246            g           2606    672120    planos planos_temp_nome_key 
   CONSTRAINT     V   ALTER TABLE ONLY public.planos
    ADD CONSTRAINT planos_temp_nome_key UNIQUE (nome);
 E   ALTER TABLE ONLY public.planos DROP CONSTRAINT planos_temp_nome_key;
       public                 meuprecocerto    false    250            i           2606    672118    planos planos_temp_pkey 
   CONSTRAINT     U   ALTER TABLE ONLY public.planos
    ADD CONSTRAINT planos_temp_pkey PRIMARY KEY (id);
 A   ALTER TABLE ONLY public.planos DROP CONSTRAINT planos_temp_pkey;
       public                 meuprecocerto    false    250            [           2606    671194     precificacoes precificacoes_pkey 
   CONSTRAINT     ^   ALTER TABLE ONLY public.precificacoes
    ADD CONSTRAINT precificacoes_pkey PRIMARY KEY (id);
 J   ALTER TABLE ONLY public.precificacoes DROP CONSTRAINT precificacoes_pkey;
       public                 meuprecocerto    false    238            K           2606    671065    produtos produtos_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_pkey PRIMARY KEY (id);
 @   ALTER TABLE ONLY public.produtos DROP CONSTRAINT produtos_pkey;
       public                 meuprecocerto    false    222            M           2606    671081    servicos servicos_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_pkey PRIMARY KEY (id);
 @   ALTER TABLE ONLY public.servicos DROP CONSTRAINT servicos_pkey;
       public                 meuprecocerto    false    224            I           2606    671008    session session_pkey 
   CONSTRAINT     S   ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);
 >   ALTER TABLE ONLY public.session DROP CONSTRAINT session_pkey;
       public                 meuprecocerto    false    220            k           2606    672144 &   stripe_customers stripe_customers_pkey 
   CONSTRAINT     d   ALTER TABLE ONLY public.stripe_customers
    ADD CONSTRAINT stripe_customers_pkey PRIMARY KEY (id);
 P   ALTER TABLE ONLY public.stripe_customers DROP CONSTRAINT stripe_customers_pkey;
       public                 meuprecocerto    false    252            U           2606    671145    taxas taxas_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.taxas
    ADD CONSTRAINT taxas_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.taxas DROP CONSTRAINT taxas_pkey;
       public                 meuprecocerto    false    232            W           2606    671161    tributos tributos_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public.tributos
    ADD CONSTRAINT tributos_pkey PRIMARY KEY (id);
 @   ALTER TABLE ONLY public.tributos DROP CONSTRAINT tributos_pkey;
       public                 meuprecocerto    false    234            m           2606    672148 .   stripe_customers uq_stripe_customers_stripe_id 
   CONSTRAINT     w   ALTER TABLE ONLY public.stripe_customers
    ADD CONSTRAINT uq_stripe_customers_stripe_id UNIQUE (stripe_customer_id);
 X   ALTER TABLE ONLY public.stripe_customers DROP CONSTRAINT uq_stripe_customers_stripe_id;
       public                 meuprecocerto    false    252            o           2606    672146 ,   stripe_customers uq_stripe_customers_user_id 
   CONSTRAINT     j   ALTER TABLE ONLY public.stripe_customers
    ADD CONSTRAINT uq_stripe_customers_user_id UNIQUE (user_id);
 V   ALTER TABLE ONLY public.stripe_customers DROP CONSTRAINT uq_stripe_customers_user_id;
       public                 meuprecocerto    false    252            B           2606    670979     user_profiles user_profiles_pkey 
   CONSTRAINT     ^   ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);
 J   ALTER TABLE ONLY public.user_profiles DROP CONSTRAINT user_profiles_pkey;
       public                 meuprecocerto    false    217            D           2606    670981 '   user_profiles user_profiles_user_id_key 
   CONSTRAINT     e   ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
 Q   ALTER TABLE ONLY public.user_profiles DROP CONSTRAINT user_profiles_user_id_key;
       public                 meuprecocerto    false    217            �           2606    705124 6   user_sessions_additional user_sessions_additional_pkey 
   CONSTRAINT     t   ALTER TABLE ONLY public.user_sessions_additional
    ADD CONSTRAINT user_sessions_additional_pkey PRIMARY KEY (id);
 `   ALTER TABLE ONLY public.user_sessions_additional DROP CONSTRAINT user_sessions_additional_pkey;
       public                 meuprecocerto    false    262            �           2606    705126 ;   user_sessions_additional user_sessions_additional_token_key 
   CONSTRAINT     w   ALTER TABLE ONLY public.user_sessions_additional
    ADD CONSTRAINT user_sessions_additional_token_key UNIQUE (token);
 e   ALTER TABLE ONLY public.user_sessions_additional DROP CONSTRAINT user_sessions_additional_token_key;
       public                 meuprecocerto    false    262            �           2606    705194     user_sessions user_sessions_pkey 
   CONSTRAINT     ^   ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);
 J   ALTER TABLE ONLY public.user_sessions DROP CONSTRAINT user_sessions_pkey;
       public                 meuprecocerto    false    264            �           2606    705196 %   user_sessions user_sessions_token_key 
   CONSTRAINT     a   ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_token_key UNIQUE (token);
 O   ALTER TABLE ONLY public.user_sessions DROP CONSTRAINT user_sessions_token_key;
       public                 meuprecocerto    false    264            >           2606    670968    users users_email_key 
   CONSTRAINT     Q   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
 ?   ALTER TABLE ONLY public.users DROP CONSTRAINT users_email_key;
       public                 meuprecocerto    false    215            @           2606    670964    users users_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
       public                 meuprecocerto    false    215            a           2606    671341 ,   usuarios_adicionais usuarios_adicionais_pkey 
   CONSTRAINT     j   ALTER TABLE ONLY public.usuarios_adicionais
    ADD CONSTRAINT usuarios_adicionais_pkey PRIMARY KEY (id);
 V   ALTER TABLE ONLY public.usuarios_adicionais DROP CONSTRAINT usuarios_adicionais_pkey;
       public                 meuprecocerto    false    244            G           1259    671009    IDX_session_expire    INDEX     J   CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);
 (   DROP INDEX public."IDX_session_expire";
       public                 meuprecocerto    false    220            �           1259    705079 &   idx_additional_password_tokens_expires    INDEX     ~   CREATE INDEX idx_additional_password_tokens_expires ON public.additional_user_password_reset_tokens USING btree (expires_at);
 :   DROP INDEX public.idx_additional_password_tokens_expires;
       public                 meuprecocerto    false    260            �           1259    705078 &   idx_additional_password_tokens_usuario    INDEX     �   CREATE INDEX idx_additional_password_tokens_usuario ON public.additional_user_password_reset_tokens USING btree (usuario_adicional_id);
 :   DROP INDEX public.idx_additional_password_tokens_usuario;
       public                 meuprecocerto    false    260            t           1259    677183 #   idx_email_verification_tokens_token    INDEX     j   CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens USING btree (token);
 7   DROP INDEX public.idx_email_verification_tokens_token;
       public                 meuprecocerto    false    254            u           1259    677184 %   idx_email_verification_tokens_user_id    INDEX     n   CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens USING btree (user_id);
 9   DROP INDEX public.idx_email_verification_tokens_user_id;
       public                 meuprecocerto    false    254            z           1259    688584    idx_pagamentos_data_pagamento    INDEX     c   CREATE INDEX idx_pagamentos_data_pagamento ON public.pagamentos USING btree (data_pagamento DESC);
 1   DROP INDEX public.idx_pagamentos_data_pagamento;
       public                 meuprecocerto    false    258            {           1259    688583    idx_pagamentos_stripe_customer    INDEX     c   CREATE INDEX idx_pagamentos_stripe_customer ON public.pagamentos USING btree (stripe_customer_id);
 2   DROP INDEX public.idx_pagamentos_stripe_customer;
       public                 meuprecocerto    false    258            |           1259    688581    idx_pagamentos_stripe_invoice    INDEX     a   CREATE INDEX idx_pagamentos_stripe_invoice ON public.pagamentos USING btree (stripe_invoice_id);
 1   DROP INDEX public.idx_pagamentos_stripe_invoice;
       public                 meuprecocerto    false    258            }           1259    688582 "   idx_pagamentos_stripe_subscription    INDEX     k   CREATE INDEX idx_pagamentos_stripe_subscription ON public.pagamentos USING btree (stripe_subscription_id);
 6   DROP INDEX public.idx_pagamentos_stripe_subscription;
       public                 meuprecocerto    false    258            ~           1259    688580    idx_pagamentos_user_id    INDEX     P   CREATE INDEX idx_pagamentos_user_id ON public.pagamentos USING btree (user_id);
 *   DROP INDEX public.idx_pagamentos_user_id;
       public                 meuprecocerto    false    258            �           1259    705129 #   idx_user_sessions_additional_active    INDEX     m   CREATE INDEX idx_user_sessions_additional_active ON public.user_sessions_additional USING btree (is_active);
 7   DROP INDEX public.idx_user_sessions_additional_active;
       public                 meuprecocerto    false    262            �           1259    705128 "   idx_user_sessions_additional_token    INDEX     h   CREATE INDEX idx_user_sessions_additional_token ON public.user_sessions_additional USING btree (token);
 6   DROP INDEX public.idx_user_sessions_additional_token;
       public                 meuprecocerto    false    262            �           1259    705130 !   idx_user_sessions_additional_type    INDEX     k   CREATE INDEX idx_user_sessions_additional_type ON public.user_sessions_additional USING btree (user_type);
 5   DROP INDEX public.idx_user_sessions_additional_type;
       public                 meuprecocerto    false    262            �           1259    705127 $   idx_user_sessions_additional_user_id    INDEX     l   CREATE INDEX idx_user_sessions_additional_user_id ON public.user_sessions_additional USING btree (user_id);
 8   DROP INDEX public.idx_user_sessions_additional_user_id;
       public                 meuprecocerto    false    262            �           1259    688586 #   pagamentos_stripe_invoice_id_unique    INDEX     �   CREATE UNIQUE INDEX pagamentos_stripe_invoice_id_unique ON public.pagamentos USING btree (stripe_invoice_id) WHERE (stripe_invoice_id IS NOT NULL);
 7   DROP INDEX public.pagamentos_stripe_invoice_id_unique;
       public                 meuprecocerto    false    258    258            �           2606    670997 &   activity_logs activity_logs_user_id_fk    FK CONSTRAINT     �   ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
 P   ALTER TABLE ONLY public.activity_logs DROP CONSTRAINT activity_logs_user_id_fk;
       public               meuprecocerto    false    215    4160    219            �           2606    705073 e   additional_user_password_reset_tokens additional_user_password_reset_tokens_usuario_adicional_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.additional_user_password_reset_tokens
    ADD CONSTRAINT additional_user_password_reset_tokens_usuario_adicional_id_fkey FOREIGN KEY (usuario_adicional_id) REFERENCES public.usuarios_adicionais(id) ON DELETE CASCADE;
 �   ALTER TABLE ONLY public.additional_user_password_reset_tokens DROP CONSTRAINT additional_user_password_reset_tokens_usuario_adicional_id_fkey;
       public               meuprecocerto    false    260    4193    244            �           2606    672059 $   assinaturas assinaturas_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.assinaturas
    ADD CONSTRAINT assinaturas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 N   ALTER TABLE ONLY public.assinaturas DROP CONSTRAINT assinaturas_user_id_fkey;
       public               meuprecocerto    false    248    215    4160            �           2606    671179 "   categorias categorias_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 L   ALTER TABLE ONLY public.categorias DROP CONSTRAINT categorias_user_id_fkey;
       public               meuprecocerto    false    236    215    4160            �           2606    671325    contatos contatos_user_id_fkey    FK CONSTRAINT     }   ALTER TABLE ONLY public.contatos
    ADD CONSTRAINT contatos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 H   ALTER TABLE ONLY public.contatos DROP CONSTRAINT contatos_user_id_fkey;
       public               meuprecocerto    false    4160    215    242            �           2606    671114    custos custos_user_id_fkey    FK CONSTRAINT     y   ALTER TABLE ONLY public.custos
    ADD CONSTRAINT custos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 D   ALTER TABLE ONLY public.custos DROP CONSTRAINT custos_user_id_fkey;
       public               meuprecocerto    false    4160    215    228            �           2606    671130    despesas despesas_user_id_fkey    FK CONSTRAINT     }   ALTER TABLE ONLY public.despesas
    ADD CONSTRAINT despesas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 H   ALTER TABLE ONLY public.despesas DROP CONSTRAINT despesas_user_id_fkey;
       public               meuprecocerto    false    230    215    4160            �           2606    677178 @   email_verification_tokens email_verification_tokens_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 j   ALTER TABLE ONLY public.email_verification_tokens DROP CONSTRAINT email_verification_tokens_user_id_fkey;
       public               meuprecocerto    false    4160    215    254            �           2606    671307     enderecos enderecos_user_id_fkey    FK CONSTRAINT        ALTER TABLE ONLY public.enderecos
    ADD CONSTRAINT enderecos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 J   ALTER TABLE ONLY public.enderecos DROP CONSTRAINT enderecos_user_id_fkey;
       public               meuprecocerto    false    215    240    4160            �           2606    671098 (   itens_aluguel itens_aluguel_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.itens_aluguel
    ADD CONSTRAINT itens_aluguel_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 R   ALTER TABLE ONLY public.itens_aluguel DROP CONSTRAINT itens_aluguel_user_id_fkey;
       public               meuprecocerto    false    226    215    4160            �           2606    677603 8   password_reset_tokens password_reset_tokens_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 b   ALTER TABLE ONLY public.password_reset_tokens DROP CONSTRAINT password_reset_tokens_user_id_fkey;
       public               meuprecocerto    false    4160    256    215            �           2606    671914 ,   payment_methods payment_methods_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
 V   ALTER TABLE ONLY public.payment_methods DROP CONSTRAINT payment_methods_user_id_fkey;
       public               meuprecocerto    false    4160    246    215            �           2606    671195 (   precificacoes precificacoes_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.precificacoes
    ADD CONSTRAINT precificacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 R   ALTER TABLE ONLY public.precificacoes DROP CONSTRAINT precificacoes_user_id_fkey;
       public               meuprecocerto    false    4160    238    215            �           2606    671066    produtos produtos_user_id_fkey    FK CONSTRAINT     }   ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 H   ALTER TABLE ONLY public.produtos DROP CONSTRAINT produtos_user_id_fkey;
       public               meuprecocerto    false    222    4160    215            �           2606    671082    servicos servicos_user_id_fkey    FK CONSTRAINT     }   ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 H   ALTER TABLE ONLY public.servicos DROP CONSTRAINT servicos_user_id_fkey;
       public               meuprecocerto    false    224    4160    215            �           2606    672149 .   stripe_customers stripe_customers_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.stripe_customers
    ADD CONSTRAINT stripe_customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 X   ALTER TABLE ONLY public.stripe_customers DROP CONSTRAINT stripe_customers_user_id_fkey;
       public               meuprecocerto    false    252    4160    215            �           2606    671146    taxas taxas_user_id_fkey    FK CONSTRAINT     w   ALTER TABLE ONLY public.taxas
    ADD CONSTRAINT taxas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 B   ALTER TABLE ONLY public.taxas DROP CONSTRAINT taxas_user_id_fkey;
       public               meuprecocerto    false    232    215    4160            �           2606    671162    tributos tributos_user_id_fkey    FK CONSTRAINT     }   ALTER TABLE ONLY public.tributos
    ADD CONSTRAINT tributos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 H   ALTER TABLE ONLY public.tributos DROP CONSTRAINT tributos_user_id_fkey;
       public               meuprecocerto    false    4160    215    234            �           2606    670982 &   user_profiles user_profiles_user_id_fk    FK CONSTRAINT     �   ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
 P   ALTER TABLE ONLY public.user_profiles DROP CONSTRAINT user_profiles_user_id_fk;
       public               meuprecocerto    false    217    4160    215            �           2606    705197 (   user_sessions user_sessions_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 R   ALTER TABLE ONLY public.user_sessions DROP CONSTRAINT user_sessions_user_id_fkey;
       public               meuprecocerto    false    264    215    4160            �           2606    671342 4   usuarios_adicionais usuarios_adicionais_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.usuarios_adicionais
    ADD CONSTRAINT usuarios_adicionais_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 ^   ALTER TABLE ONLY public.usuarios_adicionais DROP CONSTRAINT usuarios_adicionais_user_id_fkey;
       public               meuprecocerto    false    244    215    4160            @      x���r$Gv&x]�iuE��!�s��O��ؒFۣ�H&�v���l,$��.P�n�L#�]���<_l�q�HD�<2��
OdTU@�W�~���y�o�������Ǉ���G�ju��z�W�w�ww?�>��<<ܽ���ۛ7o@}���_�FZՅ`����T�"�BG���,��3J{�qEW�"���P+�1��W����;M�ViŻ��K��kj�y�ӌķw�z����_Q�V_�����??����+~F�n�߰�w��X���_~y�������_����߿���_��������7���ݗ��������_i���߫�~������Z�5�M #�Uu<��[+�yc�O+��Z�y�9�-@݊ ���D��5c kW�k�.(2d�u�*+����VW��VY��Z�rJ�w�#WYѭAw�
��覒��4S朤��G��G�֦[Q�*dE���S�6��ɬ;m�e��CŬ� �H���bb�^[�V�� 2K��M��X�+Э���i�G�
���.������߭�������f�����}{�����~�XP��\d3�\�W4����I~ M=��Vf>��:p>c]� Q����*�>�Ab�>�V���._�J&�+���1̤ҥ8c&�k�@�S��t>��I�Z�\�$؍>��a�ˊ���+=�Yh�l 3�?z�k��1Q�"73��Q�&�G^Ϥ��Uf�
�+P`�N�+��
�6��k8dZ��ճ0KiE��vc��a �Ӊ���1���?dm�II���8����C5dZ��!_HK�E�O5,2��:x 
!*4�E��0��1L�|����S�#��e�/d��Tc�q��Ұ]�ҭ�dS��ƽW>y��M��⍳��V�+NdSZ$��9o��p�UNc:�:6%+ZQtYk�Tc'�)ݱja�>�A�Cz҅�ul*����FG2�¦���\���E�����ͻ��۫��7��7鋻���?�n�~�[�s��?�^}�y��Y}�A���{�Wx����7�o��������_���m�]���y�����W7�������7������|��-����t�?�_����1~����[��Ç��n~��O�)|�\�����y�L�hX���ɏ}����c���=��E�v�{�^�$�-�E��&z�X}��� ���?8@�_�~��)�����pw$rF��� r��="� K�UbF"�6y����r�q� 6bz�����	-��Kj�R����I�]�� >�yl�x�x�F�Xr{���c[�X��ٱ���Pg/���M���Z#p3GMQ��n/����A{w{�� �����z������F`��W�=�98Dh����\|/�Q٤�����^�2����{�VG`w
�t t���֐#q|�1Va����G�a���O��cQ�@o�3�VRc��۫[a��O-����0�4m�eNԸO/^ԫφPǦD#����Q�A�� C�gC��;0����FV�^�sR��$����:o���ޙ���}��]��9� ~�r�ޯ���ౌ?��a������^tP?�����A�Hz���P**fg������0��䴏���˵�p�;@}��n�~��n~Wk:_crDع��əD��l���F�����'l���u����V�BF�8���M�"{P땦�
�����'����k\锄%:/�ب�S�!:�5�pIY��t5ʥk��SL���K��c�]}#V*��)����] Í��0ܭ�h���	Eb��W{������$��3� ����e�0o�Q�Zޫ��k��L�Mcg�э�n�`�I��FFDS�@<�SR��E2�ɯu�;S` b[�t^�ڔ�!�x<x���Kwj�tt��3���S��|��\��~� �/�t4�9�;�bX�KG|xPv�'�u��x��$\�@�M�����͵�����"aҼe/�)8���0P���^��}��8�)8�)��q��nn��1[�RK��=j�pm>�\ %��� �>�v���_����^h��DW� ]�)t� UT�y�֤�˰ߟ�U]i5;iV�'�^�b�-^�����^Kjkl
������-�]��%�p�z�z�k�>��ܿ��z/@��Ͳ�?������c�� �$v���6�����ǻ[Y��/W!���x�������d���?]}x��������������/���z����'���|�)��ky1�������+@��V�r/����H/�� �ȩT6���<f�IA����-�*~�4�}�so&�W3���/���ٽ��cMi齂�&��������9�'(˵�ނ�����|��A�>��?tx.�~r�](E���A=�c�p�����
�\��	�����R����h�)���)m]��"r��<��q�rP��N��*�Me��NZ�e>�>��JO�� �R��cI��u��<�N�S�Z!���BY-��jɥBN�	20�sϯ���s)�B0���r��B'$�7a!�Q&�1��)�����'�����p����/�0�&���u�Sq�V���	qb�,�K>��h� "b��mH�%O�zrbx1��9(qFi�1��PC��{ȩS�5xR����a���5��
�kJ�K� 6av����6%��3 v"�(���^p���߽&F:d
Lي8�Z�B.��]���5�����>�<�S�O�٥�OǸs���ϣ��E�d�t�9��<�T�sz/��Y����f'{�.r���t�Nh�jO�iB �{��dE}$���ф@"X�)��=�{�	��匣�D�$� M��z$�cO�sw��(�)&Hk
d�C��0&x4�^���m�P�]�a�G���<PW����© �юW�U��Kp��RO,�r���� ^:�q�?���yV�O/����ǌ������8�������]y�a��o�ɴ�O7�?mn��V�^�������?����<-� ��� �q��7������x?��#B�a�ȇ�~�c�ys+�'��pus���w��7�W�r9���܁���o��;���F����z�yu���+�R�.��c�G�k�!��w���U���L�6N��l��3�3#���	�	ȧ9�ZۅT
�`��<�RB���L���7i�RBG>��g6O�@-�֙�t��5��A�l9���_�Z��)���_�;6F�������RyIR12���ru�rFO�IS���Ι4R�P0�K����K�?o���f�	O_t�&��Ǜ�M[:�"����7,��u�{p��l@-�qB��R�1��f'��~��c��x|���ީ�%I�ޟ�]bF�W������O��A	���^��_������������uh��j����Fa�����B�R2#��nc�U��`c-q�W/)���Y6��-´ea�sĶz����Tr�y����^�E��b��I�Z_Xɀ�4F'FK��}��Z�}V��-��6?M��(7L�[,�C�{k��XUE�=80��{Qb�����O?᧍]���л+`<��0�b^Z�Y�z�i(�X��nS����U��*�G�ɧʩC!|���/�P�|g�9�c?>֔!_���ё+�eO!~v:��|kĎ�i������1���쬼z���]F�w��u�Fn��(��>�vˈ�;M�&���e�W���h�R�����׶5?J�4�\�H��¨_��6F2��%�G���?%�7!��
 ���H��B��$�ً["�h�O������▅�OI�$�՜<_���?��3�N��ǧm��j�
�N��ب�*Ag d7�;�� �	�|ޤ�0��y9�Q�
�`�;M)���Nz��4^�_�����2�M��w�?�f��G�r���^�G��;�����H��GQP�ZF}��r�W[9H�1�"U��U��3;���jۡqdzrR�Oc�~_��W�O�i���X�!0�D�5���������XYW�{�l�    <�P��@.�TxgF��~��x���;�A�bkv�j����K��3�S�������ư�����K�8?�饐��W�o�/ ojbY����[���[����
l#�#5�
�W��<����y�ӥ��ȯ���������dc\ ��lH�<3��H��:��d,��H��0.�a�Z��h �Kj�\�ȭ����GV�I�G�)E�,��s�F�+�}
~�dS�|6E3��a�&ǻ�d��ϦE���ά$'�2�d�#,�bfa�0���}�	>�v17�h�^Pg�u�k(�$b/!�S�0\�ݼI��_J�]�'x����ЅE�<�
ٹy�{ۆ*c��'��kƋ�]��T!��Ȅ�	kG��t]?{�?��bC�t��t�k[��_)�鱸:V??�WW�"oH�Ы|�R��̤=o�S�@+��c��a~V���cl/��Rjwʤ��L͖�R�H�6�V���<�}"�,�!��t@���x�+lii�qQdoLg٦W)"h����d����e����X��6��#��Б�yC��^��P9�R^�]�m|m��C������}Kx�.-)��h�OA�K�����Jj��Vnq!�#�Z��ʧ��ڎ�.�����AQr5����n!Q�N�C�V�����Z|��	K$1�2��X^�"D>�i�b�5`��>)�n�Y~&�e#��<�f�nqZ.ZD�A*l
d���~�r/b�xguPɡ�F:/��W���2��f;n�
�$]{��hQ/'�b6k|�L��3��	�^��!Q�����¢�{��y��"9'�R5?;À����M+qB�����T���/��S��ʥ�M.ٴ�ͦm{�N�0�?R�xN�ihy-Tｆ܇�/��ٕ��[��{�����M?�{\\�v54��t�#�sa���[E���$_���~��舯OG��^oI�,�����u�|1xr?�~��z1Ni<4!��_�dy0R{�ȃWX��B��$������_!�k���g��bs������Y�r+�����\��Z�i�\��TlƼ�����ڸ̝��IO#��EK|m��z+J���b��H��EI<����3C��{J���֜�c�O@`-Ay����N����*�D���
ڻ�,�� Ha�nM��
0�<���/�?�\e��Ν�v8�m�K�b�֞�� �R}95-���0W�L�jq2��ܾ���?�W+> ���ϫ���6w��7o�Kj���X�!���A�x sbӂjd�0J(:$��s����ȷ���)��Xg��qIC>�^�NyB����凘}fV��<:i��_:@�m���C�{i�9 岴X��\�i�`���Z/#���^��{�Z/#]�N*��b,.υa�{�ך�R�^h�yn����Ǜ���o}\m-������)պS��&�q�gIF'�'p��O�K���01�+����CU�G�9��"����4w�H������	�do��n/Ú�����x�|���d�g�?�E�Ǥ���pyT{�I;��x|/c��ɝ�M��q�/h��db�<d�
�m�����������Z�~,���-�����o������b\�^���X[���2����D�!�҂��r�;��
C�
m��H����0:X�x�0߉O���_�S?b~�-B֥=�E�c-�;�k�N�^)�%K �,��#�n�c�W)��ç�͖�!�~��V��?L��S��+�2_�*�󀯀�T�hw ��c[�]'��>�"zJ?<��/�z=���o��Iyg0��||�ȟ�{�W��Y�z�a ??�����7�����A>r�<���� !_���������?~;�Z~ �l��n�o�^�����Q���7�F#�2�2RS{�?�?x�-ℵ� �T~  �����>5�	TK����h:p��cM�g|-�FQR� �,YOf�ޭ������R-:�)�9�#�k�} �"?N�<��SuZw��a:���� ��XSzwz/�Ae��H�P���s����.`ֽ�֋�W�������>�����^^?`�O��'w�"��&)�
��c-5L�Eh\��C
3�����&�N�1�Ld~?����OP[}�f4�ϛ��{We�ҺՐ9I4As J1x�-��{�r.�!J�/|���;��Ǔ�#��D'�e��V��c�A��E���ܭ�����]�þ
Zu�A���Wo�n?lx#�緓2�i���f@d�+ݼ�L�<�������~���]��{2s�X�R��ǆד�F R9��K]�d6�?(���dⓔ�&����o��#*�[� �|tZ(�&9M(_i����紓�N��GGzm��'�-���`�h'C"j��6�A�&��뭡�ޚ��s�Q�'.�ګ���ƛ6Ё;��<֔;��[�G���GԌ{D_!�h��@��`|6s]1̄����}����(U)�2���K���>.�X$К�	�9�??=����`��>��kk�Az1�o��!E�7���;�7`<�kV|��FuH$SQ$�z���>�D70 ��뼶2�Xi]�+�,h�H�.�^���cM%j�{�{(֤R\��!�� �N�W,�FP!�3�izħ����� +�T����z��*��,B�g���)^��S!r��q6;��m1��N
J��/�sd�L�yf?{w��{4�ƙE���ծ�|�4��Ĝ"�A�@;�)k��^V�����ì�?����D��5�hI���y߼&��6�M��1=i��S��[�P(��ޢM�`�����|��_i�֯�_#S)��~N����q�ȡu֧�b3�h�"(��!	-�Ք�z�d�-���Q��y� �#��}9��i�a� s�<�.�rb��!Z�hd>��E��d8ʕ�T�6�Ka���I�(�	n+Ӿ��v�E��z�ڂ
$��0O��t�NN����ƱzR�������ې���Bg\�4��0����)<�ڂ��9E*d���k�z)��x&H�
yZSl�`oܝ�Z~鵴����;t����=h��k���g}ul�U*Ag��~y�LؽX3�SvA��3)�B�z�gh,�qa�p(6��5X��١� {hȃ����(��/�Tk��/A
m�.]q1�<���JhYR�rK���:�@����_�0v�1�f�s���	�O���˕�__�_����|�ټ���k�1���<��=�_K�9ꔘm�`V�|������[�e l�^�_��` ��(tz���c����%��s����l+��K�]r�$� ���3)�����6ceLpɲ��P$�N�/���Q�b��x��۪PPA���V�X[X�5)%R>K�r_R+]�g+(��-���R[�ol�}s�yWJ�����	*�7���Ra���;�@���Zr��k
��^�x�R;[[�g�Zz_`o��4����ų�\>�I*��f��M�)x�ϼ�L�8V���u f�k�J�{�W6k��`=wɝz�H5�n�_̋�*���_��QZ�$�]}S�o�8O���n�j5\a��󇬛�c���m�2�C���Ceܠ�e%.@�P�td�{
��Ui�S��Y!�g��>3�NSkD�؟F:x�%���1[�����b����{����*
���JӁ�I�@��Û/hHǋ56��Z�;����_�X�9(�l!Y
Jm}Y����ۘl�+�u�=\��}��-�t������<��9�Z��%����sy�c���8�8{�����bM vx�Hk'ѱm&}u�d��A��d��â�@���g-��[&����Q~;���Gܿ�<P��١<(�C� m��7�[�.	@�f�?#j����1� �f?�� ��}�k
��Z��>2�w��Ɛ���kn��Myj�X�OJG9��\�4g�����xw���1�|3��6{eȥ�3^����.�ĕI!��dxd����~�E|�.    r|r�(~x6���UD����bU���q ����{�_?H�1�o���#���7-Ŵ��l�������2x�%:�עNr(U��ݪ��]��PO_�{�)����Vd�CPXnӰ84m[.������A?� e�IY�g��������H؅[$n�RXO s(�����?_������$�%߫A-���$O�73��L��H���13J��wM�4�]����k)'��N�T�t���ף0�4��A��2w˘����Y�/��e1P�Ɔ��e��Y�'vZ%�΅��1Bƌ��*酡T�^��?>�+T��Ok?f�e�����?�������rЖ�ýr_XŪ`TF��DL����$/B��B�1е�t�5ya�lx�@��(̓��O�+R����*Z5�y��{�XS��{�s΅��.�і�hw, ��잾���b��������q����^�b���\��b��L��p�ݎ{M��V�:i�[���^Z�:�mZ��m��/ t���5W�zL����]�'d����36��.�Pu�~���z?���O6�5v֖{R�)55�����e·)o�:�Tz��7��8��&Ι���$����E��'��ZU\F����8d�m'\�橫%���X��K�����co�-����]�Ϝ��b��M�>�HΕCpr���F}#'�&آo$]bb=H��!,��(�L��h�S��
��XKЭ!��lf�Zi�@/��ХfP��J�� ��Ý��j2����;�W�l�f���T������謃QP Y�)�Sե�	�^;8�a
�I�+��C�?>���A����=����>���_~`��|���?��><|���O!�w���U��������4�ј�c-�$H�e�
>�v�T{��~A�\�� uU
á>�+j�Рw�R�Vl/y���q�QKR(4!J�}
g4P�u���#]pd��<諩��۠Ӏ�P��c�uxP�z�)I���	�T"��V76?f����(ݻ����׾� S�Il�kG��/A�4��$R���݁��R.�����[,(�V_ {)�������X[�����\-&�J9ǥ��[{�p}��������׫k�����[zb�~R��\�����<&�'�5�˦�c��i_8a���p�)m���;�eݤ�s'Ri|��+f9�KP��|�D�χ�H����J��co2��	�����=��6*1l&�}�0���_�|����֊fۏƕ6k֊�/G*'_�PrJ�ZFOH`�v5�{!�+���I���Z��2��8���lyc���ސ�M�q�8�q�%�/u��@��UA/S�t�x����-��i�uZ����&�d�n��.�U��/w���w9)��]���iAF����/�eC�4:Q��(�L���@�w��)�"���TD�`J���v�@?��,��Ay!�Q"	�M
�}�-��{���$k�L�TM�����͹��2����:eL ��������'o�!o$�v�(���ZC���hO:#���n��}�����Ni6�u�<�R�j��N��׿�Ke�c#��ku~/!v�QI�t�ľ@��k�Y�AάDU"�ci��~�������[����:f!�U�����_��؂����o�?
`>����ss��cm��ѩ��.��x���"��;#��0:#} �86����Ӵյ%�	����~�BL����%��2��Zr��/�(��	��[u��y���n� s����&��x�1}����v3�����4n���%�m�[cɉ������'7	^���L�-��;�b�������u>�s��iþ�6�����քȰ��B�֥�%�rK��x`}G�>����~)_�?���	�x4�r&⮥�1�����۝��=����`�UBW$�P"��sD܋M�t�U�	A({�O�^=�TH�}��݀�W��c؟�Z�Џ�I�;�t-V$�\�3����Z�^k�!<�5k��b!x��>��T���ǚ�ot �'�W�L�&��7����_����������G2R>.��u{�<��F�q9�׌�5�KM�~��)X����j��Wj��T]G#���o��3P2�\�^h���2�T���P�^]�DF�7���Ek<^0��"�#i�O���:���^_�.�H'��:�q�\;��2IZ�=5������]�RBS��#�o�\JdJ=,��S'���>�}�����J�(���m��b�KsҘ�z@�=>���[���͖���IK�rPhmN�2��=�n
�\��y��ӳGw�������_r���b�>�fm
e�Vб��(���*j��|0ŢY�ɴH�4���Y+��v3:ps��^8U��	��1�-�_�S��F��P�b�X[C��{Y�*'�.2)]�\����?��m�i3�y�ht�+�yO�<�"�OPn�ټu_��ۣ�_,�XKI�v���t��<���H3k���^^�f^��b*6�iP�������HRL���&�LA��ڠ��=��q����)�O�-�fE��
���cMI��^�޺;���p|��z��H�CPe��ŝ�8)P7w��`Ŗa�[��-�:kƺ�a"hJ���hq|�DBn,h�A���i3�|��cձ��.�DƵ��^�	P�\bF��i�˱P����)̍�b�y�T�yXT�'0���w���_�#?�r�J
km�����XK�ǷBҔ3���{X+�.�L�!&���(�<�q�hB§�r9k����r�8` �1`��?ZZ��'���d ���{+3wk��ѿj��`���Ӵ�t�}�r��T��+�;�5D��{��,���{K7�T�%��|���@�eG�3����Ժ��Z�L��U������E�A&Ű"PZ��KP�y�� n�~��>�������ي��L��Z�z����?��/WSx��~8��nk籶x�X@����1��wy/�~D�MmML�Ԉ�{�G3�����B�Y��I��$��_!	]���ES$!sT��e��"*T#ET�C=��e�1[��籓qE����'�є����T�ƋR������ؘ��;�q]}�Di�p���l8�y�k'v\�{fK�!p�y�u"��F�#�i��6N-B�B���ّ�|,[Y٘P�9Ta���-:�M�!����=��hJ.D��K�J8!%���/Ra�A4F	�C�
���	A�3�z1�GYDO��O
�;N
3#)�b2;���2x4����e\��=�G|ե����S�X����ςj���4��:�i���D6EA�yhMَ�wS=���|��zy[B]��@��ox�Z�Au��	��S�$�E�L����P2�ۥt�ְ��B�1�\������;mWo����%�e��HAq�\��Z��hi[�A8�<�b�*�;xu8#B�Ɉ8{�w�Ǩs�l��Nڿy���M������jX��i�Rc����>�2���{1��Xr���v�5�%�Ўl�$BSbR���B�Bi��nÊTaG��>��63®��!)��X[���b�Un����	O�	S+$�p½B�)�`�t��4+��T�"b���"�1��(�wրʖ�Z8)�n�,�#�Q}4f�P(<!f��dOU�~j�m��|�qJB���(D��h!Lۍ�X�ϻ���Sg��9����{�O.f���,�d�]ޱ�[wm�)F��r"���Z�D�����
].�h�:M[�l�y����>,���}�8R�~�ǲ�������
I8��گE8L䀤;��9��Ͷ(�C�/��ֆ��0UG�����p��:k�gV�p_��'%w/!O3�\���DKŰ	2���f�a��i!��$A�3n�&��-�
�DȬ7!7	K����q��)��p���D�����x�0*_�)G�$0:��xSƜL�	-� 0+LK���,��W�Θś�Wp�E��%pi�ա����G���)L�jTuK�	�|x
��R�o�83���7�!Ȱ_0({����)2�Ά�킏e����    ~��Uv�-��d6�I-���J[+O�T�E�K�e����rN�9�dX4ڒ�,�0�b���e�j>1�!�Xx�^1�/g��*GF�5](b��4� ����̢)!!���DcQ��v=�H3��_�ɣ&}K��c4&Z�EUOט�0���g������'P���(��g7�ɱ#A��=��pj�G�����Ha)?�"����e��|i�"2���$�r/��x.h%�Bzd����@f�48:��)�K�������4s	x�Col֣���̻i����jx�S��y	擕��H��T�SC�1���`�yK������?�3�θW�n�$�I;���d�v�W��+�W��b�������Z�|Yz	;���8i�Gv���+��r���k�u��^�q��2�ʼ
f�+��<��	��"�3c���%�a��jJ?��Ap��f��(o�ˋ���r����@�4�Ǐ'@i�5c�ܼt��wvd�ۙ�dKC-�=���m���r�\�(Lx�-j���	;�O�Y��T�
k%"e���U͛"� ���gf<V-���D� ��#�?�-�h�$�8�:U*�%~wJ�Q�_�cYϹ�r��w�c��V�Dc-���Di�_�#��-I������8������7SHB>w	�k�FS�(N{�Ec$!	���W���z֑��7�o~�LIN����'�"?�3��౔馈!�eR.e�#KY??5������`G	���=���ҸDC>��w���)�	G���C[�as����O�U@&G�����L�EF
�ɥ
o8��v{Aǵ֝I!��s�Ζ�!�!�M��py,�2[?���-]<�P�g�Ȋօ���cZ�^Ĺ�SS����UVՏ����^�imt�j��2`M�Ic �)��`,���4r )�?�����˖M��+E���hr���@���9쬰��1��K:����%ʈ�Yg1� ]=�"NAӠtjaaꖌg�܇m��淭[2Λ �)�!$}� ~nw��t���K:��l�%D�,bn��K�mD+��կ��5t͵t���s�1��xws�3���t����ۻ_�Y��=�zWE�c�2�������~�Q�|�(S2p�(��c��ϯ�v!�X�b�N��X+3�c�p.�\�|[��p��K�.p7Ⱥ�䰰�g��~�qG#6�%L�2"�Eڹ^7=rj�"#���K,N�=��-j`����YF,��nP���	��sr��R�^N��l?.�S�C�7q#F.�\l�)r�xR��G�/�\{%���H^����M�F��:�<��������mj�$G�K��ȁ�"���Y�n����Ǜ1�~�w�{G�ȏ�F���T�d�\��F�(،��5i�h�����ܨ����U��|��h����$E��5����jMM�A'$�Xe�IC/>����MJ���.�`������	/�Tȓ�,T�TAԹP��~��emQ�sZ�<���B�?�k
f�6��f�.Z����%��&ь��/��T�YK݁;������jɸH�0wM0G�d^H�9�aTGv�u�r<���1�`؜%ݓƒ�pB�3��U-E��=9�N[?79D���1���1������q��sٲ����O�X�s��,Y'�Pzh�=]���ʦCO�s���%���ЄN�
=.=�"F�T�^Yr��.k�ڛ�@����}M�GX�]����NS��h9�}�둾ha��#m�H}�r<%�!�`�B'M��늎��s��N�Ul9�G��a0h��sf����DE0k��k\�l�-l�L˼��5�����5t�hJj�)�'�Tʟ	�!���yL�39��Lj�\g���4pq��g8�֩��dt6D0`M�&�y�9){�Ll/Z���e�iz�ro� �T%es!�5r#�h��/�0�8��xHi� �lVu+4XQ_׀i0�^��Z�.�����.����:W��i����A��C�ۦMg?�|v����n��S��Rn3(�~,JA������cM�j��s�RP��/�77כ�g�_�,����������Oj/ޞ��"l+	�:�'�v�竼�eݴ�� #���cuܭ�t
I��fV-�Tg�H����b���\|�������A��\�u+=��<�s9���)2`�����,2-���q���|����\n��H�@5�9�g�[q&�[Q�.�0�"�"F+p.9q�D�h1��ˮ���� �Tmf<a@gud�n�_�С)8���$�Ë�<�r���.��x�������=��N�v�7��*+�K��� ����K�?�s�2�ƈ��r�tH�m�,
��t>s�S���\�L�1b�צ'���k}6���3d�͹l�Dc� �\��V�*v�%X�$gʍ����C��#+�i �q�'8����_+�����ߦ4u�������}����O:*��`���]��y��������Ǜ�M�I�JX���~�ޥ�����ٵ"1���J��;�,�&�@��-;�Uʶ�`N�.dlGFCNttc�E�-i����y�-��P:Ik�0t��ysn�d:!! t!|�!��s([��! v�H�Lg��L�p��%�3�i��`��4�֍d�����*D	��j{|�|(ȇ�ЧΪ "�K)���'����4���3��H�HQ �Lg���\_����yS�Z?��QAo����R�%~}"�/>F�Z�R<j,�B	��
ʻ^%>��g!�gM����x(�B�!2�Pk!ǭ��>! � ���oh�*�*�$�2}�ԃ##����e���05�Q��92������*�?��ѡ2�Ӧ�/��>~.�_��)ǣ�x�q�t6Z��F�X%�CE���&60:�e���p!C�i�B��).d�e��E�XD{�Yﳐ>y�����s�r�	�`��!�ܨƏE�s�h��Y^���K=���!���hzM�,Z�	����:#yN�{.a�-h�)4֤�Wo����1�~��Y޼�:��=�YH7@����wK��t��t��:���d�Jc7#E���%�~J��H��H��%��Vkk���q�g�d	���:��eV�P��C��MBK����I'����p<��5�a�
�Ҳ1b`��h��#3H�����!�7�$��.�
���u@�J�� ��[m�Hx�˲��}�"�����|ܯ&O�0���ڟ<��u������2�X�)��*��z�_$a�.�W&E�k��}h���d�o��ug���j>s+���t@!&yMU�J˰S��F�ea�\�P�3��,�#�n�π�j���<�R�	ƢӮL�ۋ���An$W��e\��@Fr�K�L�=Ҋ���ƴ���H'XR�%� %�D���1C�}l����䚮%t��4��	F4D�A��a)�;�`FMP�ͥ��C�p=!hdʘ�X̞m��_���x}����ݳ��n����q���<ݷ��B�+���䫍H����rd��K�gy	�ȚvF���紓aZES7/��A��n��P���m�Z�N�H��=��\�u4�|K�Q&uF$�L�;Y���$�iiW?�n�/6u�ĀK���3c�����k�f�Kݓ����0f�א+�}Up�%�Q����6��;�����!�q����18-큔�6�f����{����+Y5��\�����!Fud���dk76&X��-9�ڢbpɖ�K���,K�)�I�L�%�_gL�Q�z�?���E�6?/z�QzTc�	oj�4{D��G�)�f���HJSJ����ʀߦ���k:��q'�R�*R���?�y���5��Q���-��Ps�˸�!��P�ͮ�7/���:�y�ɞ �J��OC�x��;��=���p��v�q�kw~/d1�^*((��U����(߾$��sǫ��O���\!��Z�z��� ���.tkm:�p ����R��{�u��SC���%[k��`7A�.λ
�牕�}�CC /����6�V�m>\UX��Ԅ)    �鏏������ 2�!��q:]����n�G��{.�XfS0�e�S��S�j|�>��P]��_��?<�8L�_�E�������:g�~�7x�Q��2w=Ez�@F��ԖKLI�Yx��x_K�ZF����٬Ҏ*���B�#��cƲJSn�uy����AF�
�gk���k����@� h����7�'5�*�W�.��]KF�X�;��:A�I�(GY��Ճ,�p,!ĶG��ܥ�ʀ=4E-�Uɝc͠�	a"�r�!�Ʀ;\*�CSz^D�� >�)NY�c������SX����E�T�;��ڔq2�F�nX�f3�,.���1���r��(�H#��*8o+xі�9\�XCS� �e��K���_J�%��}�v2,�h��I��� -7On��΃���%��P�XP��9�	#*�,�G���j�KJ���_�1�����d<��2�`���2>:���#:�F�/�PFASZH<��1~�C݅h!2�td(ߙ�d�O5�~pB8|�|w��ܼ��Ϊ�o�eb��j���	{O��C ,��)�_�N�Hk��<��=��e���<�.�on�H�=�.�P�&Ac& ��D���Sr�8{�l^�lecc����ބ������OسWŷ�lc�O��s�̴���Z)/�:�kd��q������ݜ�F����}'��s����N��������d,����J�<U�sw�:�,u*z���G�v��'3l(j** �A�����~u�����
_؁<я��b�|Nd����uv��c�"�B�.;��hO��h�jϾ�e]�wy?��5�J�B���3gw��r��_齌�2p�ءQ��@�Y c�:�&��)U*9GU*9_\p]pMa��2�Q.K5c�A�"��۰f�~m��T�^�<��jI�H`�����o��,Tp�|&���ʐ5�dj
X�)t&��%��ul{P�>��[��WE�mx�t6CR`�[�~�X[����؆Lؙb��02�x�^�W�a���z��Q�tV��%J�H�s#�����TZ�f?8�$*�/H�v�H\y�;;鰖?��V:���c�(4e8�|Ȉ Z��'�K������0��;����'߹�b��S���2!$*��9��	읗�o2��H��ym����q��)���4�D�N�|�8je����zi�+�z*���J�a
�|�m|y؇��qi����#���$�
y{��M�qJ�>JM�'��P	�Uٴހ�|��SC/��8�$5��S�<֐ܿ�����%U��PM��M$p�]�9�x] �b#���I�2c�y����>�����1�I��9��x�y��XM�^���"�B|]7d<�$�`�\�]��E=��9�ߙ��2a�Ȱ彐?>֐��/�r��;�Q�yAV�_S�x5�������4h�"�8=�֔-zFg�˺�nms�W��٥��.�Qm��e�����g���6��o�ʬ��oV�hv|�4����vk
��Z�����pk9By���������=Y�S��BUQ�d7��!��Lr�X5m��ܳ�d;a�Gw��eWt
��	N]���|�!���K�N��b�i-g�%���e�Н�@�=Z'��L�I-w%� �s	d���' �8ّN���J�����W .3�-��iL{��>��]�$���q�3�B��	����ǉ��@���STN)�zL��ǫ�>�t�b:�>�͙�b-��iIv3F��5���,4k�pf7��>��vf�6W��Z&������R��8�-��(��	ֈ��a���Í_ t��~�Քb/G�f�ub%�>�0p�&��}�Ok
��Z�#���
�A��Ow�˙���=����"�-t��l/�1q��Ǿ��;T�k�T�Οr�w�ͫ"�kV���6�\_.��RIǢ�5�8�3l�bb�^�a2g=w�$���XAI�H���u�P'_��#�:ִ|O�X�dX��B&��Tb�����42˔PL06'{�[���N��:�#��[ҭ����y���~xI/���y��Yx_�$赊�h .�h�Ƶ�+�Z�/6/�T�0ѵ�� l���@�	g�gHk��,��;��$����R� S�u4c48�&�����1�p�~I ���%�f:Ȳ���6�?]�����_]_�6�w�W+���k���6���$����^��Kv�M�喤�K����Ȓ�K�O�+�xJxZ���`rv|t�u��P�tdI�D�DL��u}Z�y�m�Z���Q��mT�%����H�DB�J��6d�'��(���y�(,��Τ%kd~\����[h6-�4���'�+���k�=�|25JA����f݅ҒO�\�~:r�x>��5j�vI���K�P0��Yj�I)�W�O���if�7��1̐d���A'�����F�kKQS�;-�0����?b�輤����Θ��vb� +�!�]S�B�g��"�lk*���Ȑt2�c�ަF��Db�MQ����L= ��q7������wS�٥%uTP�8iE{���x�i�?55�dQGy��ZN[3�E���Haq7Z��� �njxt�$����G�4�G�p@ip���,K5<:-I�286�ҥ��<z^�v�*c�)G�R��K��;Vs%���<z^�v����ܨ�R�NK�2q����8P�j���%���L��l�\�U���w���̤�(������H��d��5*m�TH����&���V���䍶��GC���1�̣�dm:�:�yB ���g_����qEfA$��$m�=��+���h��G�%C��KNV�Q!�|B&Vz"����Vj� d�W���:i�&=�1��ԽO�����qE
�1Ag��Mf�����N�){&\5�6A���T����f�db�.k�!o��K'��w|^r2�vs��G�x/%(q7�\�b�2Pv��<Zl0���Z��SN�૭�I�%.J����̣�8![�Y�h�	Ur�$H��֙	�wǼ\�T$]�)[���K�T�At1�+�'s��ű+�(�pW2i�z�A|����I������������͟>�_ݾ���������o���
��7�6?-�_�\_����7���(��~������0��|/����R��|[�|~+��J�5�O~:Cqwc]�3�ʻ�d-ܩ���Ƽ����t�sM��HF�ͯW�����O�|�����ջ����?ݭnn��?��\��� 9ı�3J�����3OoE@�SbY=-8	�_O����sl]���[W��F�a�l�|�}��DZ�%Atd�6ǒ����H�Uu>��V��uR�~R�.@km���֌��Z��~Mg�S�3Q3kHGg+7��~�&�'-=��D��2���ߖx\���F7�P�7q��@;��b�%� �2a�����/�*S1.ɖ<6��6	�p����뺮oں+�Ё��0Y��mP�n��s�ʩJ����VCZR�������Ѷ�30�3��Y�k�җ�:��>t�t\sg!J���(��dA��vtT똜B��RP�%u�$e_�%�%	J����q[����ð��\�N.�
דӁ��т�Z;	y+��ILN��_���Q���ϼ��(�_R<�
M����W��U����鵌g �~=�u<{�Xǚ ��e�k0m�Ҡ�%?Z�=�W��d�M�G/��d����>0��{iA� uJ�fsr�COJ;��^V*hL:��������h����t�`u�2g�g��'�q6�;���.E���������v'�.�M���Qjg��zz����I�5	��*hF���e] Xb<() J�2s�wR;����?R�a�Ҩ�����{$��kT*A������P���H�^t�UȘ�T��r3������Ӯ�'���AM��ie3&:<��2iu�>�d,� �B�)�`����A�.dIe�����l�L�C��_��Ԣ��Pg����d����b��v�G��:�1h9wi�>�%u�!%y�sdc"�$n�R"��J�r�X���|�7�Jx����f��on?    ��w�on���n���~�������7�7{Ί7]�J䣪�Rl���;:9#���g>��5~ζq_Rӥ:��X.�X$�T�M�xHYr'[ۓ�;��R��P�`��k�9	�ܖ�5;d���y"?>�9��l+v�ԁl�\r����N�������,�b��=@�{�%��ud��I>}l۪�fm��K��Z�+n5��� }�I[?3��ԃ�2	f�j���p�pNRu� r�V-��v3����E����N��ԩ�y�
�v��@�V- 9�9���}Y�q�������n��w�ώ
S�H`Ԍ'es4��l�d���lL�d�<��ҤNP��������v�H�nz?qi�{�1�٤�Ʈy;5B+B[�;> �M�����~֊�~[q�<ۗI#���9M��H�
ɨ4�Q�IKƦ��k)��K�[�q��{E���
��9ML�E)����l �N1��91T���t��bcIaf"����=a���Af�N�# �A%�f�l�h���eN=���l&�yEs�n�Ju,�s�aUߑ�bl	���T�l�(k����?�r5���e��D�{7��*cҸjg�e����Զ^�5@�+�^pF�|P�%Y�.�thȽ�\U��d�L�Vg���\ر=*Ӆ�,�m�X�������w�
ɗB�L9WpKK���F�ݽ�6�� �Ⱦ�D��C��N��2?����fa[�g�U-YҒ$n
�|���%�kQ]e�Vrk�
*WK��ey[�,e0Y����ص����N�Ɋq:�>��\� �]s��FՑh���&K���0��J�C�K�]���d�}	KƐ�T�\n8���jIGC*�K�z���}1r���G�'e�4g�8M>�T��K���w��&��_�(�m1Œ�>���se��9 o�Z�!�[Gk�S8��&2M�2����r9�4�%L���N"
�}&U=al�֒~j�W\��*k�������ɝS��5r���Ƶ�)We�+�Xf\���&W�5e�K̍/��{K��e^M\bތ�Γ
�  �eWȒ�[�mqҩ=�'I���� 65��f&6�`�6ϻ�7�����U��KK�.�>L:�W�K��:*#�&�Q&z��L�3t��v�ZQG�C����y�iI'nW���M�k�X���i��W=�!�M��	�tF����_Q���*y)��%-?&v������n��0Ū
 �����@YxՎ0��Rv��D �tE�ke����3�\ܗ1���#�^O�1ky滤c9�˲���S);�̶6iFB'I���4#o��}>��C�'��ۉ���¥���{��H4.7�U&\����v�Rk|�K��tz�����Z|q&���S{EH�f�?�n�(6�lȄQ#=�%�HZ��P�r��%�V��Sտ�d0)�X��e$@�t�'eӾ&{�TGz��Ȱ#c(��P��+�E��Љq�&Ly��Z�!ҹn6�KK���#_��yI��+A�:�Lw5,<.�,�5���C}iuvF=�Ki3��P6dBU/E�2[Rj�1`>�����>�I�mIk�tj�걦0g��H�4%1�ܫk��ӒFRB��.�MX7�2c�h���My�fn{��/W*�gތ�	!�B	��T� k14��T���'�e~�4�sJ�~[����4I���D-�0�_x[o|��|�+�v�
��$7>���� A,0���XEy�z	���t�}3]�w*��� j��a��3A�ӥc��>3��ڵҬ(�;nW+V�ٗ��6�97Q� �8��̻��:!fF�tR�}�T����s�g�z_�129g����K�%0����&qMV�}�bf����p�ĵ�O�3�T�':���]3RM��%���,��
a�����ҾRD�$=*�6�b;�����Y)��<��''K�"5f�{?J8AD���K,q_�V�s9���8�%s�˲��B�5�8{��	fΣJ�"Ո���W�AL��w[;����S�|�p�����&,�L,�qt�~���XҾ0�z�J�$|��.Y1
��L%����#����ma���6�Ԥc��:�ָT_�ӱDT��r3򶼔�Z�:�I۪�ZX��v�7Τk�ϭ�5}fT���Ҡ@�Z3��,�`�y��m�sF���Q�u� ��,���U���`���r6�����d&P���s�i.s�|��#4���N�m�a�5)�%ԤIɒl�Ʈ��5_�'U�S�v~�^cy[F"4(7 �@AW��dI�n��tJ��
5C��KJ��}�M��T%��w��e`!��NU<�E���"���U�O�M�D�aA�g�*�<5Tg��AO.�5��vC1%�9cR�nГ][ Gڣ���j��S��!֩Ǒ��h�3���!w���bUӤ�K�>�f�o����}� G�L.���4��%����4j���%c�7֥±P7���}�K����9Ō�==֡��:<�a���T�n����,�뱎ݟ<�;v���r�H[���\���n�$מ������fٍ��F���4@��,-�D�hO�Ҋ�h�6���m��h������_���ZQ��nj��%���b��BJ�
x�V2�߀�C�yeC�c�)q��-m��9���Ԥ8I����&�Y�1.��C�$��$8�3\���^�y]QiW1���l��DA��n �yD�}H��r����g������̟��wn��V-5��oǰ���ڀ��-���Q�Λ�e�����a��-}��h�`&r�N�(A4$�0ڧ�*�T�� �J��A����IK"I�Aڵ���D�$MT3f���ah��S0�z
/�M�Ǌj����bL����t�v�C�%��ܵ�}���%\��3�8�;M�fAV������s� �qDHy��&��6�b�(8��u�X\	�̩�`n|��T�a�pWK	^҄N2M���&�Ϟ��v���1�?�Iþ㌤6hH�eaꐚFD�4�!I�!�Ԧ�)5y� !8M�e눦����$tұ9a��D5:x�$b��'>4u L|���z�F�dR�L��K��u$`�a�5�\�q�R"�-�OW��pK�'%3��}��������y:����巬�YFf�A�h�{���OV��$�s@��C�DY2�~wL�;T�dK�8�϶�pMN/`+�(r��_S�qT�tZ�N����!��NfP������ut䡷`�[�IJ-2�K�6�®�xh��~p�I}ރ�!��:�sdmfDq �Շ����o6�כ�ͻ;^Z��&}�N&����w��?�������[}{��'�7�Z��wo��m��>j��c�?��r�$�n�G�ʫ��R���=���^�zx�o�~�ȗ�|��g��?on?���?\��ǟ���������յDh���k>��Y����${s���~���W�6#Ò����c8]��^�{*o%-A	�~�������Fb��y&�<���R.`fL��(H�0:kq~FJ$�A)}`5@%�?\�_�5��\�xz$m�i=�<���t4��Ǟ_�zV#�|��N���n?\}�M��Ӕ8rů��b����oq7c�#�ٷśPJywu����'?�On�o~����� �r����W�L�?���OW��?]}x�����΀yy���������ZG���XS�_+��@g���#½yD��o�a�*���ȗ/�C��a���9�Z�Xc�� e֔�?90bg�Pl�$����lU��qA�Sn�e]9i��N�e�T�v�U�y�JŖ��+��,��+['�|-�+�0I�W��XG���7��>8P3�l�S���*�����c*��R��߲�,��X�(�l�$��f&�h�X��V���*cv�`NI�����9�j���2��ShU�j�R@j;jbΣ�_��z�{*Ç�7^C=N����3=�즩� .�ug�a	s�gU-n쾨R�N�A�j���t� �)�����u�XW+���Ra^R:hU��#�pQ[e��rZ���B���oHwp)�99z$cWf����/n�kR�&o��v�(*��̶�#� ^���{�2�ߎ
�E�[Zv���MkN�^����	!�P���5'�/����(9�,�5'p\�}'��
�9��y    M��Ibk��t���i� S00t�K�B.^s2�$��2F�k�)�,�����5'��vM���K@^r2�%c�"�f�I�|��7OkBL���Ut�CTCF&�(�����g��ݸ��o�t���������\t1ɿ|��Z�����K_Bg抺��`d!Ʉx ��߹�>'�^�\���]J��Gw��t�[�4��s7�7�w�W�}c:0��)�1I칪H��_޽�x����w��c��y��cs�0W�V�=i�������X���ܪY����b�J}Ʉx!��_J
R7��6 �����6Z��.�A]��
����֘ sg������^ߞ֤82$�&�I�j�4���Aͦ��ak�B��ה9��Ӛ-���M���kRN�1�N��6^��V�<0�D�v�5�MKN���x����s(�y����U��5��4�h���!�^�Ա��Cͦt���YiM�W^w���{�2�P˽�ĉ�Ik�(�#��EБC�=�2J>P+:4�@�{;���|�����ǜ�kS@J��	�Vʤߋj��m�~��A��>��>���Y~�*�w������m���<�%#�n����{92����JG'*K��>�������5��N�/?f��5'v�W���䭌���J[���^9 �*���|����z���{�Ԯ���cʄ�W�bf�B�5�[c茧�.�kN���M�9|D�S61r>�a��T����h<J�i���\k庹H�N�~mmp�	U(yM�܏�(g��:{Z�bq���/�Kby�ԝ1�Ug)� ��kbʗ�I| ɸ�T-�=�	�V��,�. Z��r'�iz��E�9!C�?��T�/ӚS���&_�饩�e'�<")$6��`}�����d��:��d~9�6��bu@��h��aN/N�i���'�O}�Xk=絶�gm�i�׈�3d��b����&�/!'�Փ�h��줲�������v2�xI>uD/C*�����B�~�L�g�J��j�s��xzR5���z���+�&tڎ��<��>�V�÷k��.�;vr�fdEc���M	ф|��W�o�L�8�>Q�/�?�#�YԺc3)O��jz;��� 3��̲J8��@Z�ҥ@2G��UW;�	
�Q��.H���)  ��xz7��$�o,R6�d�@G����F
}���V
�5�ۄ�B�G4��B���%����횺�*��N��L���_��ݳ�qs�Z������g���7/�?��"�HSP�a��2xl��f�am_0d�bz��~E�A_�!���:�X��_t$��Bi\#OR���<oz�^3��ȌDF�0��5�&�i0�Ń��I�j\�1�訍��me��)+��9imo�jW�"�	�Q62s��3�YW�tc��k�{7�� �M��'����t��z�v����j��pw}���?��o�k���w-��Wt��
av�Fխ睬�8	��"~ � ��X� ��؛|L�!��s�[�&�ؤf�E�p`x!Q�[�[�y�����a�b�����?��m}iƌ4���[/N�/�-3�j|𺍗�o�c����lz���1�Z�����4�M7�8�I@�K/�7ִx|7p� 9�AOh�։i>���6�}��fy�����by������n(7\����}ȿz�z���������w�}������[|=Br���?���O�x7��].�ǳ��7��~h��v��A�[���ݽ[����d��qe��	P����cݣK�ޛ������mY_4^}:@ބ"�I鯧3E�˘�
�ب�S�ST����Q�����#�o�;�u�݉i�C��z�{��*��b�駫���C�j@��zwe��z8��n-
U�,`<�ضn�ׇRI"aQ��ZQl-Q�W�Gk�^B�O��(�����r���ݶ7y�1܎i�t���=�gH�E�&�GczZZ���y�{�̱N*M|���mԜ��K�i��'Ү}�/�n� �A���!�����n��[�؅��_��/85T�T,O'$雭0t����HWT$��D��:J����h�drk����"�8��2!s쓺[ma�$O�d"-�f4���Q���F�<R�A&t��2�v>��A2�B"3���8�,8������T��7%�+������ߗ�\>>і��`�8���ܱ�{��������\ Υ"+ߋ ���ټz_�Ρ1�>��m�n�xF��V�&�+�B�L��!�Nn/����7< �w
9����Ս*`Y!u�N��0 ��D?ݨ#��� n�È�s��d;!W����ڱ2u��ߠ+�"���%
$]�C`�9=�\H�u$2|F#�����P�	����٠��$�ݚ�<���j�IȒX�R��_���KH�k���DP���^M�o��{�����W?F���(���ӥ��Mg#
���Ӈ\����K�R�^��U�����[�f�m���zEʭ�aI��b>cu��*�y5�`.Z-���J�رuk�l�f��&����륾�{����^/���t��>�r����//W�f��v�+6j�����5,�����f~'����/��������o���߿��u/2�m�u��)����xq�y(���!�|E�_����w�[��i5Lgs9B�#�����!\S�c�{�`;��&JI5�Lp�dAM�-�[�}�dR.m���fh��������X���#l�\��gO,.>���/��?�oq�������?���fqNcL�Q
k(��e��?E5&��K(�4��P�Ns��@����B�<	�׳�'U5��[ x� �ޘn�i�yrM��M;1��.�b��m���f��Z�6��.[:�U���&�	��*�E,6R�q��N�ɢ8�X�������M\�3PF�<N?vD[{d'޴�g
�1��:}<̯�6�6�������wO�W�{)�]�U�e%��J*�z�ׇڞ>��E	(�Jф"lhO���}N���ԗ�p���$�@z���հ Qn?���}�ܖ*�Οo��%{�������1�p�X��lC���W��v2F���y���b�k�(�.�aO:��4��)=}�!��:�Cm�#Z��s@,�1��q�ff��9�!q��Yx�ҕ|8'fc�]��V2�m �'bŪ0ӝ֓n����Ƴz$�p���qt�ly����#�ǡ����O<���v.'�J�������9��,��ָ��A R�����.{��}��er�]g���=��ă�xS��N���yY%��`Q�׮~H���Ѯ�E�0��K&ӡ��XW9��wŔ���g%9@��y�ðz���e��h�I�:��*lm���������$�66�g{)?��h�J��I�,#�ߡ����M��&:x��P�`)�3�BM���w�Ph��������Ym�Ew�3��֮7ޫ����l��m9�
�Զ��*~=��¨��e���3������Oɽ��n�gN�|��݇Q�Zݹ�'gʏ����"�.��xR�� P�B�������$s�֌Q6����Ņ1�Z���ڗ�2�� �Y7��劍6�BD�U�����`�*��}������&�*�qEä�Q9�����撏e�@���w$�'@�H\�~�C����p���J��ڛQ%�F�@���mY�j�#��.����	UA��
��+�G�R@eֈ�����m!�G���#Ǝ! �q}8C�m�6T7�zS�e�*j,�hS�z�7T��F�9)�����F�;��"����xI��0 ���,�ހDK�׸��6 �O)����2���◠hg^�����ka���Q�y��<q�g���������H�o 8�L�ʃQ����k���@�[���ݏ����'<�C��|�1�����D�w�4���H]�>��C�s���GK���2��9�/_��C~��4O���*�������+{?�ξ�C)�69��������ay�u�9�jyۢbdwi+9z�#M���.-��{z�*y�.��Z����D��ϵl��q��)�)[�9�&�:Ӹ�.�ȓj�~�"wa�' �  ,�f�&n`?��#Y� �_���4<},3'��'�_���9���%�`�A6���xx��^��آ���x�מ����ZE(��K"l��l�.��u����G��I<��u4���F�ke��Q�����y����.yZ���<k�B Ҏ��Ȩ�ۜ�������	ٴ���E��9�`	������eC�'�>�$�JFզ%�Gp��32�^�W2�,�g��*KUu��4kz��>=�@V�e���dȚ��mI��Է����vZ@t��v���j��QB�������(-1ǝM?}�K$B�bR��)�
���Q�t� |���:���*T���7u�뫦��p�yaѩ���g�Y�.YG�
ŭkT*'�E�3UɅGz
k|�䃸�H�0��(.����B1����
��W��ٺ���D�:.ר���<Z�;��T��$��uQq��zC��\"�hbP
+*���K��D������S����nI�o��y�HM5�����u������}��ɹ�F�B��Gղ���܎:��4�jߘ�'e]7j=$m%���|� ��%B�9�!O�	 �%��|A��m�∫&�T
W.ɴ�1�tJR�5�K!�¾�~K��x!��}E�C�IT�]�DR����A_���ip���B�U�c�y��>z�ˌc%��t�^��A� �.%�\cP�[��y���Ϡ%      i     x�]��n�@E��}�0�G���L�OӍ3�22Z,T�^LM���ܹV�Y�!#�h6R+����Ċڴi�|��$Y�䵸�>.�v�U�/~�^�2:��v�/��?�+kO�R<ȇC�^w8s��䡪t=�}�4�2i9���K��^�$$���$LM�r���GS��ٰ��R����ƙ��$L�!J�c8&��O�;ǯ�.&=:1*����m���0�o^��h3�0�` ۰�k���W�̈v�������J�`      ]      x��]�rT�Ҿ��)��)����1�8��T�e�M2�`���jif��<#��R��m-�_���K�������������޽�r��=�6�ovv�����G��(��P���e�B9���-m^��^�~|u~yzv����輪Ig���G�%�6�F�N�߽�U�II�T�����Y�����w;����G���e�>~a����[8�+%u�a1�Bq��FɆ(,���ڿ�n�>ܹ����hJ��ކY�G���Ǐg~���?"��2�[�h�x�mn�4�C=��ǅ0MD�a�(�iPII9)��rV������}���2f!BCI߽V2���	#��Z���}�����Y�C�g��o�F��{�ut��XH!7|v�c�Ң�H,%��Og%�_m=SO�r���Z�������a��^�u���d"w~�:>8݊�\�$�->�.��0!vNd�	Ay��T�d�Yţ��j�._�I#�*|=J	�&�Nc��^jU)�EIG/���G����㟟�� ������N��Y(SC�]p�Jˎk"%%�ȃ׳�_v~����u��2.M��J�[&,|�4�_���4�"�P��x�ѧ������?8��e�����i�i��V�'**%���d�_�J����||q���Vh��O��T��iOd����?��@GC�������?��wN8B�%.��LG�nٸ��{=f��7�c(i��>�4+yu�}y��d�!(�O/�ף��\x_��8z!�������b��H���hA:�{v~r���"�KX��.H�/��]�е '�h��z���xA��8+�f/�<{�@���A3%����__�z=N(&�u!��N��W�*�s��/��=��{���"�,�w���z{f�����DIG�t�-� �?
nXwJx2�6���ǘ���DpJk�$R{�-�`��iJ�_��>4��~�u����4u*iKm��E�.d}���Y᤟7ެ���n�<��I��	�]h�'bhN'�v�s
��<�]��nm:���@5�N�������M�>�9y�T�fQ��:��ևnU��B0>���O������<�����U�m�\
��@�	FI%���ո���A"�����IV��0�x�
���7k{w��ٓ��P\h8���)؟�K�E,���
[���{T��|�,}0%�����K���q�#oV1���ȼE�,�M����~r���F6n��k��ZH'-/�$}���p�������^�U	�{*$X���\���x��*}�MG=ŉBf����:��4s����d�-��l�J��iD���"#���Ҥ�PtR�R6-v�<�0��Kp�Xhѱ ���� �Η�E��ƌ���ʜ�p�N0Q���o7�`_��V���8^|>j2H���}m�U�u�I���ZJ,R
AM�Պ���ແJ悍���qW�����p�B��o<iž�i5]&�=/����!�`	�5K��8�p���{���¹�{�_J>�֥�&�v�/C�D�J"ݑ��(���������3��=���͔l�F0ҥU��6�dh�?��T(0���WАķ�!�����O.UC��7�a:��-��:�i?���S�q�FA1.�qr�(�hHx�=E!8�w~)w�Z��oy�	ja��uL�+�V81Y�r��$�-�����|{��+	�؅a�:;�i3T��녲L�%F�^�u"��-������������5������ ����t�L��H�$T�8-�8�w�dd�:������XD8AE�iE�p���2p�h��x��E2�|sF�6yj�%J&|����w���J�߱q����U�c����X�1b��'ItLl��tO��U�K�4u��G	�c���6.�nؘWa0�[�����8�E6*���E:(�:VWKۯ�4�H���Hw�����M��82�Iʪ�ND\��]VL�ͭ�ßD&��6<�r���h�������l2j[/��F[⸅�Jy�e!�K-���Ԟ1�9�ɭʰC8Fk�3�e����ݡ��7��`��to��S'f{v�3�H�Dv�f`�1�� �/�p9��[�PХ0rp���� J��WӉpL�&��s�"���+f���	H�Z!q�J�w����� ot6�\߰�g+�IW�-�N{MY�n.��y�t�����Y��y�27à�jԀ�������73����@�P��F0��ˁ��_�tno��n����?㨅BW.�0�U�ٮ8�@��d$�O�i��tCd35$�4����0c��' �XJ��±�:։�����?3O�8$�!�y`��MI���<��meO���e�߰�!Րq�!���L����u�|6.a!��QU��c��7�5�\-b��q����r�&���:	[ݓ:}:�@ʹ�o\�$_JȾ|c�����U"�G��"�E���+�M����ꗤ�|5���R�1�bjm
�.=B<�qb��F�}��� �1B�*P|s����5�3m7�8�h3�sQ�������&�3Y�OU]������bw��&,��dܫ���51&�t1����D���s�jhs�g`Kӟ�ol�	'(�4��n�\gN��>��~����ף�qH(�!;.��G!ǘ"�)�Cq���\���"`
���5J���_<��L�Q��w�}L��cMt�S��$4���ptۘ�o��_q����B���I{,(�М)LD�"I���z7�xj>�����>G�D5'+s��6��'j�ㅶ����|�߈�yp���<��+2)��By����"�����m����r)dA�󇳎.����'��i�I�2��"����9h۸�4M���[FIǻn�T�xc����/��^����P�${ĳq-��"��)����:Q��Q��9o��j�`ḇ�>�	����.��'����*>��'i+�?.���<�E��*���Q��\�������5q���r���H�>>kQ&4�/X��0g�Ц8��4��!�	}��m��1X/�;�P"��ҡ8i�K�	�FP+;JcF�H���Z����wË\⤉�Jj�N4�dC�+����ґIX��̤�9}�����F&�����'�)p�ӕ���A8�D��p]'�� �}֑m4��\K`��
��D�!0;!���a��6�?}̸�ȥ8F+��r�{F"_ˁ�7o�q��>Ȳ��{�8V*�:�x��5�5���x���J�@O|��c2!�W�T��n,3Bdn6����s'm:�4i�"�#�;9f�P(����(�Q>�$��h��1~��q7�o\�-~�
'�(dK���1��gw쫎�q��"zs��`8��5,����@�V��b�l\A�e3��8M�$1����m��wXH��k�ڸ�K��!Zo"�.�N��U�s����T7xF�*���a%J�v@��|�{d� ��<]��U
zM8���;Vk���@(���X�$G¦�;"mw�v�e�Q��kgn	#�²b����a~������g[��p����ܾ��b�A'���c�Nr�U��ք��o��A�22�K�JZ�V]�ԓTH���$�_�������l*;*Y\M�/r��6����"'��x-�s�h�������~�����W��,.�BL#Z�ʄ�`��F���Ր�Ee���'G��j�q������h��l*i�:�]Cf��s3;��]ߨ�pS���-8N��U����cU���Te\C�'�u��9�S`����"�G�v<��F��`�x�D�vO<��('H�A<ʏ��9�_*ϔ[�D�@�Co*�*��� t$\A��V��<�I�}t��b� ��T�Z�c�e)�47���Hҍ��x^4�hސt�0�Y��HG�)� -Èݑ�XA�dej�Γ��Zڵ��~�b	�1�^��`�ce�_ KO|�e�hH��L�K�SL�	��KĠ1�#�l<x@WCp��&L[|�g�ݔ�i3A0�P�    'O�n���8i�FH�񙝠Xr�|IC�7�';��K�tN
�M2����"��:�H��S����!���U,9C�{{���#�v.���hXqN2}�z���;Bl+�'��L��_7��d���:5��ʿ�Z��Oë�e����v�a���;�S~�̭����JL4އn���#�d,<��M17{阀�NZ�MQL{JH����iɝ�?3����I���^�N��p�/���	�m�KJ�
��#A����9���(H�n�R`�t3��S*3������I1����oo�ב�W?�n[�֊��"�6��6wV��n�ռN82�8ߩ�-�H4�;r� 4����W.�1Z��"�{f��Y���u����Ll��6!������H���c�����H9��L���O��I�fd�1 ���Y*�~5XJXPb�������=��H���Gj��i�%s�{2be��84�Z؎�<��AA<@�F�[[(����œ��ӆ2�k��s�Ʌ���P/�:m���(kIڿ]�5k)��7w��nhc��.w��a{Z�N0zmp���d�
<��E]����}��hF(��ܶ�4E2yi��ղ���q�L+0Z[�;EԢ�#�Yr���ԭ�߯w����.���29А���n�5�R��Y�uX'I��c�>����/�~պX��<���l��^kE3y�g��~�T$;�����xx����Ԫؼ��8�$:���.V�����D�#�2z�M����O�wk] 5&)UX.�>!7��K��\+�����[��x\�ʱ�ܖ�'���I��-Q���4��#����\��-���!-od]4�6D�X����r�$��-�e���S�pҁ*C�!�9��\V��\E9F��j�q���Ŵju[ľ��:2b��hK���"����8���Bn��iK��۴����f/�q�	�+׉`��f1�稛�2��W�/�2t���e:V�ɑ��4�2͒
�`���q��:��Z�����]}O��dp������Dq���#���!���޷����܅����d۷u{6�{��*9�k$��I���%�#��<}���]�����иͤ	��꼨�QT�����$L�}r��΃�;�~������Ή�Mܓ�p��O�j�(ӳG
~Y����̷6]]'���L�=S�Xt|���ظt<Bn?���p"�3�)���R���ap6n`���&ǉ�#��jE"�~��C�FE2�:o�I�((����C:��]L$E��|{�b�>s�6Q�&("�,}M08�0V� �!a&,�ϒ1n��ļ^�xX�Գ���t�t��o�q���Ƅ��L�/�h����	jb����U�����`���J"����.�%��H� �F�;�(DH�	n�GQp�y$�U�S��g޿09�З-8ZJ_s&(�c�Ұ���'r 8�"b�p�Q2v21�ZQ,��iZ��?��_�x�̆�$e7�����'±��nJّ�Rwg���X ���R�+���<�{C���s�]6��I�ݭj��|��6xlo�O���N�/�Ÿ�j0��a��bnôb�	)���rV�ӯO�N��kz9�/\�|��c�-�3�D���"���m�o�aT�p��ߒ�%�5�1 M)�K�'� ��R�1Z9m։�`GJ�X������'��p��oK���׼�s���̴b�uj3��@h�=���(�ٓ�!B�0:��!��*R7qR�`2�|�35���[�H�a��ۓc�-���['c�&>G
�X���C�ս�sR��B׉��?�0�V|=���j*�亂�Og&ynɤj�����7Qi�6D�C���
�F�0!l%�v":�٣#�F�c��f�� Gq�+";f(B���\�c��o������@���L4Ք��0$fn����t .zWr��V7D.w�Ӝ�G���s�q�z�拠@��n&�h�QA����i��V���gZw���씓�|ba����,�G�u��бPN2CdD��|����#�+��9ѻ�6�q�[�o����'��9�������k�n{�����7Wf q[)��:�����T�O�������F�}�È���W��W51��2�κt���yG 9MY8��[�t�N�N�8�Lgmh���_���YT�������#9�
�Z�C5����HOJ�e��T��I �LF����O���p��"�8�����	�v����u�Bi�8z#=ZX��2��l|_�D�����5hiJ��R:o���|�&FA�@�$��W�<q��󯰻�ơ�h��k�g ��l[����(�|�Ks��q0au_`�e2*�����Qsv��{nL/���6N'f㹊���FZYu������Ň��l�A>���D�	�N�$R[��#�����>:���B��7�&	UFVp���|�[�U����+��c&
v>V���B�P�XF�Fԍ�|x.¬��w��|���^��]mn���&�V���@��f�	�oRID��a�˯�ݧ{y'����#��%�*�d�����J0�4��E�"a������������|Ǟ��y'��zh(�K��G-%	���>j�z������'�A{����J?�����o~��X+���D�#�q��^#�����'�ϫ��r i�Xt4�{{C{���V��r���]�n�O)�?i�p��l�M͝���U*�&e2D���J�	�Bh-E�5��~�b��R-�ǋ�q�Z��p*�Χ��qYD���l)۶�M�h�?�`�3��vH�x�[IAW�ge�Q�2y?�����$qGz�1�9K�+��DA8ɹ��5!�WtF\k敲��ԣ�y��$�yέ��X�ޠk��S��A1|��i�"/m����U��F�j�+��@.��u�'�)7�+tNP��sJ���k�k3�C���n�\d	�s�#�*拲qS�V���Rpb�R+�<�MG�t2o��D�� ��3�[p\�K��{»��u��~�	Ƽ;6nr�����J-�\��Ѥ刓�<<:n�Z@�/iYp"~D�)��N�0����R�(=h�Q'�i�Tda�C�V���9�Ŀ��6�N�j�J�p�Hk�b���BCGÞ$$��y4k{o��;?pa\r&|�� �up���j��o���h�ZQ.1�D�STw�u���;��@�Z���*G�;u�PB���*{ '���h<�g���[�җ�}���[��6N��V�"	Y R��}���;}�Q�n7�
�ļ��܁��J����8QH�����.�ѻ;(P���4�w��dA**���zfy�b�1�9	&�5��u��]T��q���w�g|�&�4�VȧJµ���ڂc��v��N�����.�Q�Ƿ�r[>�\����W��*	(J�,�%�# q�Y�<��Z������k� �^�\C�7�g�f��x/	���dn�����ݹ��u�ˏ�D]+ǎ\X�Y"�r_G�n0~T`�<��D��/�语��>��g�L�@i�,�9�tЈ���Z�oF��)R��U�������K��Jq��$�\s�U������Z�tqD�S���ߏﾺ���r=�T�)X�ce�7��`�R����2x7>�~���������)Q&���6�51���J���gE�u"�!#!Pw-��|zgՇKt����_?ܸ(6�_��(ѹ��0$�;�G�������S�I���Y�N�S� َ���߄%�s�Z�N��Ɏ��U3��{������l\�i��t��'�^'b�2i�~����}b�̣_�^&y���p9���7���n����KD����^�pz{�զ��z���S�y�h�l��v�@1��2�u"6��^���۬��:�������^~aY�ސ�����0QJ���'�Y�.�~��{�O���>i�d��f�x�Zvc΋� 5��V��ܒ��p��.� ��8���`���%���u��W0AZS!�[��Wz�u;�w����7tJ.��l��5Qud�Np�F�N�l���0�ٻ���u�|O3X>{�.7���
DD 	  �Z:lc݊%�QƊ�N'���ޠ��>?�x����g�c��H���lS�G`�2��%�V�| �Ճ�EGǟ��:~Q������T�']�3v
���������FA�jt�v�,�P�gCn��W�]p<����T�-�XRa��ϒx�:�'+TGy)���8���(��R#,m�9��%Z�DG��D���7CMz��K���2�i�|RY����:�n�k�;��:״	��
f�4q��[s��k�G��by4�r�4�k�>��	GCh�R�4���#�7�e�����=�p�`��0o�F��&�iڑ��,�A�U!�4��m�[�1ɫr�B���	���7�>:��E^��Nx|�?6�w�`��Ӥ�¸
"�]K��[+/��B��~>��_�ۖ�2��w�Թ����7�w��wB�JG,���G����7�_��(#�p�O��4EQ8ϟP�#�W�1b��.�ۄ�T�7�E�<u$~|b�!g����'��w��鞍�F��m�1O��im��9��)	��Fı������}�Db�L��*;z��a<��\'�\��D��R���})��8)uX[�O|3��H@�daM���R����Nٌ�j.�Q� �ӈn�=e���,-6��u�������%�P �$w\[���_��y�9a��m&�w�hN0!m�������eg���d����>�2���5���K�A����ya�-[ᒧ������x�v�G�F*�|f�B3Y�`�x�m���е��=�`	$<����3*��'I�gyk��lYZ��K��A$�(��sI]�<R!ln`�h�׌T�\r�N�n0�8|�����~�8>��@IC��2��ySbQ�!|�"�v�U��A�S4��_�~wO��/OS��`�ٞ'�E�q�P�`׉���$�`z%ϜIW���@�u��9$�AC�tb�qXXԆ�C��l��h�.��%y�e�"}��o�t����6t�XH�����g�Lp����&$\'�Mf��6t��l<a����`�"�h�2+I:���c�xxw��#ڢ2�9!ͳ��!	�b��t��;�����+�s���r���_(���㛫����W9����g�����j��ޭ�6��cU�ޏy��R	����Sf��@	��Ҕ	�]��#�j���6g*�i�'%V0�17� ^"c+$ʨy��E�q�jC�s[��axp-w֛QЮ6#��p�y~bE�h��.hE�y�V�\qG��,�l��`���{�_g�,qujl�r�Ԋ�_=WĈ�.��y���2Q8'p�Z�l��c���"��N))��+���gF�u"p�59Զ�xߝ���տ��P+-�}N�u�+r��R
��:�ݤý�w�-p��׃��3���������\�+��A�Z�������tϿ9�zu��)&��17�Ǔ�[wע�!���x׋o�^��'�Hا��K��ie��x-��U�"ƞ���wy�T�-W�b��e��ih�N��l��޷��*�^m�z��u��ݔZ�Tщ�K��&굪X��G�c�p�'��Ç��l���F([��N�w�%���ssަ L�9��H�s�]~�{��4�	`����:�t�%\z �T�D�$npxyu0ܹ�wϯ>n5��`\��Ɋw�Oߠ#�uTƬ������{��W���s�u�}�={P8�';j�7�E����UF$�F�d��~��7T�~ʔ���@�Ul<�Q�{z	#�!��Z�^3ZIv����Þb5��lVtC�&Y��gm�H�����Z�j��k$�r���b�F�T�'�����׹%6��|c��+��q�)tXx8��/�����s�6��#DAX ���RN���f��� *w��FK��kR��dj�򙁀��2��a���	�@W/զ��w�Q�"�#�r-��i��O�Њd=*>�lK� ����d%Yi�E�̹��ο���s͒i��۶v��^���(?m��K�ȵ[/?���ߪ�.����.�S�g�l՛Q�#��L$e���_���|���ѿ������)M��5�FT�fQ7aj&�!�ׄ�� �ݽڗ[�-��)4�2o���c�~�K��+׊ �Khs�?��n��ɫ�c���A[]�s����jıā��.ʵ"PǨ��"&��ο�_�H� s����%si�u�'�<����`��Wk�dq}��N}�}�;���F��3�����+B�$��\�rt}0����qx���������^EFC*�䞇4+��������g2      Q   N   x�3�t�I-):�%/39��3�(?��$�X!Y� "�i�Y���id`d�k D
��VFV�z���x��b���� ��r      W   s   x�M��
� E��+,�Bg41V��m$+A0��u���p�p�CKw���z�k˱���kǣ\�� �zV������@Br
�"'�Y�ٚy��I/����qa��B��#�      I      x������ � �      K      x������ � �      c      x������ � �      U   �   x�}�A
�0 ϛW��n6mr�]�z��J�@��#(�E=�30�r�kZ���=v�c���\��=ָ��,@���8��2���cLK��3�@Hҡ�pЄA8��<�с4q�C8��E�-��J������cuO�d3��^� u1J�<�=�      G      x������ � �      g      x�Խ�r�J�.x���b_���ʃ���� #	d$�)u�ݱBH�I 6B/������b�X��Hf��c�1�\���#?����K����C�M�3XN���?������X�� yioD4��c@�ǵqw�X����^�	�!�����a�_�o�S?���]�^g���s:[L�Ik�^N�I+X������u��U�Z��?ד��?][��"�[1�H�gJy�9���1=y�Ba� /��
�c�0��p]����l5��d6�
�Ќ�a�ݪ@ Pt�K���������@�? �������jXcZ��4�ނ��W?��9�K��O�/�0M�/[+�w��q�6�Bv������dw�|��������F��)��_��=�2����7�i09|d�C���r�_���G8�q���`"���\,{�#wvi5HE|�ɣ�үڛa���y�L�yE�~������=��i�a�o1��p���a�����q;9�ۉ!U��_J��_]��4�}|w���e��#}(��?T���|���!�r�
_\���eA?;
�c$
��^ )�gp0���$���� �St��� �4u��io~�0�r-�.?_ZO_�[i_��J�p�i��|fMa�Gi��3�-���dx��́-�����Q��?e�F[/���_����������ۉ���w���y����Z��	�=&�ڼ�b��˟�f(i��rC�)��لJ}�1�x��W�?���ʌ������@�<��1�� f1��<m��<����$X����5�cX���aλT~1"����%6Od��/���[��N���8|�$��,��Ձo꣠P�o�����3S����ԇu�bˤX����+/�#�x�Q,:wڷ_%����M(mpϜ�xb��i {]��T1�i��wL��J#S��r����o�����>*�*��W-�G���L�	���El=���%�2g� .�����u�W-��/��__ð<���-�t,�X�g��H]�������p��� ����8+���J�M/B��Lb�R�%y���T��#�R
quf,��͎1��^���hd��-�U�k��oB���5?����p=�����m��5�a�[���i������`���1M�ݨ��]Ǜ��l9Vt�$k"��q�����~l�<���!�lJ{G���L���2*H���=��W_�Q��0�nA��	�������6O�-�H��RKg�A��6�����O����R{��������C�B2J��O��2ko�8Yx��<"���2�}�I��A�t7�'����\�
�{��"�y_cJ��� }J'���X���������q�m��+y��!����¾��.�ad�1�LY�}luE���*ҶVW}Pz]1�pÀW�M{�he�P�e!��[�op�w���>��A�+&��矡gq�=��w����b�y�C���H�4zq�lL�>0C���*�W(��Ts�]�inկ������kX�m ��}����0}�-`��l�?t:(���w�/<�la�Ƽ>|O��\1E՚��E�%YOOE߳�������>��Ð���3���P�Zy�s<��[P�;m�G��cl�s^�!�a��w�Z�(O1�&������P⻮�'��,��*)��h�O1���<i����������[cZ�eq�&i�.N��)�����C����U�F������J������Y4��Σ�thw�/Ǝ�{f�)=��&�t��M��{$i>�ʪ��y�)�F�����)Tܭ1-
��@*\����ףGzu���T�t�!�'/���-���l���[OW�e��%�o*��!�-�ph����1���kI[.Z���A�Y��� lQ���M賮�2 �K��n��t�j�[Q��0[�ԣ�na_�eL��=�Qm_RUR(��0����$]���^��Vʈ��(?��Jҧ����Se�4��-�ey�߂>�5�XCh�1�$،�XW��țM��Q�X�u�ќ��N5/z:Oɵ�����Z#Y�G� �1J'��=yL���30�Hob�N=�t�kU7�5z�ZC�=����]�����`S��:pX��%%��!Ό��
c��d���X�'-����N�&QjY��5�8��:��v,Ņ[�/a�l�8�*I�W�-�*c�)�5�V^f�9@�$��9q���I�2U%.�d��۲G�.��_�<�|[S󤉓InсJ���!�D��"�u"�	=X��? }��^#e��G|�g�y���� 2���)���nW�������9oOf�׳��>��������e�+��ӞQ���,�<X]�LR/6DM*�)#T��3�y_�h-����;�0�G��V��[�[��9D߂��<��������Y5ϐ�y��AN6U<s=N�vw;�j��y�y��ނt��_��1��8����2���L�=C��� p�ؾ�������?�nXcZ��4�oAU�7?�W5�-�<��z$�"P��RZ�#�����:���*��[|'���J��i�C[���cƂ�� �m6��R�������ʠ�\.��nh^Q�M��*��zꅕ�j�iw_��q����vEa5�m�*���g$���J��K�ag�+<},E� ��)��$�+�C��}��W�BӘE7��qy��1A�0Fs�?+N�U1�����[w8$�Abz���;�e���xyI=$j�����1�ԟuם�h���%7���2���������������O�U1�"ms�����0
���+��,���.&i@3T��O[��7���f�%����	�Kv��eoA�uDr�A�B�"Y�� ����㷋�d�gߝ��b��{K�����j>�����f�s����9Q���=7������,�ZS����2��ʱ�7țt�!���.�eU����T�H��J�02��z�3I�Z�u�vR��>�C�pL
7L��U���ez_�`k��߂�U��*S�!˘䕔9dߢg0Y-��a:��b�m���z"z����;g����P�wc�L�m����>�	X�g�������[���@\0�y��e����/N�U1�_o7���ϲ��ʪ"�s�<SJ���<��Qz��ae�:on��L��C��=ƍ�`
��O:� � �u^	�|w��z"��u8w�����)u�CG�H�J��!�W6ic�I4C
�j����ћ(����#�(�79�E�5����'��E�}��
cçhI=���b�p�H�����;���.F��e�IrC�cb��q��V/������J�q򇴕qS��������9~:.R��;pB=O�O�T�D}��2¬�xv���Һ������}�B;|�@�Z���	ꛊî?��:eJN���e�!e�=n��X� �l�G�,�"�1�U&_'�ƦO�U1�H�?���R�L�^ ҝ�r�K��'@��8HeZ�D_�����a>Fk$����7W�|�}w�>+�b/"+�2�<�ŝ�j�Ȫ����$1������,.�Z��u�8a\@{���s}���-"�N��f�'��~Wo�8D�<�𠉲w�sL�}��V�'4�X�T3�A|,(��J|�ӿ��ƲdMAP�H���&D�l[6������*��">]})�>�쩚Djs�u�܍��2�Bk`�V:�_��nA�r�~o>"�j),����.�oΟgV�'���na�1H�,'�A����0�m��{�@M奞d3{���
�]�:���FZ�+��c��d���w.f׺9���j��*�����m� ؛X��E����ٌ}�l�db�ع`y�7�g�0�gҐ��uh��KEZ�&J�oG�:;�8�jP�7q�/�������J
T�kE��ڮ���9�t40��ؒŻ�׿]���N6����Tvm����c�����d+�c���-
X�֪?7��'��QR]W���*u�,�����k���SR�Q�]'ݰ��}��[Х��mQ5K���T�2{N*�4���`zp� ��s�    ���R��	qA��&Yv�TiE+�G,�>�����h�}[�v�<ǓxE����]ٸam_a���|B��f`p��Gt��p��J�
��|*��-l�ǡ�30}5.:�D�C;�Þ�B����sǦ��t��'Sg���u {͜�n`���6��`�h3�t�S�}Bf�b}�����;�K/~>�Ռ5������UAd�b����֋�F:2���:-]�b�Y�,���p��jm��>8醳���Pi.����:��C!�v~�n��x���؍6S�m��lb��\��p��Byo,�@���D��lm�����E#dV~-���;�������5�x��_������=@-��ԕ��t2��ڛ�y�N��!�{�5E2�V�h���m�vw���ʒ#EXD�f�;�%wmS츖.��h�(��L��qW|�z�oY��w��⮝g����j� �[���8n�g]Y,�_Yu1�	^���na_MIҍ�A�m5G�>�^�Qz���:22�5�z��q������MS�E]����+jW7n�����78,܏1�ڤ<�+}4����ɩ�܌QG���˒S"�#vF�87=��ҋ��e����Z�nYf�8����]	i�e���u�b�ƴh�1�	�:���#[u�}�;A�l˞�Z%t�p6��-�b��O�4�f���D[�Ї�B�,d���ĭ�DkU�ҳ�.�ǜF;\�/V��s��q�?/��C!�zH֡�i�}�8v�i ��w���ŖY����]T1�xi?�����Ld�\%s���J������U�3��2#$	��7xw2Les���m<�c����%i�v.�Q���B�r8P�K�φ.�B`f�e��O�����3^�����>�k��7V�)
[�=i�@�_MHv���O0���=�*J�����7�]_X��	�{7�Qe�� �&T��O���>�bb,`�?�fQ�����œ��x$�zfg���5Hd� �Z��W�����:�%~�gu������Q]W�.�kT����^tYM�+��?�R�,]c,ZW>OiSI��?��Z+A�h1��������"�4��ͷ �!ĭ�}���/��ح�`/wy��J��f���]2��r	u'��;�5�H��\hХ�{w�U���3F�G��^"ffW�����T�-HP ь�N�"��}x�(�ئ��x�������4<o�<���� �W��u��=�ʯN��]���H�*(��I?^�q��w;�|Y^��Pg꣊D䥪cYυm��qBb��ɶ*���w���-�g���5����^�b�kt���:T�~Z*�C{o��u���?�0,�1���}�Efml��t�[JW|�v-����*DO�T�������!�g�n,����B��:��[�-��|�︀~ϱȱ{�P��U~����$�����.�/��rͳ��Ñd�C�E�\��K(F� 	����Њ�g���
��� IT��z��۰Ƶh��n!/�-�$��k�ۛ�d��ck�4NTT�	^��:I�na_��KA�A7��c;\k�l�nV>�t;��<oޝS8f7����\��F����ќט�0u9ey�}5���¾��ky(���ˈy�m��*�Xh�����C�����,�V��E��%�d`yB��@WiXũЅg���毃0�?ݨ��Z�vk�4!V3�u�2����w7�|Q5ўO*��~�O�q���wM$<�Uga��UD5��0�EQsm}��~��3t����b��(��5��q���ۀ�Fi�<�X�t�qv���.��Deꚨ�y��w	؍����-�+K�:e�eX��;�ҷ��HOO�8�x=�oY28{��ps�����ڝ?��<����`��9!U�7�&U���q��7%Ký��}ug*AP�کPXq4L�wm�%1��Y��v���<__mp00g0L�]��ž��v�OkT��J?݂>Am�^Gٟ���˓�R�1/B|4y������/�5,y��+z(Dk����E���b�M�Z��uG�ϕ.���F���4URpC��+�<Fw9Z�qGN_�6[�>�[\%ѣW9�~��ҧ�r3���-�֌��H�lQ����]3��&QyX�6���܈�c~���]����=�^g0�5�ςZr�
U�.����{�{G�C)�F�p'�<�|�*�q��؜+_WJq�l<�GC�A�' 5�
���Lw'v�����v-|�
�]�>��6���\�(�^!�S��r�vkt����-�J)u�p�����?�[ʊI^N>F3_zD���(2����$�)�DZA�6co=��oa1~��O^��m�j���y�&j�b���v�ס�uܘ�M־>�p�S�#F�!.9���:������#�)�J�}��,Ӭ�Q��B#:!�b�"�x�,�:vBuƚe�C\�,Tz�� ^��_�-�[�u�<���^�~�Q�b2��D�@9ڔ?�8q�)�|�=�������'
�� �)/��P�����S��P�8��>[��Zh2��ݙ�7Y��W_ð<� ��[�1�Z�o� �o��ǯ�V{��GvګU�<����s����0%��A������C3I�`&� �z>�m���ެ35��eH��9����&`.��3�X�*�5T���7�j��ۉ���Y��J^�8����?ŕ9�M�)vR��XB���C?HԵ�K	�Ä�V�O�$]��.��c)�Yk�����d�>8���%�k|��y�^�Y���	�{Ҙ��~{Yyho�ļ�����-�c����n��H����ƷrQ)�h2��0�(���E^�V�|�s7�W7(o�*|!���F���a݂~�T	�TgL_�����<�^�����ȇ5]M��i:���7L��O����~(����/�ۧX�'��%��U��-��ke�ؒ���^�#y�ܿ�b��彍�T�o��,�f'h�80��l�oR:Cׂ�2u�k�������W�!�,�7�s1�+N젗��(F�[xB�����dH#"U'�I������؁ ��i��d��{џп������Q�>G��+��6�N��S�����ב�٫b:5�'�*%�jF����U�o�yB�X7��{n�)]�å��o8/o��K��/���Z��0�	U��e,
w!.��C���]�}mF�Z�v�f�s�\�|̽���m�8_�{� zΉ�����Eڞ"����]�!�m��n���i4�a8Ԡ�q���ܿ>箟�����*5�]h���?����tw�.�M��=�MM�G*G21���a�$���޼n3I��^�ڹt{��{����]��=L�,�n�Ky��g@���f[D�fѣb���5j�{�<A_�i�{Ѽ΍!���ԇ�0���K�2zm�H�|ϻ���@ܕz��W�!�y�z;����-�'B2T�U'"���(�ݹ��V>cX��i(H����f_L�y��~�:0�ii��i�� �T��#U����|����o���T�z,�2^L����?5�DJ����*t� �a�W>|6yƺ(������+NL��跟��t��A34�$��>���A蚠uE��x���9]�;_3+���&�h���D�l$��8ۆ�c�$M���'}D��q�F&(�ō�P�C�q���HӋ+'���^������P��@��׺�U!X��+R�6YD����/�h���s��%�Ʒ�ߡO���u��M+�h}A�>��̘t=_�7��۴�L�>������%+�%�:I��r`B�x܁$�QN�d���i��)t�x�&�Lm�O�u��^����82$X��.�T?VK�@���D����)b$���/E� _���Q��$��nҲ=C�@����z�1Q�J(�`��tu�na��ω�?�J�&*�:�/:�6����)2u�Ѩ���nZ���#M�4��m��3��I����fk\��˕���:��4�R}s~�٘|��PZA-V�!ɢoɆov q�Wvd"z3�4$�ެћ�F�Ҿq�    �^`�<]PS�y�>�:�	U��5�GK�ݣ�ΙO�]�K-!L���b�(�/l�1I�v�~ё�$-24��!Iܹ�}�ƀm��Nȧ\G�5?�Jb����L~ �����RR���@��4��ԈyG�}",(���:7�v�.&����.+��U�i|��n�е�_#�+��UE�yb[�&;ڗvn�_m@���|8����0��/��$�̉��d���NR��������ۿ����4lzg�}�	�묂�,�w'��x�����ʇ*�/>iV��{�]=��D�JSҀ.]�p�fB0K��Ty��3�|=�Ϲ��C�){jޙ¢RءT6�r�a�)�K|�V�%����g�d=%
�IW�eT��#?IԱ�C�J��������Q��y�u-��܅�����0�� R�J}V㾂P���Nn��/���{�w���JO������g��cþ'ʺiG+OJ']20p���yq"��{3�L9���<���I�}37�\���[�wkt �)��;�]=�W�I�WfW�H�X�w������My�% 75�� ��;.һK�t$"�T���=ӊC!u�<&�V��HD;� {у�v��k�t(��7�-���]X�9$�>�4�*�l�y�����b�O�`"�p�<S�@���˪C<���C����ǡ��{�"����I<tW�����5\��4��T��4���(866��KE�t�A��X�2�u�I���N:�k�Uq2�\�ܹ�44 �f%�o�L����!����P�aNbd���_+��S�z�u�a�Ƶނ���']\ê?PO"�ҋ5[K����-��5;_�*�z��� �x�%�g�U�[���9���v�x��{�����Z�E�ʾu�_k��������k��n��Q�E���0w������Pw�>�+l�ڹ����ҏ���N�.ps���p�P��q(3��4I�3}��]�"S]�=�]�q-L�������~ǽ��u�~P�d������k���)`��2�B-íh��*��$�aǖ��e���E�{O�G�ޒ����_���̅����bX���-���pܚ��f웈9t��������ޛ����*�s�%����!�D#�]��!m;�@��Ťl�T�V�ܣ4"b�dg�N>�4�kL�fX�&>u;���p�$	Ʋ���~ ���]_\3�+����*��qkr<�p� ~�/Պ�ƌ3�3Ş���	Z�:Ty���Q��S��hYM��^h��O��n!�[HՖ��(�y�2�>����B47`��_�/���T���`��TX�IdN�-'V��w"�V��?ל�� ��v%؎�&Go��u�i�J/j��A��-�:e�i���s��a�Vf�R}�oc>������e�dN�5��I�X
�6���0LeMM#����sv�O���{��:Y��e�w_�ڝg�t�Y�T�����݆=Yt=�����}]g����¾��]A7��$tt��>�g^�ȈC��a0��~C��<2���c���7�'��5�E�;��[��x�a_�EL]���TD�W#���F��f�ˇ�HύWH'���¡[�\Y�4�C���h�D�>�8gy���'�u�p*�\��(_�J٭�-s[S�B�g��;��\]GoJWJ���������-�)C�:��Er:��Y<�,���e��rg�D����m/}��n5�&����l�W:��^g�/�ߠ��ŸR���d���Ӱ��6د�@�U�(�/��aq���&r{nw]|�̰�E�,Ҫ;{H�*�xׁ�����`S������}	Ե_��~����������#�t�D��W�<��H
�8 z���U嫦�L����*����	=(��F_���י��n�7�Ҳ��~C�K��(T�!�T�x�Te"U���}u�$� �U�:
�l���R�֥0Q
��O�̋3�����j��
�uc�o�'t��֘�@,�����H,�w/p]�W��y<�Fo/w��CP��B�������Qa ɏ.I�V���S�f���Vf�c��c>}�9��M1//^^�G�dȷ��f�z�u��s?l���ܯ�)��<�,q�V`�����Y�B}�0*}�mX�K5�@�6��+c�\+\���?ե�Q�p����uo'�q���kt�G�f�[Pu�5��0ܾ51u��;�t�`����-������ԅg�е��83^��{��,QOIґϞ���%B+c�t�\G���v:�\�ߢ(���K�_{�'���E�՟����x��{w��-��d`�C�H���ݜ�I�:r��D<����s��p��ǣ�n�q��8��^�E�k\b�������(�44@]�N�*/mm^;˶�v�bi�.�ƾ��Eu��E�@����j,v�AʯU m;y��O�~�u|s!���yk��G���ѮY�������}�]�<����(��&����T1��:��5H^���V/�4I}{S��F/xVxVg�j�pR��Æ����U���٭�-��%�M����?��t��`�"w��t�|W7֞�Hw���N7DQq�bg�w#�d�Z�J�bY����2xo��=��>ڥ��,����{��}:��ǲ�vqU��$Oj� ~����6�$C�X�G߸��V< ����p��ʬ�1,La'�9j
S3�a�(��-����a��S��k�]+l���5G4fa���Ԕ|tޠ����M�si���ۯ�
lBE�Vc'��2~Sz:5.<[/�_����U�ȟ�=q2��Q�p`I(4'���g����I߭4����~i��F���p1�#�%���Y�&ɛ"�0	��R�Y�� 7`�M>�� xn�d��4�4����2��i߭khk�z������<�N�*�K�z�oM���K�=��:�GО�UW��	Z?,,�~K?$���,�{�k�.-�Q3��O�Gi|�TڃR�{�-�jВg�i+ȵ#-0=4�ծ:{�0�'���R�5�Ѵ�J1W��ٳ�%\5ML���R�����Jeb4(�p=�;T&-q7�l�x(F#���h3 4���J��4b���?�L�J���� �6+��O��������I�zb�O�|C�Z��cZ|��T�4�CUA�;�<dOlPѦ�,�	?d��G�N�Ejr�ޡZ��k՜�2����-��i��;{	pS���z����8Q���YU[�a�L[�`k��W�3̒���>��X�+����*7g�SL��"�J��=����~	����fT�)�FE�g��W��4�z��)b��"�e�<.?� �]\�_:M����gM�_{	^a�7(��욎����Ԑ<l��TC���T(zj�.��|�N�����R�o��e8��#M�Ч̬_����e�4���ёg�3A�(I�y/6I\C
�';�%�=(��;c�O����3��Wo��4��	��A����a��=�V� �vPi���*����-�7�nj�3��dm��P��!/Ron��g�PT�p`!O9Uć]�{�n�$��T��Eqo_�ޭQ-�E�m��N��~:�^�?�ݮ>'�Y,��%ww;4�K���k�팬����9�͉�v�H:c[\�b��=�m*��@`�	H�q����;� ��}�֨2
-����.�Z��'���j����tĊ����Va��[�ק����Tz�rl��g�#/։7�,TKÆ�����r�L�W��it�&�!����s��բY��*�_A�'��҇&�����V� s+z�Ǉ�?��f�|ѳ<$�}���T��T~Tl�3݄d&"�樹=��G���Biq}�х�c��Ew?�sv�Q4�[P�y�rON_�6_��q��c��tt���-σ�r|����w�ދ��e�$%xA�]=ӵ��LŌ"�Z�-��[:��{lJa��3J�1ζ`u=v����̅P��[�°<�nA���)��}J����v��6�(Zz�Os���EP��߼ҍ��kF��h`�:�xh�ڹ�����r2�|y��pҳ�n �kU��m�6\^��Ԟ���    j�����g�z�;����f������@�G�.���XJ��d&��B�ƒhX0lPs�yb�<$���hR�B��StS��}� /�Vu�J���=m����A�-��(sO-M�a��$� �*Z�`�RvO_�Iʡ���I>�&Q6Ԃ4��7�OQ����w���5~�l*���V�����z��\�F6���XG���V�CM�M 		r��t�ȳ>d����q�5�M�C���Z��=V��S�&�~��i��n7�1ڽ��N�헷�w����ߵ������q�������������{�I�S�0I``F�ӽ�&��M�
hc~�9��$�ply,4�w�i|V��µ��F��w���q�~ٞX�1T���o]s�N�'ƪ��/&�}�즬RV�@I��q��?G)H��
���_��IDU��s�+�����ɏ�t�])ʹ����~E��U��l�#$g�_��k��*o\U�#��4�%���w��e�[���d<�������!E��XE�����x��U��Ge�o%�:qɀI�G�I���Y����~�6�]FǿL.�{��>�K�^ZΉ�*�&x���:���$D��ø'{���i��j�󆎺�gĪ$�[�l� c%�G���#×�Ѐީހ>���cAU>ϓi�rb,��'L�V�軛���g&�v����hho���X|�:$�g:����f��e�w9
���9��1;O��Ü9�\_�9]f��Q��k�3%�������eB)�Xږ�Bܸsѷ��  ��V���4e��z� �L9�匑<������vS���K��������q����⛛n�%]̞�z"~>�<6�<���$���Չ]�=�s��,11��a��%q�J���B��2�eo�}x%��];���3�pWr<W�kL�<`�[�'�Q;�W�'�)��E������}�
��.��M3k�u;���53N�~Jf�Q`X�C�#�)"�'7�c�>w�٤9+c1Ԭ��Z�pc9����J�z���'[�'U�JY�?Nq���na��~p�R�I*R^��5ӓ�X�l ��E��lZ�jTq�r���l��G�A����iچ�[������5���@�~�����"��Ѣ�ey��v�f�J\�Ra��6I25 ��C-ץPz��:��4���֢�6�U4n�cxQ���wkt2<Mѷ���{c��'����t}(�*���4��q�m�_)���F�b�rc��P"Q�$3�Y�	��$kCP�x��*mk�n����~���`�(*�֘��9oAך|�Q��?%���B���>T����t����o3���C���I��$V=�^�IJC�I�CI]*]�8W�|�
��g�׊��R0�08���)L1������ۆW��tC�ӑ�]��cx�X}�-w��̈�·6X�
׊r{�ej"7�<����g�ll�.}��_~x�>%�m�l*���z���w/g�g��)c[5��ZО�Q�C8T�(�%u囡Rg�r��T7����P��0jz�}V9���y�����
�7(X۾Cr;�b��5ߌ
�b�&�<ۖ2YOH�ck���<������c?��p����G�C�aA�u���U��P̓�f�l�#�2��>�������n����fz�Mt�1UC�#�h1�`2�v6�S�z���7���5G�S9NRiԔX����o�o����eT��Z
^f�I�515	>�(E�ҩx�sĎ7�����#�� n��|��C�bD�S9�_y�a�*�^�`twУ����kɒ 1�D�m�c�3$�Ŗ�� �l9���gYGv?�����`W��@#��{�j�����`���T�YY���_q�?HP���R��u���p⭎BZ�3(��z��U��blO^b��-u�-S�G7�Or���{SQ�^�,{Y�N��O�r�#_�^%1��׋v7y0�{�g�=�"i^4�D/�ڥ��#���.+nQ,fsy�Ч�r׍/�k���;��5���>\�ns�)�/!�U��Q�a`�����H���=��:
rl�t����*[?�\�xr��F��o}G>���$�s罱����Ug~j,�r�ڶ>2mJ�Zro�t��h��I.�R���4,�`��#n �\�-�n��z�j�֖D]�����<��Ca����g���ɾ��� /�I�ͼD�&]�0�����B�4�{���g�C�P��!nq,���z�ЧX�u&�v*]}5#y�LN���W>��p[�d"���G����,�΅1�=1�I��lփ��3C}D��T�w4�7��}9ܡ&���fEE��ד�Uguw�j�=o@�l@|YD�
 W1=��2ue�����Pf�ԡ�\2Ԩ;o������
5�Q-�p/աO���{�]�}�#"����rBk�t���o���I�d`�h١Lz�a/��NvCT��G�a�t^V>�
�/a�:q��G���g�\��`]8Y�+�nO���{w�j�dK͌4�
J2�K�³��j�[;���U}7V�{]��C1b�A�%ES]�bľ��w:-��<�܂~�p2�NFuU�����Z�	k�T�mƾ�/�y>�����gĝ�F:���p��m Ek�V�ET��Q�ϼ�����8����g���e�G]=�y���+��N��C�����л?�j���'�ჟ��#Hb:"�\�^W�ש'ɒ��)����lTS;>h\z���{�}�����sg��C�nAW�����@=�^i��]�V+��@_�r�Y�*�jekVA����e4��8+t���#Akht=i"E]D�"f��v�5�O�4��sf�o���O��k'\���{!�~E氶���!��3��N��:l	����u�n��J�#�^Ϲ���gW�2��x=�������u��1	��y��t	`�[bav;�	`:4��b�qC*�y�����v�=�U��O#���$��ЉHZ���ο����+m��RE����
��4�^LAU �P$�a7�]!�����r<�3��6��<��iӈ ���K~�2��N�k��C������kE (YO�r����f�ϓU�������YVlQ6��f�!z�,�JBb]х�|,�e��\6:b�#�v�6�v���&��X�;�ʽc>8�2�ݿ����~�c!T�/�;w�0D��_|EkqNLKU���j*n�/*s]��fv�~��$8���P5���s�>���Y=�e�1s���ƴv�#�T�ѿ��s�{ѱ��{����ZU�x��+�W3��Wk�]K|4L����
z��Z0�%����
(��"��5��^Poj,9X۬?E�X�Yܜ:B�r^��̩��T!��Me[�7ΦF���?�3Oug�oK��3d9aA����%C��:Av�.��D���C���nB�B�u-o�aϻ��#}�=d�������#_ܹ�+P4���M�(���Zˆ#��R���^)���z����JQc��*K��uA����}]�SDu��Kf3<�ߵfTĨ$&켣��k�ե娹)��
hslEH� Y\���n3Ah'��8EK�Jh�䢿C�t�/t]�SH�3�t�l���w�X�[��E�&6�q�|3���Męn�t䶓��X\�syX�G��g �MR�{~v�\�N�����Ч�p�=��?�[�"�z|���ƱE��N&�ibz�*�X���t;�B8�%82I� �b��W,%��
�l��3,���#T{������뒞"U6H/Ʃ�[�1��Y�J�q{C+=m�J�j�,�D����s�2��RJz��k:Ψ&��?L��ݢx�ml~�>�~�����<�Q�}X���c+s�	R:��Մ⠌�4��"���ݭ-$��z�#�ٝ~�[
~�=�l$F,����$�a��@J��#p���/�w�G9"�)*֬�!�O�"���VKܜ@�O���*GCZw�d5W8���]Q��}`^G�޻`�[���0�J��L�yWcYV=���@���(:�wG�$ս�Z�4<H��Zڛ� �  75�����t��y ���w蓺��,��W�@m�hw�G��������KH��jDza�Y�@yᡬ�g�@�p��i��2�m)IWRS�6��D��=o2 �0�A�!�}�%��j2u����hOG��>�v������Sw4 �����ןd�
Y%N��'D$@�OR� ��y�fb=�n�ڲ�����`�{Ǵ �N����{���_��k����YQٝ7�TM&����eޙ��߄�=���u� X����n��D��������� ��F��N֫d���3��������:� hbe�uS��'�����%�P�V�DZ�=dy�%ao����I��4���3G��ߑ��ۆ��XL5%�ޡO9��	(�*��`�殬��D]K��hIo��ou3�����{���A��M�,tGDR���eS��A�3u�B�k����Q��ݣ��H�E����:��7�{"�UZ��g�c�2a�eN��w��/W��,�Hja�H�,w�&-�᫅D��v�!ȳ����<�����n����
���a�t�( k���'���I�e뾅��+%Og���E��E���[�W��Z���Њ$7�r��E"%�������y�;2<=!=�����MJ�/~��4u~߱�F� D��~]��OHs�V��K����}[����}w�J��q]kBB�~*.�x��� qj�+44��鐊T�uԂ��}m�%�&��2��T�Zy9��nB�x�/�y��
W{�ۙ���$̲ӷ�����ǡ��
6,QPbLD��`�ڶ�{����5 �x6.��*�"&�
a�q�g���բ)�A�-��úq�q��q=V���������|ĞH<mw���ҫP��I��^�P�oH��K��l`n~��-:B�l7���Oe�ָ���O�߀~�#�̅�rתTt=�R}|��FӒW
��{��7�����F幟��/��әڱ�-��t[z|U�߻�������<�]R�O�Ҁj�}�*b��o��2�Ő��J�w�F�i�~>�]K��gBb�&I�$󇎸$����E�(;�E�K^��<wg6�&v?����j�8?Hs�����:/s�+�*��O��G�.��GI �����ؓ��T�:��!ʴg�-���g��@^�Y�y5Q�������6l�t�9�)��}��2{ы��Vuh�a�`�'�7���Q��[�<��A!�<L�5A�q���%�c&;��$��Q�ߝ���@ {�Fkc�m!�kT�8!��[~��ow+=&�΁��SSa�jг~[1�<,����]@�tA(���etL�1I&�Vl�Sg��v�&o0�n+v'����!�2���]���J�ј�����:QW��^�E�{e�_(o<��ZZU����?aV 	�H�g�dn���Z��CŢ���1��u�R�����w���fES��'�:�vܶ_��:�~x���K���Hr��S��O����ac�fe��	m���y�����t��&�8^к�$u�(�u؎�񕅚_e[��~`XG�3ƨ�o�`X��^�%e�6�����¾2��r��zJ��3�8�DP��mb-�qu�Jw]����q�Ꙟ뽨��ԁ^�����|�ƷhQ�U���t��A��|�,��-T����#�%��'��I��?jQxH�S�!���8�(�D���о���<�-�	�UP�-'�)zb�X���m��ЧX����X��BWZew�bW��na_��@�LÑ��M�fhb�+����Y!=��D��٪�\٧	��Ͼ
�VE�����NcA��}�P.��8�`��3vz�aY}��sW���#O���EE�wy�n��85�L$�|	fd���)�!Ӑ����c�t��c��k8�����<h������F���1s:�u���ؠ���Z,s�Spt�4bUB,u:X0�1�{�8�_H��ޱq�n�Y�P`f�PM�Bg<�l�y4��	V���Y4x�N���sW֜��E�=����n��N�C7C}/&FI����(���kS��^�+�{��׊������Đm�h0Tނ�5՛�ЭL���ڪ_I"�:;��jX��.��?�d(�,�ˁg&ٱ'���h �Z(���ה��_�;t�6S��.��x]Fh��$;C72��w��yE�r6��<����� ��5Iw�mα�i0���E��I�M����M^CN?��t�oB��M��*�9x���t�P�k�9���"�f��ᑸ*��}Q����e�@�� �VWW I����@_�1��7�CMb�
��go�[$�N ��Sg�F�(^��V�,���2N�U0�w��z�iH�V��4��dC�mQ!�zY˺�'��&��-�O�.���f�׌^��&��3t���qFUxD���"}LJj���S��c�6if{��T��9�>�Ci��I��d##z��\S����q���
ʾ�8gr���l����&�cZ�����RV��U1���&����� d�� ]��z2��F|��W6�����PO0��-o���x��9�i��*�`��Y��|���I��U1�]�H�z�sCM2��c�(E���5шD��U_ҕ�� �N
"�̳h����
ʲ�I���FL+t�P땍e��V���U�L���׼T��b|߰����[�킍�F'�~aĲ6�nh�8��NЇ3�Fs���)'S���h�?��Ҩ)Ǟ���p�����a�ڠ�^qŖ^_WMS�M�4F��v���6�&��׽�⥁��3�?{_�3V$}�̺�^�q2;ʍ��O&/C��-��@�i��7�R�jdZ���U���
�d1W�F#�V�Yp�}~?�a�����e�B/��x�  �����ن�CC�h��Wa2s�>}ҜKe�l�7P���Y�������5��0���mP�,�6.z<(L�k�ڇ�����e��q���	�{9}�ё4ב�K��E�C���7@�T�Z-���#D.�V����ǝ����w�'���q-�}�,�+c���?�F,�{�u��SE�;�6����d�ֈ�ݘ�D#��>�aBɩK�!r�/h�(�?a���$Z4#�C��[_��B-����6�q��Q��/�7k�.�.�:�"��X��gs�tڰ{�����{K��-"��F���EǴ��W�.48�I�59i�����kz���^W�1�wi�\��F������A��bK��ï����H\����s ۃ����Ϯ�t({�8;�ؽ��2�]q_��h`���l�+w3�t������C��m�M^��\ Q���*���J�T�k~H�F�a�%̘c�,|io`
I����l��|@ҙ�|�>Y�	s�E�}�i��.ʇ^����~�.��wwM�]���p=�q�ʼy:��b
;m��_��2Q�iJ��Ӿ,�&�NXOl�U�0��u9a��|�~~Po{pi[2��u;�k� ���A7��ު��P����sc�Z����i��^qv$�3q�0F*|x��鈖��8�l���/��������y�x|el�Z�[��B��ëL����4u$�P����+���� :�W�ӆ�=�ة�DRALT�57��l<9R߲IR��<X�g�^����D�n�/�Xp�V�����h�^f#5��X��Ο�z�4u=�=W��Ɏ�@�"�a����8f��p�^`˪�@�٦*{��(������ᠺ����md���ָ.ȥ:/��t�=�fe�yf�.X;�H���QxD?%U��z��Q:\5����;R+�(;�r�ibk����r��R���D1�B{�wX�Š�"�r��\�ui�ph��e#��	�Z���S�s}W��+�<�#0�a��*���c��a�wL��GZ�w.G8Z��Δ��\Pf�h���Eޒ��ٌ��Fg�B7��AT���tNyaTU����_�����      e   f   x�E˱� ��pf�%!�k�a迄�8�o�$��R�%���17-��PL���m��!��VU���ד���R���� �ĥuO;�J����g      [   z   x��0�4�,ȍ7
�w�t��)t,w3ʴ5t-)tL�,�,N�4121�4�4202�,Q����F�
FV&�V�zF���F���V&�z&& �����`O�bcS����Ќ(�=... ���      _   �  x���Mn�0����A6�3;:"R&U͢�����T�N�E�}{.�g�N&]tK���'���wͧ4��C8r�����X>?Ͽ�E��r����p�AV�QI -h�@Y�FE�G��� ��M�I�nH��4���/H��Z�k�<^��\Ƀ�����q���9�:�>tb?�w�+�W���F���L���i��溺:��� 4b'��I%�d��`�%Q���,�Z�Ϭ����)�Fs/��F���FO�*����J�V���	Ơ�a�muۼu�8j~�%�VcKp��;���Kn)��ǝ�D��rZ��;��3��H�ĖU'��m���_~���(�ϤԲ����b1�,�S�9�a2��Y.��W��	�yN�Q\�q~t�C��s��/Q��K�~      S      x������ � �      C   @   x�3�,I-.I��2����9�@Ș����T��T��H��������P�������W� ��      E      x������ � �      A   J  x�͑]O�0��ٯ0��ٵ��w���� 1!���2��v|�����x�	1��I{������uC�n�-���"�w�b���V�n7���,�Xs����l@��ļ �����.� ��NAH0$(���[��W4S�R��Q� Ѳ4����\W���=pmvAF��T�*��U�R1Yu�zu�U+����4;�މ.]j!���+��Q�;ap����3X�t2�-��o豛ES���t\ns�/D��m���r8����*�x����p!Gzv�
=O龽�o:�6�	ԗ�0�};t���Z/�eY7&��      a      x������ � �      M      x������ � �      O      x������ � �      >   �   x�m��J�@���S�9)lg�O���i}�(H�kdڑ�T��-�U/&!�__>�)�����ka�=Ak.j���G!��Z	�ɲ��9h|�����z�_��i��?�L�a�1��%���V])�S�ɚ7������J�R)gZg,������h� /doMo�/O3�g�c��5�6���4NH��q��o�nU�u� ʹ䄙���?'��:�T�ȋ���J^�      m      x������ � �      k   �  x�ݒMo�0��ί�q�Z���d�Q
��Щ�2��-f1��4���'E@&��������+=r"��80o^������>�?��n�ͷ���H�	`�kՄ#J�*��b	F���;�㦱���	��<���Ň�f��[}��pZ��ZOH��R_Uk�
��a�A�B2DQ*A��P��j��w#��7��zk��Sg���*��;@1�c,�$�g�dL �8�l�������G�b{�J	�R���[���>�|{.��~��o��5ޔ˛���e��3�?�J&���S�S�c6l�`	N��K�RbTU�`�S\l�����N���F�[Ϊ�pS{��ݖt���I"ɳ���gT"N�H����k$��I*!�{�$b��_)���(�	���      <   �   x�u��J1F�w��/А�d2�^�X�J�R,��$u��؟��"����s8�H��&�lk �D�����Z*�
�p�I�Mʊd}�\B$� �����&D�-Eg9f�D5s,I�Ol������
T,���HOVW��
s��*E��4��8�.����^mGvF?�K��q��Ԇ)��a��C0���^�@�: ��E�tx{y���|}/�׷Mmfϳ�����|�X-�_W�����d|�s��ݘ�m �Z�      Y     x�}��J�@�ϓ�����3�3��ʂ�{�<����%�%�>�z��UE��ƚ�mj����|[.f�zw��q��|5��뼘��_�! �ޣߡ��,"��JaG8X�{�^�Ӗ2�ɨ9z:<OoO/�����?ߟ6���c��Y���-�i��B�j��5%B���k	�6*�kI9ج������,3@`/^���b�����+sn��F�XbAG���T�6�YiZ�v��UQ���B�ܺ���o�m_�     