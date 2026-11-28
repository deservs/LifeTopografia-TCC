import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '../../Shared/database/banco.js'
import { DeleteFileFromS3 } from '../../Shared/storage/r2.js'

type UpdateUserProfileResponse = {
  ok: boolean
  code?: string
  message: string
}

type UpdateUserProfileData = {
  name?: string
  avatarUrl?: string | null
}

type UpdateUserCredentialsResponse =
  | { ok: true; message: string }
  | { ok: false; httpStatus: 400 | 500; code: string; message: string }

type UpdateUserCredentialsData = {
  novoEmail?: string
  novaSenha?: string
}

export async function updateUserProfile(
  user: User,
  data: UpdateUserProfileData,
): Promise<UpdateUserProfileResponse> {
  const profileUpdates = {
    ...(data.name !== undefined ? { nome_ou_razao: data.name } : {}),
    ...(data.avatarUrl !== undefined ? { foto_url: data.avatarUrl } : {}),
  }

  if (Object.keys(profileUpdates).length === 0) {
    return {
      ok: true,
      message: 'Nenhum campo para atualizar.',
    }
  }

  let oldAvatarUrl = user.user_metadata?.avatar_url as string | undefined
  if (data.avatarUrl !== undefined) {
    const { data: currentProfile } = await supabaseAdmin
      .from('perfis')
      .select('foto_url')
      .eq('id', user.id)
      .maybeSingle()

    if (currentProfile?.foto_url) {
      oldAvatarUrl = currentProfile.foto_url
    }
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        ...user.user_metadata,
        ...(data.name !== undefined
          ? { name: data.name, nome_ou_razao: data.name }
          : {}),
        ...(data.avatarUrl !== undefined
          ? { avatar_url: data.avatarUrl, foto_url: data.avatarUrl }
          : {}),
      },
    },
  )

  if (authError) {
    if (data.avatarUrl) {
      await DeleteFileFromS3(data.avatarUrl).catch((err) =>
        console.error('Falha ao limpar avatar órfão no R2:', err),
      )
    }
    return {
      ok: false,
      code: 'AUTH_UPDATE_FAILED',
      message: authError.message,
    }
  }

  const { error: profileError } = await supabaseAdmin
    .from('perfis')
    .update(profileUpdates)
    .eq('id', user.id)

  if (profileError) {
    if (data.avatarUrl) {
      await DeleteFileFromS3(data.avatarUrl).catch((err) =>
        console.error('Falha ao limpar avatar órfão no R2:', err),
      )
    }
    return {
      ok: false,
      code: 'PROFILE_UPDATE_FAILED',
      message: profileError.message,
    }
  }

  if (
    data.avatarUrl !== undefined &&
    oldAvatarUrl &&
    oldAvatarUrl !== data.avatarUrl
  ) {
    try {
      await DeleteFileFromS3(oldAvatarUrl)
    } catch (deleteError) {
      console.error(
        'Aviso: falha ao excluir o avatar antigo do usuário:',
        deleteError,
      )
    }
  }

  return {
    ok: true,
    message: 'Perfil atualizado com sucesso.',
  }
}

export async function updateUserCredentials(
  user: User,
  data: UpdateUserCredentialsData,
): Promise<UpdateUserCredentialsResponse> {
  if (data.novoEmail) {
    const previousEmail = user.email

    const { error: authEmailError } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email: data.novoEmail,
      })

    if (authEmailError) {
      return {
        ok: false,
        httpStatus: 400,
        code: 'AUTH_EMAIL_UPDATE_FAILED',
        message: authEmailError.message,
      }
    }

    const { error: profileError } = await supabaseAdmin
      .from('perfis')
      .update({ email: data.novoEmail })
      .eq('id', user.id)

    if (profileError) {
      if (previousEmail) {
        await supabaseAdmin.auth.admin
          .updateUserById(user.id, { email: previousEmail })
          .catch((rollbackErr) =>
            console.error('Falha ao reverter e-mail no Auth:', rollbackErr),
          )
      }
      return {
        ok: false,
        httpStatus: 500,
        code: 'PROFILE_EMAIL_SYNC_FAILED',
        message: 'Erro ao sincronizar o novo e-mail no perfil.',
      }
    }
  }

  if (data.novaSenha) {
    const { error: authPasswordError } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: data.novaSenha,
      })

    if (authPasswordError) {
      return {
        ok: false,
        httpStatus: 400,
        code: 'AUTH_PASSWORD_UPDATE_FAILED',
        message: authPasswordError.message,
      }
    }
  }

  return {
    ok: true,
    message: 'Credenciais atualizadas com sucesso.',
  }
}
