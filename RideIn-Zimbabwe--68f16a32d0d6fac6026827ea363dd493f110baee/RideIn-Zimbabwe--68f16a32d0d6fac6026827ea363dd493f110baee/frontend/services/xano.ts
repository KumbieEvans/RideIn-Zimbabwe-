import { Trip, TripStatus, User, UserRole } from '../types';
import { ablyService } from './ably';

const PROXY_BASE = '/.netlify/functions/xano';

function cleanResponse(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanResponse);
  
  const clean: any = {};
  const forbiddenKeys = ['email', 'mail', 'user_email', 'reference-email', 'reference_email', 'e-mail'];
  
  for (const key in obj) {
    const k = key.toLowerCase();
    if (forbiddenKeys.some(forbidden => k === forbidden || k.includes('reference-email'))) continue;
    clean[key] = cleanResponse(obj[key]);
  }
  return clean;
}

async function xanoRequest<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
  const token = localStorage.getItem('ridein_auth_token');
  const url = `${PROXY_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      xanoService.logout();
      throw new Error("Session Expired: Please log in again.");
    }

    const data = await response.json().catch(() => ({ message: "Malformed JSON response from server" }));
    
    if (!response.ok) {
      const msg = data.message || data.error || `Protocol Error: ${response.status}`;
      throw new Error(msg);
    }

    return cleanResponse(data) as T;
  } catch (err: any) {
    throw err;
  }
}

export const xanoService = {
  async signup(userData: Partial<User>, pin: string): Promise<User> {
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
      payload.vehicle = {
        type: userData.vehicle?.type,
        category: userData.vehicle?.category,
        photos: userData.vehicle?.photos || []
      };
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
    const payload = { phone, password: pin };
    const res = await xanoRequest<{ authToken: string, user: User }>(`/auth/login`, 'POST', payload);
    this.saveSession(res.authToken, res.user);
    return res.user;
  },

  async requestPasswordReset(phone: string): Promise<{ message: string }> {
    return xanoRequest<{ message: string }>(`/auth/request-password-reset`, 'POST', { phone });
  },

  async completePasswordReset(phone: string, code: string, newPassword: string): Promise<User> {
    const res = await xanoRequest<{ authToken: string, user: User }>(
      `/auth/complete-password-reset`, 
      'POST', 
      { phone, code, password: newPassword }
    );
    this.saveSession(res.authToken, res.user);
    return res.user;
  },

  async getMe(): Promise<User | null> {
    try {
      const user = await xanoRequest<User>(`/auth/me`, 'GET');
      if (user) {
        localStorage.setItem('ridein_user_cache', JSON.stringify(cleanResponse(user)));
      }
      return user;
    } catch (e) { 
      return null; 
    }
  },

  saveSession(token: string, user: User) {
    const cleanUser = cleanResponse(user);
    localStorage.setItem('ridein_auth_token', token);
    localStorage.setItem('ridein_user_cache', JSON.stringify(cleanUser));
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
    const clean = cleanResponse(user);
    localStorage.setItem('ridein_user_cache', JSON.stringify(clean));
    return clean;
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
      is_guest_booking: !!payload.isGuestBooking,
      guest_name: payload.guestName || '',
      guest_phone: payload.guestPhone || '',
      scheduled_time: payload.scheduledTime || null,
      item_description: payload.itemDescription || '',
      requires_assistance: !!payload.requiresAssistance,
      cargo_photos: payload.cargoPhotos || []
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
    await xanoRequest(`/trips/${tripId}/status`, 'POST', { status });
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