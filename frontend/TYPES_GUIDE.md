# Types Guide - RideIn Zimbabwe

## Overview

This guide explains the refactored type system in `types.ts`, including discriminated unions, type guards, and best practices for type-safe development.

## User Types

### Backward Compatible `User` Interface

The `User` interface maintains full backward compatibility. All existing code continues to work:

```typescript
import { User } from './types';

const user: User = {
  id: '1',
  name: 'John',
  phone: '123',
  role: 'driver',
  city: 'Harare',
  rating: 4.5,
  tripsCount: 10,
  isOnline: true,
  avatar: 'url',
  // Driver-specific fields are optional and accessible without narrowing
  vehicle: {
    type: VehicleType.PASSENGER,
    category: 'Standard',
    photos: []
  }
};

// Access driver fields without narrowing (backward compatible)
console.log(user.vehicle?.type);
```

### Strict Discriminated Union for New Code

For new code, use `StrictUser` for better type safety:

```typescript
import { StrictUser, RiderUser, DriverUser, isDriverUser } from './types';

function handleUser(user: StrictUser) {
  if (isDriverUser(user)) {
    // TypeScript knows user is DriverUser here
    console.log(user.vehicle); // ✅ Type-safe
    console.log(user.subscription); // ✅ Type-safe
  } else {
    // TypeScript knows user is RiderUser here
    console.log(user.name); // ✅ Only base fields
  }
}
```

### Extracted Sub-Types

```typescript
// Vehicle type with enum
const vehicle: Vehicle = {
  type: VehicleType.PASSENGER,
  category: 'Standard',
  photos: ['url1', 'url2']
};

// Subscription type
const subscription: Subscription = {
  status: 'active',
  expiryDate: '2024-12-31',
  plan: 'premium'
};
```

## Trip Types

### Backward Compatible `Trip` Interface

The base `Trip` interface works as before:

```typescript
import { Trip, TripStatus } from './types';

const trip: Trip = {
  id: 'trip1',
  riderId: 'rider1',
  riderName: 'John',
  status: TripStatus.PENDING,
  // ... other fields
};
```

### Strict Trip Variants for Type Safety

Use discriminated union variants for status-specific logic:

```typescript
import { StrictTrip, CompletedTrip, ActiveTrip, PendingTrip } from './types';

function processTrip(trip: StrictTrip) {
  switch (trip.status) {
    case TripStatus.COMPLETED:
      // TypeScript knows trip is CompletedTrip
      console.log(trip.final_price); // ✅ Required field (number, not optional)
      console.log(trip.completedAt); // ✅ Required field (string, not optional)
      console.log(trip.driverId); // ✅ Required field
      break;
      
    case TripStatus.ARRIVING:
    case TripStatus.IN_PROGRESS:
      // TypeScript knows trip is ActiveTrip
      console.log(trip.driverId); // ✅ Required field (string, not optional)
      break;
      
    case TripStatus.PENDING:
      // TypeScript knows trip is PendingTrip
      // driverId and final_price fields don't exist (properly omitted)
      // trip.driverId would be a TypeScript error
      console.log(trip.riderId); // ✅ All other trip fields available
      break;
      
    case TripStatus.ACCEPTED:
      // TypeScript knows acceptedBidId and driverId are required
      console.log(trip.acceptedBidId); // ✅ Required field
      console.log(trip.driverId); // ✅ Required field
      break;
  }
}
```

## Location Types

### TripLocation (formerly Location)

The `Location` type has been renamed to `TripLocation` to avoid conflicts with the DOM `Location` type:

```typescript
import { TripLocation } from './types';

const pickup: TripLocation = {
  address: '123 Main St',
  lat: -17.8252,
  lng: 31.0335
};
```

**Note**: `Location` still works as a deprecated alias for backward compatibility.

## Runtime Type Guards

Use type guards to validate data from APIs and real-time channels:

```typescript
import { 
  isUser, isTrip, isBid, isChatMessage, 
  isTripLocation, isDriverUser 
} from './types';

// Validate API response
const response = await fetch('/api/user');
const data = await response.json();

if (isUser(data)) {
  // TypeScript knows data is User
  console.log(data.name);
  
  if (isDriverUser(data)) {
    // TypeScript knows data is DriverUser
    console.log(data.vehicle);
  }
}

// Validate Ably message
ablyService.subscribeToRideEvents(tripId, (data: unknown) => {
  if (isBid(data)) {
    // TypeScript knows data is Bid
    console.log(data.amount);
  }
});
```

## Component Props

Use the predefined component prop interfaces:

```typescript
import { HomeViewProps, LoginViewProps } from './types';

// In App.tsx
const RiderHomeView = lazyLoad<React.FC<HomeViewProps>>(...);
const DriverHomeView = lazyLoad<React.FC<HomeViewProps>>(...);
const LoginView = lazyLoad<React.FC<LoginViewProps>>(...);

// In component files
export const RiderHomeView: React.FC<HomeViewProps> = ({ 
  user, 
  onLogout, 
  onUserUpdate 
}) => {
  // Component implementation
};
```

## Ably Real-Time Payloads

Use typed payloads for Ably messages:

```typescript
import { DriverLocationPayload, RideEventPayload } from './types';

// Driver location updates
ablyService.subscribeToRideLocation(tripId, (data: unknown) => {
  // In production, validate with a type guard
  const location = data as DriverLocationPayload;
  console.log(location.lat, location.lng, location.rotation);
});

// Ride events - now with discriminated union
ablyService.subscribeToRideEvents(tripId, (data: unknown) => {
  const event = data as RideEventPayload;
  
  switch (event.type) {
    case 'bid':
      // TypeScript knows event.data is Bid
      console.log(event.data.amount);
      break;
      
    case 'status_update':
      // TypeScript knows event.data is { status: TripStatus }
      console.log(event.data.status);
      break;
      
    case 'cancel':
      // TypeScript knows event.data is { reason: string }
      console.log(event.data.reason);
      break;
  }
});
```

## Type Aliases

The following type aliases are available:

```typescript
export type UserRole = 'rider' | 'driver';
export type DriverStatus = 'pending' | 'approved' | 'rejected';
export type AccountStatus = 'active' | 'suspended' | 'banned';
export type SubscriptionStatus = 'active' | 'expired' | 'grace_period';
```

## Enums

All existing enums remain unchanged:

```typescript
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
```

## Migration Guide

### For Existing Code

No changes required! All existing code continues to work as-is.

### For New Code

1. **Use `StrictUser` instead of `User`** for discriminated union benefits
2. **Use type guards** when receiving data from APIs or Ably
3. **Use `TripLocation` instead of `Location`** to avoid name collisions
4. **Use `StrictTrip` variants** for status-specific logic
5. **Use component prop interfaces** for better type safety in lazy-loaded components

## Best Practices

1. **Always validate external data** with type guards before using it
2. **Prefer discriminated unions** for new features requiring role-specific logic
3. **Use the deprecated `Location` alias only for backward compatibility**
4. **Document any future breaking changes** when the deprecated aliases are removed
5. **Use enums** for type and status values instead of string literals
