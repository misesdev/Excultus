import type { Unsubscribe } from '../types/Unsubscribe';

export interface NetworkStatus {
  isConnected: boolean;
  /** True when connected through an unmetered Wi-Fi/Ethernet link. */
  isWifi: boolean;
}

export interface NetworkMonitor {
  getStatus(): Promise<NetworkStatus>;
  subscribe(listener: (status: NetworkStatus) => void): Unsubscribe;
}
