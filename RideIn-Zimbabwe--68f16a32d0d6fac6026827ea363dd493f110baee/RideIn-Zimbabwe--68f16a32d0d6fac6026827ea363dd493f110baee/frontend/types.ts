export type UserRole = 'rider' | 'driver';

export enum TripStatus {
  PENDING = 'PENDING',
  BIDDING = 'BIDDING',
  ACCEPTED = 'ACCEPTED',
  ARRIVING = 'ARRIVING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum VehicleType {
  PASSENGER = 'PASSENGER',
  FREIGHT = 'FREIGHT'
}

export enum PassengerCategory {
  STANDARD = 'Standard',
  PREMIUM = 'Premium',
  LUXURY = 'Luxury'
}

export enum FreightCategory {
  BIKE = 'Bike Delivery (Up to 20kg)',
  TONNE_1_2 = '1–2 Tonne Truck',
  TONNE_3_5 = '3–5 Tonne Truck',
  TONNE_7_10 = '7–10 Tonne Truck'
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  city: string;
  gender?: string;
  age?: number;
  maritalStatus?: string;
  religion?: string;
  personality?: 'Talkative' | 'Quiet';
  rating: number;
  tripsCount: number;
  isOnline: boolean;
  avatar: string;
  vehicle?: {
    type: string;
    category: string;
    photos: string[];
  };
  yearsExperience?: number;
  serviceAreas?: string[];
  subscription?: {
    status: 'active' | 'expired' | 'grace_period';
    expiryDate: string;
    plan: string;
  };
  token?: string;
  driver_profile_exists?: boolean;
  driver_verified?: boolean;
  driver_approved?: boolean; 
  driver_status?: 'pending' | 'approved' | 'rejected';
  force_rider_mode?: boolean;
  account_status?: 'active' | 'suspended' | 'banned';
}

export interface Bid {
  id: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  driverAvatar?: string;
  amount: number; 
  eta: string;
  vehicleInfo: string;
  isFavourite?: boolean;
}

export interface Location {
  address: string;
  lat: number;
  lng: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface Trip {
  id: string;
  riderId: string;
  riderName: string;
  status: TripStatus;
  type: VehicleType;
  category: string;
  pickup: Location;
  dropoff: Location;
  distance_km: number;
  suggested_price: number;
  proposed_price: number;
  final_price?: number;
  bids: Bid[];
  acceptedBidId?: string;
  driverId?: string; 
  distance: string; 
  duration: string;
  createdAt: string;
  completedAt?: string;
  notes?: string;
  partner?: string;
  city?: string; 
  scheduledTime?: string;
  isGuestBooking?: boolean;
  guestName?: string;
  guestPhone?: string;
  itemDescription?: string;
  requiresAssistance?: boolean;
  cargoPhotos?: string[];
}