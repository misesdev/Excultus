import { useCallback, useRef, useState } from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { getUserMessage } from '@core/errors';
import { feedback } from '../feedback/feedbackStore';

/**
 * Wraps a user-triggered command: exposes a `running` flag for loading
 * states, prevents double submission and reports failures with a friendly
 * message (the technical error goes to the structured log).
 */
export function useAsyncAction<Args extends unknown[], R>(
  action: (...args: Args) => Promise<R>,
  options: { successMessage?: string; event?: string } = {},
) {
  const { logger } = useDependencies();
  const [running, setRunning] = useState(false);
  const busy = useRef(false);
  const actionRef = useRef(action);
  actionRef.current = action;
  const { successMessage, event = 'ui.action_failed' } = options;

  const run = useCallback(
    async (...args: Args): Promise<R | undefined> => {
      if (busy.current) {
        return undefined;
      }
      busy.current = true;
      setRunning(true);
      try {
        const result = await actionRef.current(...args);
        if (successMessage) {
          feedback.success(successMessage);
        }
        return result;
      } catch (error) {
        logger.error(event, {}, error);
        feedback.error(getUserMessage(error));
        return undefined;
      } finally {
        busy.current = false;
        setRunning(false);
      }
    },
    [event, logger, successMessage],
  );

  return { run, running };
}
