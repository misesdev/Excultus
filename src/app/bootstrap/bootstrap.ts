import {
  createContainer,
  type AppContainer,
  type PlatformAdapters,
} from '../dependency-injection/createContainer';
import { createProductionAdapters } from './productionAdapters';

let instance: Promise<AppContainer> | null = null;

/**
 * Builds and starts the application once per JS runtime. A failed attempt
 * is forgotten so the user can retry from the error screen.
 */
export function bootstrapApplication(
  adaptersFactory: () => PlatformAdapters = createProductionAdapters,
): Promise<AppContainer> {
  if (!instance) {
    instance = (async () => {
      const container = await createContainer(adaptersFactory());
      await container.start();
      container.logger.info('app.started');
      return container;
    })();
    instance.catch(() => {
      instance = null;
    });
  }
  return instance;
}
