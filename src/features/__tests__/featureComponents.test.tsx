import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '@test/support/renderWithProviders';
import { buildAudio } from '@test/support/builders';
import { archiveItem } from '@test/support/seed';
import type { AudioLibraryItem } from '@features/audios';
import { AudioListItem, audioDurationLabel } from '@features/audios/presentation';
import { ImportItemRow } from '@features/imports/presentation';

function libraryItem(overrides: Partial<AudioLibraryItem> = {}): AudioLibraryItem {
  return {
    audio: buildAudio('a1', { durationMs: 3600000, artist: 'Prof' }),
    offline: 'not-downloaded',
    isFavorite: false,
    ...overrides,
  };
}

describe('AudioListItem', () => {
  it('describes title, duration and playback state for screen readers', async () => {
    const onPress = jest.fn();
    const onMore = jest.fn();
    await renderWithTheme(
      <AudioListItem
        item={libraryItem()}
        nowPlaying="playing"
        onPress={onPress}
        onMore={onMore}
        testID="row"
      />,
    );
    const row = screen.getByTestId('row');
    expect(row).toHaveAccessibleName('Aula a1, 1 h · Prof, em reprodução');
    await fireEvent.press(row);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Mais opções para Aula a1' }),
    );
    expect(onPress).toHaveBeenCalled();
    expect(onMore).toHaveBeenCalled();
  });

  it('labels progress as remaining time or completion', () => {
    const progress = { positionMs: 1800000, completed: false, lastPlayedAt: 'x' };
    expect(audioDurationLabel(libraryItem({ progress }))).toBe('Restam 30 min');
    expect(
      audioDurationLabel(libraryItem({ progress: { ...progress, completed: true } })),
    ).toBe('Concluído');
  });
});

describe('ImportItemRow', () => {
  it('toggles available items and blocks restricted ones', async () => {
    const onToggle = jest.fn();
    await renderWithTheme(
      <>
        <ImportItemRow
          item={archiveItem('a', { trackNumber: 3 })}
          selected
          onToggle={onToggle}
        />
        <ImportItemRow
          item={archiveItem('b', {
            availability: 'restricted',
            acquisition: { kind: 'link-only' },
          })}
          selected={false}
          onToggle={onToggle}
        />
      </>,
    );
    expect(screen.getByText('Restrito')).toBeOnTheScreen();
    const rows = screen.getAllByRole('checkbox');
    const available = rows.find(row =>
      row.props.accessibilityLabel?.startsWith('Aula a,'),
    );
    const restricted = rows.find(row =>
      row.props.accessibilityLabel?.startsWith('Aula b,'),
    );
    expect(available).toBeChecked();
    expect(restricted).toBeDisabled();
    await fireEvent.press(available!);
    await fireEvent.press(restricted!);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
