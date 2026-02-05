
import { Trip, TripStatus, User, UserRole, Bid } from '../types';
import { ablyService } from './ably';

const PROXY_BASE = '/.netlify/functions/xano';

async function xanoRequest<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
  const token = localStorage.getItem('ridein_auth_token');
  const url = `${PROXY_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      xanoService.logout();
      throw new Error("Your session has expired. Please log in again.");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Backend Error: ${response.status}`);
    }

    return data as T;
  } catch (err: any) {
    console.error(`[Xano Failure] ${method} ${endpoint}:`, err.message);
    throw err;
  }
}

export const xanoService = {
  async signup(userData: Partial<User>, pin: string): Promise<User> {
    // Surgically build payload to ensure no 'email' or other unsupported params are passed
    const payload: any = {
      name: userData.name,
      phone: userData.phone,
      role: userData.role,
      city: userData.city,
      password: pin
    };

    if (userData.role === 'driver') {
      payload.age = userData.age;
      payload.gender = userData.gender;
      payload.maritalStatus = userData.maritalStatus;
      payload.religion = userData.religion;
      payload.personality = userData.personality;
      payload.vehicle = userData.vehicle;
    }

    const res = await xanoRequest<{ authToken: string, user: User }>(
      `/auth/signup`, 
      'POST', 
      payload
    );
    this.saveSession(res.authToken, res.user);
    return res.user;
  },

  async login(phone: string, pin: string): Promise<User> {
    const res = await xanoRequest<{ authToken: string, user: User }>(
      `/auth/login`, 
      'POST', 
      { phone, password: pin }
    );
    this.saveSession(res.authToken, res.user);
    return res.user;
  },

  async getMe(): Promise<User | null> {
    try {
      const user = await xanoRequest<User>(`/auth/me`, 'GET');
      if (user) {
        // Clean up cached user object to ensure it matches current types
        localStorage.setItem('ridein_user_cache', JSON.stringify(user));
      }
      return user;
    } catch (e) { 
      return null; 
    }
  },

  saveSession(token: string, user: User) {
    localStorage.setItem('ridein_auth_token', token);
    localStorage.setItem('ridein_user_cache', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('ridein_auth_token');
    localStorage.removeItem('ridein_user_cache');
    ablyService.disconnect();
    window.location.href = '/';
  },

  async switchRole(userId: string, role: UserRole): Promise<User> {
    const user = await xanoRequest<User>(`/switch-role`, 'POST', { 
      user_id: parseInt(userId),
      role 
    });
    localStorage.setItem('ridein_user_cache', JSON.stringify(user));
    return user;
  },

  async updateLocation(lat: number, lng: number): Promise<void> {
    await xanoRequest(`/location`, 'POST', {
      location: { lat, lng }
    });
  },

  subscribeToActiveTrip(callback: (trip: Trip | null) => void) {
    const checkActive = async () => {
      try {
        const trip = await xanoRequest<Trip>(`/trips/active`, 'GET');
        callback(trip || null);
      } catch (e) { 
        callback(null); 
      }
    };
    checkActive();
    const interval = setInterval(checkActive, 12000); 
    return () => clearInterval(interval);
  },

  async requestTrip(payload: any): Promise<Trip> {
    const xanoPayload = {
      rider_id: parseInt(payload.riderId),
      vehicle_type: payload.type,
      category: payload.category,
      pickup: { lat: payload.pickup.lat, lng: payload.pickup.lng },
      dropoff: { lat: payload.dropoff.lat, lng: payload.dropoff.lng },
      pickup_address: payload.pickup.address,
      dropoff_address: payload.dropoff.address,
      proposed_price: Number(payload.proposed_price),
      distance_km: Number(payload.distance_km),
      duration_mins: parseInt(payload.duration),
      is_guest_booking: payload.isGuestBooking,
      guest_name: payload.guestName,
      guest_phone: payload.guestPhone,
      scheduled_time: payload.scheduledTime,
      item_description: payload.itemDescription,
      requires_assistance: payload.requiresAssistance,
      cargo_photos: payload.cargoPhotos
    };
    return xanoRequest<Trip>(`/trips`, 'POST', xanoPayload);
  },

  async cancelTrip(tripId: string): Promise<void> {
    await xanoRequest(`/trips/${tripId}/cancel`, 'POST');
  },

  async submitBid(tripId: string, offer_price: number, driver: User): Promise<void> {
    const res = await xanoRequest<any>(`/trips/${tripId}/offers`, 'POST', { 
      trip_id: parseInt(tripId),
      driver_id: parseInt(driver.id),
      offer_price: Number(offer_price) 
    });
    
    ablyService.submitBid(tripId, {
      id: res.id.toString(),
      driverId: driver.id,
      driverName: driver.name,
      driverRating: driver.rating,
      amount: Number(offer_price),
      eta: '5 min',
      vehicleInfo: driver.vehicle?.category || 'Standard'
    });
  },

  async acceptBid(tripId: string, bidId: string): Promise<Trip> {
    return xanoRequest<Trip>(`/trips/${tripId}/accept`, 'POST', { 
      bid_id: parseInt(bidId) 
    });
  },

  async updateTripStatus(tripId: string, status: TripStatus): Promise<void> {
    await xanoRequest(`/trips/${tripId}/status`, 'POST', { 
      status: status 
    });
  },

  async submitReview(tripId: string, rating: number, tags: string[], comment: string, isFavorite: boolean): Promise<void> {
    await xanoRequest(`/trips/${tripId}/review`, 'POST', { 
      trip_id: parseInt(tripId),
      rating: Number(rating), 
      tags, 
      comment, 
      is_favorite: isFavorite 
    });
  }
};
