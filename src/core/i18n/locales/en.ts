/** A message with singular/plural forms, chosen by `params.count`. */
export interface PluralMessage {
  one: string;
  other: string;
}

type Widen<T> = {
  [K in keyof T]: T[K] extends string ? string : Widen<T[K]>;
};

/**
 * English catalog: the default language and the source of truth for the
 * shape of every other catalog (missing keys fail type-checking).
 * Generated layout: keep keys grouped by feature.
 */
export const en = {
  common: {
    back: 'Back',
    loading: 'Loading',
    close: 'Close',
    retry: 'Try again',
    search: 'Search',
    clearSearch: 'Clear search',
    somethingWentWrong: 'Something went wrong',
    delete: 'Delete',
    cancel: 'Cancel',
    create: 'Create',
    audioCount: {
      one: '{{count}} track',
      other: '{{count}} tracks',
    },
    save: 'Save',
    moreOptions: 'More options',
    edit: 'Edit',
  },
  errors: {
    network: "Couldn't connect. Check your internet connection and try again.",
    invalidSourceUrl: "This link isn't supported. Check the address and try again.",
    sourceUnavailable: 'This content is not available at its source.',
    invalidResponse: 'The source responded unexpectedly. Try again later.',
    unsupportedFormat: 'This audio format is not supported.',
    insufficientStorage: 'Not enough storage space on the device.',
    downloadFailed: 'The download failed. Try again.',
    audioPlayback: "Couldn't play this audio.",
    database: 'Something went wrong while accessing your local data.',
    fileNotFound: 'The local file was not found. Download it again.',
    permissionDenied: "Permission denied. Check the app's permissions.",
    validation: 'Some data is invalid. Review it and try again.',
    notFound: 'The requested item was not found.',
    cancelled: 'Operation cancelled.',
    unknown: 'Something went wrong. Try again.',
    youtube: {
      videoUnavailable:
        "This YouTube video can't be downloaded: it's private, was removed, or is age- or region-restricted.",
      noAudio: "This YouTube video doesn't offer audio that can be downloaded.",
      extractionFailed:
        "Couldn't get the audio from this YouTube link. Make sure the video exists and is public, or try again later.",
      emptyPlaylist: 'No video in this playlist has audio available for download.',
    },
    player: {
      nothingPlayable:
        'Nothing in this list can play right now. Download the tracks (YouTube tracks only play once downloaded) or connect to the internet.',
    },
  },
  format: {
    relative: {
      now: 'just now',
      minutes: {
        one: '{{count}} min ago',
        other: '{{count}} min ago',
      },
      hours: {
        one: '{{count}} h ago',
        other: '{{count}} h ago',
      },
      yesterday: 'yesterday',
      days: {
        one: '{{count}} day ago',
        other: '{{count}} days ago',
      },
    },
  },
  imports: {
    sources: {
      directLink: 'Direct audio link',
      deviceFiles: 'Device files',
    },
    title: 'Import',
    intro:
      'Paste a link to an Internet Archive item, a direct link to an audio file, or a YouTube video or playlist (the audio is downloaded).',
    supportedSources: 'Supported sources: {{sources}}',
    deviceFormats: 'MP3, M4A, AAC, OGG, OPUS, FLAC or WAV',
    noSupportedFiles: 'No supported audio files were found in this item.',
    freeSpace: '{{size}} free on the device',
    insufficientSpace:
      "Not enough space for everything. Downloads that don't fit will fail with a warning.",
    importCount: {
      one: 'Import {{count}} item',
      other: 'Import {{count}} items',
    },
    selectItems: 'Select items to import',
    imported: {
      one: '{{count}} track imported',
      other: '{{count}} tracks imported',
    },
    queuedDownloads: '{{count}} in the download queue',
    unavailable: 'Unavailable',
    loadingMetadata: 'Fetching metadata…',
    readingFiles: 'Reading files…',
    target: {
      title: 'Target collection',
      new: 'New collection: {{name}}',
      existing: 'Collection: {{name}}',
      existingUnknown: 'Existing collection',
      none: 'No collection (library only)',
      use: 'Use',
      noneTitle: "Don't add to a collection",
      noneSubtitle: 'The tracks stay available in the library',
    },
    preview: {
      audioFiles: {
        one: '{{count}} audio file',
        other: '{{count}} audio files',
      },
      expandHint: 'Tap to expand the description',
      license: 'License: {{license}}',
      rejected: {
        one: '{{count}} file skipped (unsupported format): {{files}}',
        other: '{{count}} files skipped (unsupported format): {{files}}',
      },
      selectedCount: '{{count}} of {{total}} selected',
      unknownSize: '{{count}} without a known size',
      clear: 'Clear',
      selectAll: 'Select all',
    },
    url: {
      required: 'Paste a link',
      invalid: 'Use a full link starting with https://',
      label: 'Content link',
      submit: 'Find content',
      example: 'Use example: {{url}}',
    },
  },
  app: {
    preparing: 'Preparing your library…',
    startFailed: "Couldn't start",
  },
  tabs: {
    home: 'Home',
    collections: 'Collections',
    downloads: 'Downloads',
    settings: 'Settings',
  },
  forms: {
    nameRequired: 'Enter a name',
    maxLength: 'Use at most {{max}} characters',
    descriptionLabel: 'Description (optional)',
    descriptionPlaceholder: 'What is it about?',
    nameLabel: 'Name',
  },
  home: {
    greeting: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    },
    subtitle: 'Your audio library',
    searchLibrary: 'Search the library',
    importContent: 'Import content',
    empty: {
      title: 'Start your library',
      description:
        'Import courses, audiobooks, podcasts and music from the Internet Archive, YouTube, direct links or your device, and listen offline.',
      createCollection: 'Create collection',
    },
    continueListening: 'Continue listening',
    yourLibrary: 'Your library',
    collections: 'Collections',
    seeAll: 'See all',
    recentlyAdded: 'Recently added',
    shortcuts: {
      favorites: 'Favorites',
      playlists: 'Playlists',
      bookmarks: 'Bookmarks',
      history: 'History',
      downloaded: 'Downloaded',
      allAudios: 'All tracks',
    },
  },
  audioActions: {
    removedFromLibrary: 'Track removed from the library',
    play: 'Play',
    playNext: 'Play next',
    playingNext: 'Will play next',
    addToQueue: 'Add to queue',
    addedToQueue: 'Added to queue',
    removeFavorite: 'Remove from favorites',
    addFavorite: 'Add to favorites',
    pauseDownload: 'Pause download',
    resumeDownload: 'Resume download',
    removeDownload: 'Remove download',
    retryDownload: 'Try downloading again',
    download: 'Download to listen offline',
    downloadQueued: 'Download added to the queue',
    cannotDownload: "This audio can't be downloaded",
    addToPlaylist: 'Add to playlist',
    addToCollection: 'Add to collection',
    markUnplayed: 'Mark as not played',
    markCompleted: 'Mark as completed',
    openYouTube: 'Open on YouTube',
    openSource: 'Open source page',
    removeFromCollection: 'Remove from this collection',
    removeFromPlaylist: 'Remove from this playlist',
    stopPlayback: 'Stop playback',
    deleteFromLibrary: 'Delete from library',
    deleteDialog: {
      title: 'Delete from library?',
      message:
        '"{{title}}" will be removed from every collection and playlist, along with the downloaded file, progress and bookmarks.',
    },
  },
  play: {
    linkOnlyPlaylistItem:
      'This item only stores the link of a YouTube playlist. Import the playlist again to download its tracks.',
    stillDownloading:
      'The audio is still downloading. Tap again when the download finishes.',
    retryingDownload: 'Trying to download the audio again…',
    downloadingYouTube:
      'Downloading the YouTube audio. Tap again when the download finishes.',
    cannotDownload: "This audio can't be downloaded.",
  },
  library: {
    title: 'Library',
    sortBy: 'Sort: {{sort}}',
    sortTitle: 'Sort by',
    sortedBy: 'Sorted by {{sort}}',
    searchPlaceholder: 'Title, artist, album, collection or source',
    noResults: 'Nothing found',
    noResultsFor: 'No results for "{{query}}" in {{filter}}.',
    noAudiosIn: 'No tracks in {{filter}}.',
    empty: {
      title: 'Your library is empty',
      description:
        'Import audio from the Internet Archive, YouTube, direct links or your device.',
    },
    filters: {
      all: 'All',
      downloaded: 'Downloaded',
      notDownloaded: 'Not downloaded',
      favorites: 'Favorites',
      inProgress: 'In progress',
      completed: 'Completed',
    },
    sorts: {
      title: 'Name',
      addedAt: 'Date added',
      lastPlayed: 'Last played',
      duration: 'Duration',
    },
  },
  targetPicker: {
    added: 'Added',
    newCollection: 'New collection',
    newPlaylist: 'New playlist',
  },
  audioPicker: {
    title: 'Add tracks',
    addedTo: 'Added to {{name}}',
    emptyLibrary: 'Empty library',
    emptyDescription: 'Import content to be able to add it here.',
    select: 'Select {{title}}',
    addCount: {
      one: 'Add {{count}} track',
      other: 'Add {{count}} tracks',
    },
    selectAudios: 'Select tracks',
  },
  audio: {
    completed: 'Completed',
    remaining: '{{duration}} left',
    nowPlaying: 'now playing',
    listItemHint: 'Tap to play; long press for more options',
    moreOptions: 'More options for {{title}}',
    cover: 'Cover of {{title}}',
  },
  collections: {
    progress: 'Collection progress',
    overallProgress: 'Overall progress',
    offlineCount: {
      one: '{{count}} offline',
      other: '{{count}} offline',
    },
    downloadAll: 'Download all',
    shuffle: 'Shuffle play',
    moreOptions: 'More collection options',
    delete: {
      title: 'Delete "{{name}}"?',
      message: "The tracks won't be deleted from the library.",
      confirm: 'Delete collection',
      keepFiles: 'Keep downloaded files',
      keepFilesDescription: 'The tracks stay in the library and available offline.',
      freeSpace: 'Free up space',
      freeSpaceDescription:
        'Deletes downloads used only by this collection. Shared files are kept.',
    },
    form: {
      updated: 'Collection updated',
      created: 'Collection created',
      editTitle: 'Edit collection',
      namePlaceholder: 'E.g. Philosophy course',
    },
    sorts: {
      custom: 'Custom order',
    },
    notFound: 'Collection not found.',
    menu: {
      edit: 'Edit name and description',
      chooseCover: 'Choose cover',
      removeCover: 'Remove cover',
      addFromLibrary: 'Add tracks from the library',
      importHere: 'Import into this collection',
      reorder: 'Reorder',
    },
    closeSearch: 'Close search',
    searchHere: 'Search this collection',
    sort: 'Sort',
    noResults: 'Nothing found in this collection',
    empty: {
      title: 'Empty collection',
      description: 'Add tracks from the library or import from an external source.',
      addFromLibrary: 'Add from library',
    },
    moveUp: 'Move {{title}} up',
    moveDown: 'Move {{title}} down',
    downloadsQueued: {
      one: '{{count}} download added to the queue',
      other: '{{count}} downloads added to the queue',
    },
    nothingToDownload: 'Nothing new to download',
    deleted: 'Collection deleted',
    orderSaved: 'Order saved',
    emptyList: {
      title: 'Organize your tracks',
      description:
        'Collections group courses, audiobooks, podcasts and music. A track can be in several collections.',
    },
  },
  playlists: {
    deleted: 'Playlist deleted',
    notFound: 'Playlist not found.',
    empty: {
      title: 'Empty playlist',
      description: "Add tracks from any track's menu or pick them from the library.",
    },
    moveUp: 'Move up',
    moveDown: 'Move down',
    deleteAction: 'Delete playlist',
    deleteDialog: {
      title: 'Delete playlist?',
      message: 'The tracks stay in the library and in collections.',
    },
    form: {
      updated: 'Playlist updated',
      created: 'Playlist created',
      editTitle: 'Edit playlist',
      namePlaceholder: 'E.g. For the gym',
    },
    create: 'Create playlist',
    emptyList: {
      title: 'No playlists',
      description:
        'Playlists are playback sequences you build with tracks from any collection.',
    },
  },
  bookmarks: {
    saved: 'Bookmark saved',
    updated: 'Bookmark updated',
    markCurrent: 'Bookmark current position',
    none: 'No bookmarks',
    noneDescription: 'Save important points to come back to them later.',
    delete: 'Delete bookmark',
    at: 'Bookmark at {{position}}',
    itemHint: 'Tap to listen from this point; long press to edit',
    emptyList: {
      title: 'No bookmarks yet',
      description:
        'In the player, tap Bookmarks to save a point in a lecture with a note.',
    },
    form: {
      title: 'Bookmark',
      position: 'Position {{position}}',
      titleLabel: 'Title (optional)',
      titlePlaceholder: 'E.g. Important concept',
      noteLabel: 'Note (optional)',
      notePlaceholder: 'Write whatever you want to remember',
      submit: 'Save bookmark',
      titleTooLong: 'Title is too long',
      noteTooLong: 'Note is too long',
    },
  },
  history: {
    cleared: 'History cleared',
    clear: 'Clear history',
    empty: {
      title: 'Nothing in history',
      description: 'The tracks you listen to will show up here.',
    },
    clearDialog: {
      title: 'Clear history?',
      message:
        'Your listening log will be erased. Saved positions are kept, so "Continue listening" is not affected.',
      confirm: 'Clear',
    },
    startedAt: 'started at {{position}}',
  },
  player: {
    normalSpeed: 'Normal speed',
    speedTitle: 'Playback speed',
    timer: {
      title: 'Sleep timer',
      off: 'Off',
      endOfTrack: 'At the end of the current track',
      endOfTrackShort: 'End of track',
      chip: 'Timer',
    },
    previous: 'Previous track',
    next: 'Next track',
    pause: 'Pause',
    skipBack: 'Back {{seconds}} seconds',
    skipForward: 'Forward {{seconds}} seconds',
    position: 'Playback position',
    timeLeft: 'Time left',
    queue: 'Play queue',
    shuffled: 'Shuffled',
    itemCount: {
      one: '{{count}} item',
      other: '{{count}} items',
    },
    progress: 'Playback progress',
    open: 'Open player: {{title}}',
    openHint: 'Opens the full-screen player',
    couldNotPlay: "Couldn't play",
    repeat: {
      off: 'Repeat off',
      all: 'Repeat queue',
      one: 'Repeat track',
    },
    nothingPlaying: 'Nothing playing',
    nothingPlayingDescription: 'Pick a track from your library to start.',
    nowPlaying: 'Now playing',
    shuffleOff: 'Turn off shuffle',
    shuffleOn: 'Turn on shuffle',
    removeFromQueue: 'Remove {{title}} from the queue',
  },
  downloads: {
    used: 'Used',
    free: 'Free',
    active: {
      one: '{{count}} active download',
      other: '{{count}} active downloads',
    },
    waitingForNetwork: 'waiting for an allowed connection',
    totalProgress: 'Total download progress',
    pauseAll: 'Pause all',
    resumeAll: 'Resume all',
    retryFailed: 'Retry failed',
    fileDeleted: 'File deleted. The track stays in the library.',
    removedFromLibrary: 'Track removed from the library, playlists and collections.',
    failed: 'Failed',
    empty: {
      title: 'No downloads',
      description: 'Import content and download it to listen without internet.',
    },
    deleteDialog: {
      title: 'Delete download?',
      message:
        'Deleting only the file keeps the track in the library, playlists and collections, with progress and bookmarks, so you can download it again later. Removing it from the library deletes all of that.',
      removeFromLibrary: 'Remove from library',
      deleteFileOnly: 'Delete only the file',
    },
    status: {
      queued: 'Queued',
      downloading: 'Downloading',
      paused: 'Paused',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
    },
    sizeOf: '{{downloaded}} of {{total}}',
    downloadingPercent: 'Downloading {{percent}}',
    pausedLabel: 'Download paused',
    queuedLabel: 'In the download queue',
    failedLabel: 'Download failed',
    availableOffline: 'Available offline',
    cancel: 'Cancel download',
    deleteFile: 'Delete downloaded file',
  },
  settings: {
    title: 'Settings',
    comingSoon: 'Coming soon',
    footer:
      'Excultus {{version}} · everything stays on your device, no account and no tracking.',
    on: 'on',
    off: 'off',
    language: {
      title: 'Language',
      label: 'App language',
      system: 'Automatic',
      systemDescription: 'Follows the device language',
    },
    appearance: {
      title: 'Appearance',
      dark: 'Dark theme',
      light: 'Light theme',
      accent: 'Accent color',
    },
    playback: {
      title: 'Playback',
      defaultSpeed: 'Default speed',
      skipForward: 'Skip forward',
      skipBackward: 'Skip back',
      autoPlayNext: 'Play the next track automatically',
      completion: 'Mark as completed',
      atEnd: 'At the end',
      atEndDescription: 'Only when the track finishes',
      afterPercent: 'After listening to {{percent}} of the duration',
      autoResume: 'Resume where you left off',
      autoResumeDescription: 'When opening a track you already started',
    },
    downloads: {
      concurrent: 'Simultaneous downloads',
      wifiOnly: 'Download on Wi-Fi only',
      wifiOnlyDescription: 'Downloads wait for an unmetered network',
      autoRetry: 'Automatic retries',
      never: 'Never',
    },
    storage: {
      title: 'Storage',
      freed: '{{size}} freed',
      noTempFiles: 'No temporary files left',
      allGood: {
        one: 'All good: {{count}} file checked',
        other: 'All good: {{count}} files checked',
      },
      missing: {
        one: '{{count}} missing file',
        other: '{{count}} missing files',
      },
      orphansRemoved: {
        one: '{{count}} orphan removed',
        other: '{{count}} orphans removed',
      },
      filesRemoved: {
        one: '{{count}} file removed',
        other: '{{count}} files removed',
      },
      downloadedFiles: {
        one: '{{count}} downloaded file',
        other: '{{count}} downloaded files',
      },
      usage: '{{files}} · covers {{covers}} · temporary {{temp}}',
      cleanTemp: 'Clean temporary files',
      cleanTempDescription: "Removes partial downloads that won't be resumed",
      verify: 'Verify files',
      verifyDescription: 'Detects missing files and removes orphans',
      deleteAll: 'Delete all downloads',
      deleteAllDescription: 'Keeps the library, progress and bookmarks',
      deleteAllDialog: {
        title: 'Delete all downloads?',
        message:
          'Every downloaded audio file will be deleted. Nothing will be removed from the library.',
        confirm: 'Delete downloads',
      },
    },
    data: {
      title: 'Data',
      backupExported: 'Backup exported',
      metadataExported: 'Metadata exported',
      restored: 'Restored: {{audios}}, {{collections}}',
      collectionCount: {
        one: '{{count}} collection',
        other: '{{count}} collections',
      },
      exportBackup: 'Export backup',
      exportBackupDescription:
        'Library, collections, playlists, progress, bookmarks and settings (without the audio files)',
      exportMetadata: 'Export metadata',
      exportMetadataDescription: 'Track and collection catalog as JSON',
      restore: 'Restore backup',
      restoreDescription: 'Merges a backup into the current library',
      restoreDialog: {
        title: 'Restore backup?',
        message:
          "The file's data will be merged with the current data; nothing existing is deleted. The audio files will need to be downloaded again.",
        chooseFile: 'Choose file',
      },
      clearHistoryMessage: 'Your listening log will be erased. Saved positions are kept.',
    },
  },
};

export type Messages = Widen<typeof en>;
