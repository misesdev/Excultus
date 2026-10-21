import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import type { NetworkMonitor, NetworkStatus } from '@core/application';
import type { Unsubscribe } from '@core/types';

function toStatus(state: NetInfoState): NetworkStatus {
  const isConnected = state.isConnected === true && state.isInternetReachable !== false;
  const unmetered =
    state.type === 'wifi' || state.type === 'ethernet'
      ? state.details?.isConnectionExpensive !== true
      : false;
  return { isConnected, isWifi: isConnected && unmetered };
}

export class NetInfoNetworkMonitor implements NetworkMonitor {
  async getStatus(): Promise<NetworkStatus> {
    return toStatus(await NetInfo.fetch());
  }

  subscribe(listener: (status: NetworkStatus) => void): Unsubscribe {
    return NetInfo.addEventListener(state => listener(toStatus(state)));
  }
}
