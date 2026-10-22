/**
 * @format
 */

import { AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from './src/app/App';
import { resolveLocale, setLocale } from './src/core/i18n';
import { getDeviceLocale } from './src/infrastructure/i18n/deviceLocale';
import { playbackService } from './src/infrastructure/audio/playbackService';
import { name as appName } from './app.json';

// Device language right away, so the first screen is already translated.
setLocale(resolveLocale(getDeviceLocale()));

AppRegistry.registerComponent(appName, () => App);
// Must be registered at startup so remote controls work in the background.
TrackPlayer.registerPlaybackService(() => playbackService);
