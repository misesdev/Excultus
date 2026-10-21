import React from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { Routes, useAppNavigation, useAppRoute } from '@app/navigation/routes';
import { AppHeader, AppLoadingIndicator, AppScreen } from '@design-system';
import { NameDescriptionForm } from '@shared/forms/NameDescriptionForm';
import type { NameDescriptionValues } from '@shared/forms/nameDescriptionSchema';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { useQuery } from '@shared/hooks/useQuery';
import {
  COLLECTION_DESCRIPTION_MAX_LENGTH,
  COLLECTION_NAME_MAX_LENGTH,
} from '../../index';

const LIMITS = {
  name: COLLECTION_NAME_MAX_LENGTH,
  description: COLLECTION_DESCRIPTION_MAX_LENGTH,
};

/** Create or edit a collection. */
export function CollectionFormScreen() {
  const navigation = useAppNavigation();
  const collectionId = useAppRoute<typeof Routes.CollectionForm>().params?.collectionId;
  const { collections } = useDependencies();
  const editing = collectionId !== undefined;
  const existing = useQuery(
    () => (collectionId ? collections.get(collectionId) : Promise.resolve(undefined)),
    [collectionId],
    [],
  );
  const save = useAsyncAction(
    async (values: NameDescriptionValues) => {
      if (collectionId) {
        await collections.update(collectionId, values);
        navigation.goBack();
      } else {
        const created = await collections.create(values);
        navigation.replace(Routes.CollectionDetail, { collectionId: created.id });
      }
    },
    { successMessage: editing ? 'Coleção atualizada' : 'Coleção criada' },
  );

  return (
    <AppScreen keyboardAware scrollable safeTop={false}>
      <AppHeader
        title={editing ? 'Editar coleção' : 'Nova coleção'}
        onBack={navigation.goBack}
        backIcon="close"
      />
      {editing && existing.loading ? (
        <AppLoadingIndicator />
      ) : (
        <NameDescriptionForm
          testIDPrefix="collection-form"
          limits={LIMITS}
          nameLabel="Nome"
          namePlaceholder="Ex.: Curso de Filosofia"
          submitLabel={editing ? 'Salvar' : 'Criar coleção'}
          submitting={save.running}
          initialValues={
            existing.data
              ? { name: existing.data.name, description: existing.data.description }
              : undefined
          }
          onSubmit={values => save.run(values)}
        />
      )}
    </AppScreen>
  );
}
