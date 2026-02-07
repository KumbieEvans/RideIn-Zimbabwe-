// Creates or updates the vehicle details for the authenticated driver and marks their profile as having a driver profile.
query "driver/vehicle" verb=POST {
  api_group = "Driver"
  auth = "users"

  input {
    // Type of the vehicle (e.g., Sedan, SUV)
    text type
  
    // Category of the vehicle (e.g., Economy, Premium)
    text category
  
    // Make of the vehicle
    text make
  
    // Model of the vehicle
    text model
  
    // Year of manufacture
    text year
  
    // Vehicle license plate number
    text plate_number
  
    // Vehicle color
    text color
  
    // Array of vehicle photo URLs
    text[] photos
  }

  stack {
    // Create or update the vehicle record linked to the authenticated user
    db.add_or_edit vehicles {
      field_name = "user_id"
      field_value = $auth.id
      data = {
        user_id     : $auth.id
        type        : $input.type
        category    : $input.category
        make        : $input.make
        model       : $input.model
        year        : $input.year
        plate_number: $input.plate_number
        color       : $input.color
        photos      : $input.photos
      }
    } as $vehicle
  
    // Update the user's profile to indicate they have a driver profile
    db.edit users {
      field_name = "id"
      field_value = $auth.id
      data = {driver_profile_exists: true}
    } as $updated_user
  }

  response = $vehicle
}