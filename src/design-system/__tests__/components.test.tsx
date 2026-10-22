import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { renderWithTheme, SAFE_AREA_METRICS } from '@test/support/renderWithProviders';
import {
  AppButton,
  AppCheckbox,
  AppDialog,
  AppEmptyState,
  AppErrorState,
  AppIconButton,
  AppListSkeleton,
  AppProgressBar,
  AppSwitch,
  AppTabBar,
  AppTextInput,
  ThemeProvider,
} from '@design-system';

describe('AppButton', () => {
  it('calls onPress and exposes button semantics', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<AppButton label="Salvar" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while disabled or loading', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <>
        <AppButton label="Desativado" onPress={onPress} disabled />
        <AppButton label="Carregando" onPress={onPress} loading testID="busy" />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Desativado' })).toBeDisabled();
    expect(screen.getByTestId('busy-loading')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Desativado' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Carregando' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('AppIconButton', () => {
  it('requires an accessible label and reports selection', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <AppIconButton
        icon="heart"
        accessibilityLabel="Favoritar"
        selected
        onPress={onPress}
      />,
    );
    const button = screen.getByRole('button', { name: 'Favoritar' });
    expect(button).toBeSelected();
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalled();
  });
});

describe('AppCheckbox and AppSwitch', () => {
  it('toggles the checkbox and reports the mixed state', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <>
        <AppCheckbox checked={false} onChange={onChange} accessibilityLabel="Aula 1" />
        <AppCheckbox checked={false} indeterminate accessibilityLabel="Todos" />
      </>,
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Aula 1' }));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('checkbox', { name: 'Todos' })).toBePartiallyChecked();
  });

  it('switches on press', async () => {
    const onValueChange = jest.fn();
    await renderWithTheme(
      <AppSwitch value accessibilityLabel="Wi-Fi" onValueChange={onValueChange} />,
    );
    const control = screen.getByRole('switch', { name: 'Wi-Fi' });
    expect(control).toBeChecked();
    await fireEvent.press(control);
    expect(onValueChange).toHaveBeenCalledWith(false);
  });
});

describe('AppTextInput', () => {
  it('shows the error message and forwards text changes', async () => {
    const onChangeText = jest.fn();
    await renderWithTheme(
      <AppTextInput
        label="Nome"
        value=""
        onChangeText={onChangeText}
        error="Informe um nome"
      />,
    );
    expect(screen.getByText('Informe um nome')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Nome'), 'Curso');
    expect(onChangeText).toHaveBeenCalledWith('Curso');
  });
});

describe('feedback states', () => {
  it('renders empty and error states with actions', async () => {
    const onAction = jest.fn();
    const onRetry = jest.fn();
    await renderWithTheme(
      <>
        <AppEmptyState
          icon="albums-outline"
          title="Vazio"
          description="Nada aqui"
          actionLabel="Criar"
          onAction={onAction}
        />
        <AppErrorState message="Falhou" onRetry={onRetry} />
      </>,
    );
    expect(screen.getByText('Nada aqui')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Criar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onAction).toHaveBeenCalled();
    expect(onRetry).toHaveBeenCalled();
  });

  it('exposes loading and progress semantics', async () => {
    await renderWithTheme(
      <>
        <AppListSkeleton rows={2} />
        <AppProgressBar progress={0.42} accessibilityLabel="Progresso" />
      </>,
    );
    expect(screen.getByLabelText('Carregando')).toBeOnTheScreen();
    expect(screen.getByLabelText('Progresso')).toHaveAccessibilityValue({ now: 42 });
  });

  it('renders dialog actions', async () => {
    const onConfirm = jest.fn();
    await renderWithTheme(
      <AppDialog
        visible
        title="Excluir?"
        message="Não pode ser desfeito"
        onDismiss={jest.fn()}
        actions={[{ label: 'Excluir', onPress: onConfirm, variant: 'destructive' }]}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir' }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe('AppTabBar', () => {
  const items = (focused: string, onPress = jest.fn()) =>
    ['Início', 'Coleções', 'Downloads'].map(label => ({
      key: label,
      label,
      icon: 'home-outline' as const,
      activeIcon: 'home' as const,
      focused: label === focused,
      onPress: () => onPress(label),
    }));

  it('marks the focused tab as selected and navigates on press', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<AppTabBar items={items('Início', onPress)} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Início' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Downloads' })).not.toBeSelected();

    await fireEvent.press(screen.getByRole('tab', { name: 'Downloads' }));
    expect(onPress).toHaveBeenCalledWith('Downloads');
  });

  it('follows the focused tab after layout', async () => {
    const { rerender } = await renderWithTheme(<AppTabBar items={items('Início')} />);
    await fireEvent(screen.getByTestId('app-tab-bar'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 56, x: 0, y: 0 } },
    });
    await rerender(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <ThemeProvider>
          <AppTabBar items={items('Coleções')} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByRole('tab', { name: 'Coleções' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Início' })).not.toBeSelected();
  });
});
