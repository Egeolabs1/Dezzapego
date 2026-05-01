# Guia: Configurar Políticas de Storage (Imagens)

Este guia explica como configurar as políticas de segurança no bucket de imagens do Supabase.

## Objetivo
- ✅ Qualquer pessoa pode **ver** imagens (público)
- ✅ Apenas usuários autenticados podem fazer **upload**
- ✅ Apenas **donos** e **admins** podem **deletar** imagens

---

## Uploads da verificação de identidade (mesmo bucket)

As fotos de documento ficam em **`ads`** no caminho `{user_id}/verification/...webp` — as mesmas regras da seção seguinte aplicam-se: primeiro segmento da pasta continua sendo o UUID do usuário, então o **DELETE apenas do dono** continua válido (`storage.foldername(name))[1]`).

---

## Passo a Passo

### 1. Acessar Storage Policies
1. Abra o **Supabase Dashboard** (supabase.com/dashboard)
2. Selecione seu projeto **Dezzapego**
3. No menu lateral, clique em **Storage**
4. Clique no bucket **"ads"** (ou o nome do bucket de imagens)
5. Clique na aba **"Policies"**

---

### 2. Criar Política de SELECT (Visualização Pública)
**Clique em "New Policy" → "For full customization"**

- **Policy name**: `Public can view images`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **Policy definition**: `true`

Isso permite que todos vejam as imagens.

---

### 3. Criar Política de INSERT (Upload)
**Clique em "New Policy" → "For full customization"**

- **Policy name**: `Authenticated users can upload`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
(bucket_id = 'ads'::text)
```

Isso permite que qualquer usuário logado faça upload.

---

### 4. Criar Política de DELETE (Apenas Donos)
**Clique em "New Policy" → "For full customization"**

- **Policy name**: `Owners can delete their images`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
((storage.foldername(name))[1] = (auth.uid())::text)
```

Isso verifica se o nome da pasta (user_id) é igual ao usuário logado.

---

### 5. Criar Política de DELETE (Admin)
**Clique em "New Policy" → "For full customization"**

- **Policy name**: `Admins can delete any image`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'admin'
)
```

Isso permite que admins deletem qualquer imagem.

---

## Estrutura de Pastas Recomendada

Para a política de donos funcionar, suas imagens devem ser organizadas assim:

```
ads/
├── {user_id_1}/
│   ├── image1.jpg
│   └── image2.jpg
├── {user_id_2}/
│   └── image3.jpg
```

Assim, o código `(storage.foldername(name))[1]` pega o `user_id` da pasta e compara com quem está logado.

---

## Verificação

Depois de criar as 4 políticas, você deve ver:
- ✅ 1 política de SELECT (público)
- ✅ 1 política de INSERT (autenticados)
- ✅ 2 políticas de DELETE (owner + admin)

Se todas estiverem corretas, sua segurança está perfeita! 🔒

---

## Suspensão de conta (LGPD / moderação)

A flag `profiles.is_suspended` e as políticas RLS em `public.ads` (insert/update/delete do próprio usuário) **não alteram** as políticas de Storage acima: o bucket continua regido por pasta `user_id` e dono/admin. Usuários suspensos deixam de poder alterar anúncios via app/RLS; revisar objetos órfãos no Storage, se desejado, é processo operacional separado.
