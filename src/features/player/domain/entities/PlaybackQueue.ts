export type RepeatMode = 'off' | 'one' | 'all';

/**
 * Immutable playback queue. `items` keeps insertion order; `order` holds the
 * play order (identity when shuffle is off) as indexes into `items`;
 * `position` points into `order`.
 */
export interface PlaybackQueue {
  items: readonly string[];
  order: readonly number[];
  position: number;
  shuffled: boolean;
}

export type RandomSource = () => number;

export const EMPTY_QUEUE: PlaybackQueue = {
  items: [],
  order: [],
  position: -1,
  shuffled: false,
};

function identity(length: number): number[] {
  return Array.from({ length }, (_, index) => index);
}

function shuffleArray(values: number[], random: RandomSource): number[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as number, result[i] as number];
  }
  return result;
}

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

export function createQueue(audioIds: readonly string[], startIndex = 0): PlaybackQueue {
  const items = unique(audioIds);
  if (items.length === 0) {
    return EMPTY_QUEUE;
  }
  const startId = audioIds[startIndex] ?? items[0];
  return {
    items,
    order: identity(items.length),
    position: Math.max(0, items.indexOf(startId as string)),
    shuffled: false,
  };
}

export function currentAudioId(queue: PlaybackQueue): string | undefined {
  const index = queue.order[queue.position];
  return index === undefined ? undefined : queue.items[index];
}

/** Audio ids in play order. */
export function orderedIds(queue: PlaybackQueue): string[] {
  return queue.order.map(index => queue.items[index] as string);
}

/** Next position for an automatic advance or "next" command, or null at the end. */
export function nextPosition(queue: PlaybackQueue, repeat: RepeatMode): number | null {
  if (queue.order.length === 0) {
    return null;
  }
  if (queue.position < queue.order.length - 1) {
    return queue.position + 1;
  }
  return repeat === 'all' ? 0 : null;
}

export function previousPosition(
  queue: PlaybackQueue,
  repeat: RepeatMode,
): number | null {
  if (queue.order.length === 0) {
    return null;
  }
  if (queue.position > 0) {
    return queue.position - 1;
  }
  return repeat === 'all' ? queue.order.length - 1 : null;
}

export function moveTo(queue: PlaybackQueue, position: number): PlaybackQueue {
  if (position < 0 || position >= queue.order.length) {
    return queue;
  }
  return { ...queue, position };
}

/** Shuffles upcoming items, keeping the current one in place. */
export function setShuffle(
  queue: PlaybackQueue,
  enabled: boolean,
  random: RandomSource,
): PlaybackQueue {
  if (queue.items.length === 0 || enabled === queue.shuffled) {
    return { ...queue, shuffled: enabled };
  }
  const currentIndex = queue.order[queue.position] ?? 0;
  if (enabled) {
    const rest = identity(queue.items.length).filter(index => index !== currentIndex);
    return {
      ...queue,
      order: [currentIndex, ...shuffleArray(rest, random)],
      position: 0,
      shuffled: true,
    };
  }
  return {
    ...queue,
    order: identity(queue.items.length),
    position: currentIndex,
    shuffled: false,
  };
}

/** Appends audios to the end of the play order (duplicates are ignored). */
export function enqueue(
  queue: PlaybackQueue,
  audioIds: readonly string[],
): PlaybackQueue {
  const fresh = unique(audioIds).filter(id => !queue.items.includes(id));
  if (queue.items.length === 0) {
    return createQueue(fresh);
  }
  const items = [...queue.items, ...fresh];
  const added = fresh.map((_, offset) => queue.items.length + offset);
  return { ...queue, items, order: [...queue.order, ...added] };
}

/** Inserts audios right after the current one. Existing entries are moved. */
export function playNext(
  queue: PlaybackQueue,
  audioIds: readonly string[],
): PlaybackQueue {
  const current = currentAudioId(queue);
  const incoming = unique(audioIds).filter(id => id !== current);
  if (queue.items.length === 0) {
    return createQueue(incoming);
  }
  let next = queue;
  for (const id of incoming) {
    next = removeAudio(next, id);
  }
  const items = [...next.items, ...incoming];
  const added = incoming.map((_, offset) => next.items.length + offset);
  const order = [...next.order];
  order.splice(next.position + 1, 0, ...added);
  return { ...next, items, order };
}

/** Removes an audio from the queue (never the current one). */
export function removeAudio(queue: PlaybackQueue, audioId: string): PlaybackQueue {
  const itemIndex = queue.items.indexOf(audioId);
  if (itemIndex < 0 || currentAudioId(queue) === audioId) {
    return queue;
  }
  const orderPosition = queue.order.indexOf(itemIndex);
  const items = queue.items.filter((_, index) => index !== itemIndex);
  const order = queue.order
    .filter(index => index !== itemIndex)
    .map(index => (index > itemIndex ? index - 1 : index));
  const position = orderPosition < queue.position ? queue.position - 1 : queue.position;
  return { ...queue, items, order, position };
}
