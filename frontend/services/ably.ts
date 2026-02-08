import * as Ably from 'ably/promises';
import { ChatMessage, Trip } from '../types';

type AblyConnectionState = 'disconnected' | 'connecting' | 'connected' | 'suspended' | 'failed';

class AblyService {
  private client: Ably.Types.RealtimePromise | null = null;
  public connectionState: AblyConnectionState = 'disconnected';
  private activeSubscriptions: Map<string, Ably.Types.RealtimeChannelPromise> = new Map();
  
  private channels = {
    global: 'global:alerts',
    driverPresence: (city: string, grid: string) => 
      `presence:drivers:${city.toLowerCase().replace(/\s/g, '_')}:${grid}`,
    rideRequests: (city: string, grid: string) => 
      `ride:requests:${city.toLowerCase().replace(/\s/g, '_')}:${grid}`,
    rideEvents: (tripId: string) => `ride:${tripId}:events`,
    rideLocation: (tripId: string) => `ride:${tripId}:location`,
    rideChat: (tripId: string) => `ride:${tripId}:chat`
  };

  connect(userId: string) {
    if (this.client) return;
    this.client = new Ably.Realtime.Promise({
      authUrl: '/.netlify/functions/ably-token',
      authParams: { clientId: userId },
      autoConnect: true,
    });

    this.client.connection.on((stateChange: Ably.Types.ConnectionStateChange) => {
      this.connectionState = stateChange.current as AblyConnectionState;
    });
  }

  prepareRoleSwitch() {
    this.activeSubscriptions.forEach((channel) => {
      channel.unsubscribe();
    });
    this.activeSubscriptions.clear();
  }

  async enterDriverPresence(city: string, lat: number, lng: number, data: any): Promise<void> {
    if (!this.client) return;
    const grid = `${Math.floor(lat * 10)}_${Math.floor(lng * 10)}`;
    const channelName = this.channels.driverPresence(city, grid);
    const channel = this.client.channels.get(channelName);
    try {
      await channel.presence.enter(data);
    } catch (err) {
      console.error(`[Ably] Driver Presence Error:`, err);
    }
  }

  publishDriverLocation(driverId: string, city: string, lat: number, lng: number, rotation: number, activeTripId?: string) {
    if (!this.client) return;
    const data = { driverId, lat, lng, rotation, ts: Date.now() };
    if (activeTripId) {
      this.client.channels.get(this.channels.rideLocation(activeTripId)).publish('u', data);
    } else {
      const grid = `${Math.floor(lat * 10)}_${Math.floor(lng * 10)}`;
      this.client.channels.get(this.channels.driverPresence(city, grid)).publish('loc', data);
    }
  }

  subscribeToNearbyDrivers(city: string, lat: number, lng: number, cb: (data: any) => void) {
    if (!this.client) return () => {};
    const grid = `${Math.floor(lat * 10)}_${Math.floor(lng * 10)}`;
    const channelName = this.channels.driverPresence(city, grid);
    const channel = this.client.channels.get(channelName);
    
    channel.subscribe('loc', (msg: Ably.Types.Message) => cb(msg.data));
    
    channel.presence.get().then((members: Ably.Types.PresenceMessage[]) => {
      if (members) {
        members.forEach((m: Ably.Types.PresenceMessage) => {
          if (m.data && m.data.lat) cb(m.data);
        });
      }
    }).catch((err: Error) => {
      console.error("[Ably] Failed to fetch presence members:", err);
    });

    this.activeSubscriptions.set(channelName, channel);
    return () => {
      channel.unsubscribe();
      this.activeSubscriptions.delete(channelName);
    };
  }

  disconnect() {
    this.client?.close();
    this.client = null;
    this.activeSubscriptions.clear();
  }

  subscribeToRideEvents(tripId: string, cb: (data: any) => void) { 
    return this.subscribe(this.channels.rideEvents(tripId), cb); 
  }

  subscribeToRideLocation(id: string, cb: (data: any) => void) { return this.subscribe(this.channels.rideLocation(id), cb); }
  subscribeToChat(id: string, cb: (msg: ChatMessage) => void) { return this.subscribe(this.channels.rideChat(id), cb); }
  
  async subscribeToRequests(city: string, lat: number, lng: number, cb: (data: Trip) => void) {
    if (!this.client) return () => {};
    const grid = `${Math.floor(lat * 10)}_${Math.floor(lng * 10)}`;
    const channelName = this.channels.rideRequests(city, grid);
    const channel = this.client.channels.get(channelName);
    channel.subscribe((msg: Ably.Types.Message) => cb(msg.data));
    this.activeSubscriptions.set(channelName, channel);
    return () => {
      channel.unsubscribe();
      this.activeSubscriptions.delete(channelName);
    };
  }

  subscribeToTripUpdates(tripId: string, callback: (update: any) => void) {
    return this.subscribe(this.channels.rideEvents(tripId), callback);
  }

  private subscribe(channelName: string, callback: (msg: any) => void) {
    if (!this.client) return () => {};
    const channel = this.client.channels.get(channelName);
    channel.subscribe((message: Ably.Types.Message) => callback(message.data));
    this.activeSubscriptions.set(channelName, channel);
    return () => {
      channel.unsubscribe();
      this.activeSubscriptions.delete(channelName);
    };
  }

  submitBid(tripId: string, bid: any) { 
    this.client?.channels.get(this.channels.rideEvents(tripId)).publish('bid', bid); 
  }
  
  sendChatMessage(tripId: string, msg: ChatMessage) { 
    this.client?.channels.get(this.channels.rideChat(tripId)).publish('msg', msg); 
  }
  
  unsubscribe(name: string) { 
    if (this.client) {
      this.client.channels.get(name).unsubscribe();
      this.activeSubscriptions.delete(name);
    }
  }
}

export const ablyService = new AblyService();