/**
 * @format
 */

import { AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from './src/app/App';
import { playbackService } from './src/infrastructure/audio/playbackService';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
// Must be registered at startup so remote controls work in the background.
TrackPlayer.registerPlaybackService(() => playbackService);
