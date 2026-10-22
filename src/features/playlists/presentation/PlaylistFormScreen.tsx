import React from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { Routes, useAppNavigation, useAppRoute } from '@app/navigation/routes';
import {
  AppHeader,
  AppLoadingIndicator,
  AppScreen,
  useTranslation,
} from '@design-system';
import { NameDescriptionForm } from '@shared/forms/NameDescriptionForm';
import type { NameDescriptionValues } from '@shared/forms/nameDescriptionSchema';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { useQuery } from '@shared/hooks/useQuery';
import { PLAYLIST_DESCRIPTION_MAX_LENGTH, PLAYLIST_NAME_MAX_LENGTH } from '../index';

const LIMITS = {
  name: PLAYLIST_NAME_MAX_LENGTH,
  description: PLAYLIST_DESCRIPTION_MAX_LENGTH,
};

export function PlaylistFormScreen() {
  const { t } = useTranslation();
  const navigation = useAppNavigation();
  const playlistId = useAppRoute<typeof Routes.PlaylistForm>().params?.playlistId;
  const { playlists } = useDependencies();
  const editing = playlistId !== undefined;
  const existing = useQuery(
    () => (playlistId ? playlists.getDetail(playlistId) : Promise.resolve(undefined)),
    [playlistId],
    [],
  );
  const save = useAsyncAction(
    async (values: NameDescriptionValues) => {
      if (playlistId) {
        await playlists.update(playlistId, values);
        navigation.goBack();
      } else {
        const created = await playlists.create(values);
        navigation.replace(Routes.PlaylistDetail, { playlistId: created.id });
      }
    },
    {
      successMessage: editing ? t('playlists.form.updated') : t('playlists.form.created'),
    },
  );

  return (
    <AppScreen keyboardAware scrollable safeTop={false}>
      <AppHeader
        title={editing ? t('playlists.form.editTitle') : t('targetPicker.newPlaylist')}
        onBack={navigation.goBack}
        backIcon="close"
      />
      {editing && existing.loading ? (
        <AppLoadingIndicator />
      ) : (
        <NameDescriptionForm
          testIDPrefix="playlist-form"
          limits={LIMITS}
          nameLabel={t('forms.nameLabel')}
          namePlaceholder={t('playlists.form.namePlaceholder')}
          submitLabel={editing ? t('common.save') : t('playlists.create')}
          submitting={save.running}
          initialValues={
            existing.data
              ? {
                  name: existing.data.playlist.name,
                  description: existing.data.playlist.description,
                }
              : undefined
          }
          onSubmit={values => save.run(values)}
        />
      )}
    </AppScreen>
  );
}
