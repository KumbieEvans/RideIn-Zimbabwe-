# Error Handling & Resilience Testing Guide

This document provides instructions for testing the error handling and resilience features implemented in the RideIn Zimbabwe frontend application.

## Features Implemented

### 1. Global Error Boundary
- **Component**: `components/ErrorBoundary.tsx`
- **Location**: Wraps the entire app in `index.tsx`
- **Purpose**: Catches all React component errors and displays user-friendly fallback UI

### 2. Toast Notification System
- **Components**: 
  - `components/Toast.tsx` - Individual toast
  - `components/ToastContainer.tsx` - Container for multiple toasts
  - `hooks/useToast.ts` - Toast hook
  - `hooks/useToastContext.tsx` - Toast context provider
- **Purpose**: Global notification system for errors, success, warnings, and info messages

### 3. Enhanced API Error Handling
- **Service**: `services/xano.ts`
- **Features**:
  - Retry logic with exponential backoff (max 3 attempts)
  - Request timeout (30 seconds)
  - Network offline detection
  - User-friendly error messages for different HTTP status codes
  - Auto-logout on 401 Unauthorized

### 4. Network Status Detection
- **Hook**: `hooks/useNetworkStatus.ts`
- **Component**: `components/OfflineBanner.tsx`
- **Purpose**: Detects online/offline status and shows banner when offline

### 5. Component-Level Error Handling
All async operations in the following components now have try-catch blocks with toast notifications:
- `components/LoginView.tsx`
- `components/RiderHomeView.tsx`
- `components/DriverHomeView.tsx`
- `components/ActiveTripView.tsx`
- `components/PendingApprovalView.tsx`
- `components/SideDrawer.tsx`

### 6. Enhanced Service Layer
- **Service**: `services/mapbox.ts`
- **Features**:
  - Request timeouts (10s for geocoding, 15s for routing)
  - Better error messages
  - Handles authentication failures
  - Handles rate limiting

## Testing Instructions

### Test 1: Offline Detection
**Steps:**
1. Open the app in your browser
2. Open DevTools (F12) → Network tab
3. Select "Offline" from the throttle dropdown
4. Observe the red "GRID CONNECTION OFFLINE" banner at the top
5. Go back online
6. Observe the green "CONNECTION RESTORED" banner appears briefly

**Expected Result:** User is informed when connection is lost and restored

### Test 2: API Retry Logic
**Steps:**
1. Open DevTools → Network tab
2. Enable "Offline" mode
3. Try to log in or perform any API action
4. Check Console for retry messages
5. Re-enable network before 3 retries complete
6. Observe successful request

**Expected Result:** Requests retry automatically with exponential backoff

### Test 3: Error Toast Notifications
**Steps:**
1. Try to log in with invalid credentials
2. Observe error toast notification in top-right corner
3. Toast should auto-dismiss after 5 seconds
4. Try multiple errors to see toast stacking

**Expected Result:** User-friendly error messages in toast notifications

### Test 4: Network Timeout
**Steps:**
1. Open DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Try to request a trip or perform search
4. Wait for timeout (30 seconds)
5. Observe timeout error message

**Expected Result:** "Request timeout" error after 30 seconds

### Test 5: Component Error Boundary
**Steps:**
1. To test in development, temporarily throw an error in a component:
   ```typescript
   useEffect(() => {
     throw new Error('Test error');
   }, []);
   ```
2. Reload the app
3. Observe the error boundary fallback UI
4. Click "Try Again" or "Reload App"

**Expected Result:** App doesn't crash; shows friendly error screen with recovery options

### Test 6: Invalid API Token (Mapbox)
**Steps:**
1. Set an invalid Mapbox token in `.env`
2. Try to search for an address
3. Observe error message

**Expected Result:** "Map service unavailable" error message

### Test 7: Session Expiration
**Steps:**
1. Log in to the app
2. Manually clear the auth token from localStorage:
   ```javascript
   localStorage.removeItem('ridein_auth_token');
   ```
3. Try to perform any authenticated action
4. Observe automatic logout

**Expected Result:** User is logged out with "Session expired" message

## Simulating Errors in Development

### Network Failures
```javascript
// In DevTools Console
// Simulate offline
window.dispatchEvent(new Event('offline'));

// Simulate online
window.dispatchEvent(new Event('online'));
```

### Component Errors
Add this to any component to test error boundary:
```typescript
if (Math.random() > 0.5) {
  throw new Error('Random error for testing');
}
```

### API Errors
Modify `services/xano.ts` to force errors:
```typescript
// Force timeout
const timeout = 100; // Very short timeout

// Force specific error
throw new Error('Simulated API error');
```

## Browser DevTools Tips

1. **Network Tab**: Monitor all API requests and their status
2. **Console**: View error logs and retry messages
3. **Application Tab**: Check localStorage for cached data
4. **Throttling**: Simulate slow/offline connections

## Expected User Experience

### Good Error Messages ✅
- "No internet connection. Please check your network and try again."
- "Request timeout. Please check your connection and try again."
- "Session expired. Please log in again."
- "Unable to calculate route. Please try different locations."

### Bad Error Messages ❌ (We avoid these)
- "Error 500"
- "Network error"
- "Failed to fetch"
- Generic "Something went wrong"

## Validation Checklist

After implementing error handling, verify:

- [ ] No unhandled promise rejections in console
- [ ] All async functions wrapped in try-catch
- [ ] User sees helpful error messages, not technical errors
- [ ] App doesn't crash when APIs fail
- [ ] Offline scenarios handled gracefully
- [ ] Failed requests retry automatically
- [ ] Loading states show during operations
- [ ] Errors logged to console for debugging
- [ ] Toast notifications work correctly
- [ ] Error boundary catches component errors
- [ ] Network status detection works
- [ ] All builds succeed without errors

## Common Issues & Solutions

### Issue: Toast not appearing
**Solution**: Ensure ToastProvider wraps your component in the tree

### Issue: Infinite retry loop
**Solution**: Check that non-retryable errors (4xx) don't trigger retries

### Issue: Error boundary not catching errors
**Solution**: Error boundaries only catch errors in child components, not in:
- Event handlers (use try-catch)
- Async code (use try-catch)
- Server-side rendering
- Errors in the error boundary itself

## Performance Considerations

- Toast notifications are memoized
- Network status uses native browser events
- API retry logic uses exponential backoff to prevent server overload
- Mapbox results are cached to reduce API calls
- Error boundaries don't re-render on every error

## Future Improvements

1. Add error reporting service (e.g., Sentry)
2. Implement request queue for offline mode
3. Add more specific error types
4. Create error recovery strategies
5. Add user error reporting feature
6. Implement circuit breaker pattern for failing services
