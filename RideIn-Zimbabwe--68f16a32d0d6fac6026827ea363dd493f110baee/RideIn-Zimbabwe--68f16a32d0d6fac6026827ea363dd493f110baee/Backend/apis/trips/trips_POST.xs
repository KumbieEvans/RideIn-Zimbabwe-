// Creates a new trip request and notifies drivers via Ably
query trips verb=POST {
  api_group = "Trips"

  input {
    // Latitude of the pickup location
    decimal pickup_lat
  
    // Longitude of the pickup location
    decimal pickup_lng
  
    // Address of the pickup location
    text pickup_address
  
    // Latitude of the dropoff location
    decimal dropoff_lat
  
    // Longitude of the dropoff location
    decimal dropoff_lng
  
    // Address of the dropoff location
    text dropoff_address
  
    // Type of vehicle required
    text vehicle_type
  
    // Price offered by the rider
    decimal proposed_price
  
    // Distance of the trip in km
    decimal distance_km
  
    // Estimated duration in minutes
    int duration_mins
  
    // Optional notes for the driver
    text notes?
  
    // Whether this is a guest booking
    bool is_guest_booking?
  
    // Name of the guest
    text guest_name?
  
    // Phone number of the guest
    text guest_phone?
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $current_user
  
    db.add trips {
      data = {
        rider_id        : $auth.id
        status          : "PENDING"
        city            : $current_user.city
        pickup_lat      : $input.pickup_lat
        pickup_lng      : $input.pickup_lng
        pickup_address  : $input.pickup_address
        dropoff_lat     : $input.dropoff_lat
        dropoff_lng     : $input.dropoff_lng
        dropoff_address : $input.dropoff_address
        vehicle_type    : $input.vehicle_type
        proposed_price  : $input.proposed_price
        distance_km     : $input.distance_km
        duration_mins   : $input.duration_mins
        notes           : $input.notes
        is_guest_booking: $input.is_guest_booking
        guest_name      : $input.guest_name
        guest_phone     : $input.guest_phone
        created_at      : "now"
        updated_at      : "now"
      }
    } as $new_trip
  
    api.request {
      url = "https://rest.ably.io/channels/drivers/messages"
      method = "POST"
      params = {name: "trip_request", data: $new_trip}
      headers = []
        |push:"Content-Type: application/json"
        |push:("Authorization: Basic %s"
          |sprintf:($env.ABLY_API_KEY|base64_encode)
        )
    } as $ably_response
  }

  response = $new_trip
}