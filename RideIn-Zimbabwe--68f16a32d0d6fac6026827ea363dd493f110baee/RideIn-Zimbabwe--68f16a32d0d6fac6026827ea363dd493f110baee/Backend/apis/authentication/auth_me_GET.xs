// Retrieves the authenticated user's profile. If the user is a driver, includes vehicle and location data.
query "auth/me" verb=GET {
  api_group = "Authentication"
  auth = "users"

  input {
  }

  stack {
    // Fetch the authenticated user record
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $user_record
  
    // Create response object with explicitly selected fields to ensure security (excluding password)
    var $response_data {
      value = $user_record
        |pick:```
          [
            "id"
            "name"
            "phone"
            "role"
            "city"
            "gender"
            "age"
            "marital_status"
            "religion"
            "personality"
            "rating"
            "trips_count"
            "is_online"
            "avatar"
            "years_experience"
            "driver_profile_exists"
            "driver_verified"
            "driver_approved"
            "driver_status"
            "force_rider_mode"
            "account_status"
            "created_at"
            "service_areas"
          ]
          ```
    }
  
    // If the user is a driver, fetch and append driver-specific details
    conditional {
      if ($response_data.role == "driver") {
        // Fetch vehicle details associated with the user
        db.get vehicles {
          field_name = "user_id"
          field_value = $auth.id
        } as $vehicle
      
        // Fetch driver location details
        db.get driver_locations {
          field_name = "driver_id"
          field_value = $auth.id
        } as $location
      
        // Update response with vehicle and location data
        var.update $response_data {
          value = $response_data
            |set:"vehicle":$vehicle
            |set:"location":$location
        }
      }
    }
  }

  response = $response_data
}