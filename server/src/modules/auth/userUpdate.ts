import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '../../Shared/database/banco.js'
import { DeleteFileFromS3 } from '../../Shared/storage/r2.js'

type UpdateUserProfileResponse = {
  ok: boolean
  code?: string
  message: string
}

type UpdateUserProfileData = {
  email?: string
  name?: string
  avatarUrl?: string | null
}

export async function updateUserProfile(
  user: User,
  data: UpdateUserProfileData,
): Promise<UpdateUserProfileResponse> {
  const profileUpdates = {
    ...(data.email && data.email !== user.email ? { email: data.email } : {}),
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
      ...(data.email && data.email !== user.email ? { email: data.email } : {}),
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
