import { useState, useEffect, useCallback, useRef } from 'react';
import { User, UserRole, Trip, TripStatus } from '../types';
import { xanoService } from '../services/xano';
import { ablyService } from '../services/ably';

// ============================================================================
// Hook 1: useAuth
// ============================================================================

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (phone: string, pin: string) => Promise<User | null>;
  signup: (userData: Partial<User>, pin: string) => Promise<User | null>;
  logout: () => void;
  requestPasswordReset: (phone: string) => Promise<{ message: string } | null>;
  completePasswordReset: (phone: string, code: string, newPassword: string) => Promise<User | null>;
  switchRole: (role: UserRole) => Promise<User | null>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Session restoration on mount
  useEffect(() => {
    const controller = new AbortController();

    const initAuth = async () => {
      try {
        const token = localStorage.getItem('ridein_auth_token');
        if (!token) {
          setInitializing(false);
          return;
        }

        // Attempt to fetch current user
        const currentUser = await xanoService.getMe().catch(() => null);
        
        if (!controller.signal.aborted) {
          if (currentUser) {
            setUser(currentUser);
            ablyService.connect(currentUser.id);
          } else {
            // Fallback to cached user if API fails
            const cached = localStorage.getItem('ridein_user_cache');
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                setUser(parsed);
                ablyService.connect(parsed.id);
              } catch (e) {
                console.error('[useAuth] Failed to parse cached user', e);
              }
            }
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('[useAuth] Initialization error', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setInitializing(false);
        }
      }
    };

    initAuth();

    return () => controller.abort();
  }, []);

  const login = useCallback(async (phone: string, pin: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await xanoService.login(phone, pin);
      setUser(loggedInUser);
      ablyService.connect(loggedInUser.id);
      return loggedInUser;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (userData: Partial<User>, pin: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const newUser = await xanoService.signup(userData, pin);
      setUser(newUser);
      ablyService.connect(newUser.id);
      return newUser;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    xanoService.logout();
  }, []);

  const requestPasswordReset = useCallback(async (phone: string): Promise<{ message: string } | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await xanoService.requestPasswordReset(phone);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password reset request failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const completePasswordReset = useCallback(async (
    phone: string,
    code: string,
    newPassword: string
  ): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const resetUser = await xanoService.completePasswordReset(phone, code, newPassword);
      setUser(resetUser);
      ablyService.connect(resetUser.id);
      return resetUser;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password reset failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const switchRole = useCallback(async (role: UserRole): Promise<User | null> => {
    if (!user) {
      setError('No user logged in');
      return null;
    }
    
    setLoading(true);
    setError(null);
    try {
      const updatedUser = await xanoService.switchRole(user.id, role);
      setUser(updatedUser);
      return updatedUser;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Role switch failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshUser = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const currentUser = await xanoService.getMe();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to refresh user';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    loading: loading || initializing,
    error,
    login,
    signup,
    logout,
    requestPasswordReset,
    completePasswordReset,
    switchRole,
    refreshUser,
    clearError,
  };
}

// ============================================================================
// Hook 2: useActiveTrip
// ============================================================================

export interface UseActiveTripReturn {
  activeTrip: Trip | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useActiveTrip(): UseActiveTripReturn {
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    // Note: refresh is a no-op since the subscription automatically polls for active trips.
    // This function is provided for API consistency but doesn't perform any action.
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = xanoService.subscribeToActiveTrip((trip) => {
      setLoading(false);
      
      if (trip && trip.status !== TripStatus.COMPLETED && trip.status !== TripStatus.CANCELLED) {
        setActiveTrip(trip);
      } else {
        setActiveTrip(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    activeTrip,
    loading,
    error,
    refresh,
  };
}

// ============================================================================
// Hook 3: useTrips
// ============================================================================

export interface CreateTripRequest {
  riderId: string;
  type: string;
  category: string;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string; lat: number; lng: number };
  proposed_price: number;
  distance_km: number;
  duration: number;
  isGuestBooking?: boolean;
  guestName?: string;
  guestPhone?: string;
  scheduledTime?: string;
  itemDescription?: string;
  requiresAssistance?: boolean;
  cargoPhotos?: string[];
}

export interface UseTripsReturn {
  requestTrip: (payload: CreateTripRequest) => Promise<Trip | null>;
  cancelTrip: (tripId: string) => Promise<boolean>;
  acceptBid: (tripId: string, bidId: string) => Promise<Trip | null>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useTrips(): UseTripsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestTrip = useCallback(async (payload: CreateTripRequest): Promise<Trip | null> => {
    setLoading(true);
    setError(null);
    try {
      const trip = await xanoService.requestTrip(payload);
      return trip;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to request trip';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelTrip = useCallback(async (tripId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await xanoService.cancelTrip(tripId);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel trip';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptBid = useCallback(async (tripId: string, bidId: string): Promise<Trip | null> => {
    setLoading(true);
    setError(null);
    try {
      const trip = await xanoService.acceptBid(tripId, bidId);
      return trip;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept bid';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    requestTrip,
    cancelTrip,
    acceptBid,
    loading,
    error,
    clearError,
  };
}

// ============================================================================
// Hook 4: useBids
// ============================================================================

export interface UseBidsReturn {
  submitBid: (tripId: string, offerPrice: number, driver: User) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useBids(): UseBidsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitBid = useCallback(async (
    tripId: string,
    offerPrice: number,
    driver: User
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await xanoService.submitBid(tripId, offerPrice, driver);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit bid';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    submitBid,
    loading,
    error,
    clearError,
  };
}

// ============================================================================
// Hook 5: useTripStatus
// ============================================================================

export interface UseTripStatusReturn {
  updateStatus: (tripId: string, status: TripStatus) => Promise<boolean>;
  submitReview: (
    tripId: string,
    rating: number,
    tags: string[],
    comment: string,
    isFavorite: boolean
  ) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useTripStatus(): UseTripStatusReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = useCallback(async (tripId: string, status: TripStatus): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await xanoService.updateTripStatus(tripId, status);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update trip status';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitReview = useCallback(async (
    tripId: string,
    rating: number,
    tags: string[],
    comment: string,
    isFavorite: boolean
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await xanoService.submitReview(tripId, rating, tags, comment, isFavorite);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit review';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    updateStatus,
    submitReview,
    loading,
    error,
    clearError,
  };
}

// ============================================================================
// Hook 6: useDriverLocation
// ============================================================================

export interface UseDriverLocationReturn {
  location: { lat: number; lng: number } | null;
  isWatching: boolean;
  error: string | null;
}

export function useDriverLocation(
  userId: string,
  city: string,
  isOnline: boolean
): UseDriverLocationReturn {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOnline) {
      // Stop watching when going offline
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setIsWatching(false);
      }
      return;
    }

    // Start watching when online
    if (navigator.geolocation) {
      setIsWatching(true);
      setError(null);

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(newLocation);

          // Publish location to Ably when online
          if (isOnline) {
            ablyService.publishDriverLocation(
              userId,
              city,
              newLocation.lat,
              newLocation.lng,
              0 // rotation/heading (0 = north, not yet implemented)
            );
          }
        },
        (err) => {
          setError(err.message || 'Geolocation error');
          setIsWatching(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setError('Geolocation is not supported by this browser');
      setIsWatching(false);
    }

    // Cleanup on unmount or when going offline
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setIsWatching(false);
      }
    };
  }, [userId, city, isOnline]);

  return {
    location,
    isWatching,
    error,
  };
}

// ============================================================================
// Hook 7: useAvailableTrips
// ============================================================================

export interface UseAvailableTripsReturn {
  trips: Trip[];
  skipTrip: (tripId: string) => void;
  clearTrips: () => void;
}

export function useAvailableTrips(
  city: string,
  lat: number,
  lng: number,
  isOnline: boolean
): UseAvailableTripsReturn {
  const [trips, setTrips] = useState<Trip[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isOnline) {
      // Cleanup subscription when going offline
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    // Subscribe to ride requests when online
    const subscribe = async () => {
      try {
        const unsub = await ablyService.subscribeToRequests(city, lat, lng, (trip: Trip) => {
          setTrips((prev) => {
            // Deduplicate trips by ID
            const existingIndex = prev.findIndex((t) => t.id === trip.id);
            if (existingIndex >= 0) {
              // Update existing trip
              const updated = [...prev];
              updated[existingIndex] = trip;
              return updated;
            } else {
              // Add new trip to the beginning
              return [trip, ...prev];
            }
          });
        });

        unsubscribeRef.current = unsub;
      } catch (err) {
        console.error('[useAvailableTrips] Subscription error:', err);
      }
    };

    subscribe();

    // Cleanup on unmount or when going offline
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [city, lat, lng, isOnline]);

  const skipTrip = useCallback((tripId: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== tripId));
  }, []);

  const clearTrips = useCallback(() => {
    setTrips([]);
  }, []);

  return {
    trips,
    skipTrip,
    clearTrips,
  };
}
