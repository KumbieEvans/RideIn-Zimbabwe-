// Updates the authenticated driver's location and broadcasts the change via real-time events.
query location verb=POST {
  api_group = "Driver"
  auth = "users"

  input {
    // The current geographical location of the driver.
    object location {
      schema {
        // Latitude coordinate
        decimal lat
      
        // Longitude coordinate
        decimal lng
      }
    }
  }

  stack {
    // Update the driver's location in the database, or create a record if it doesn't exist.
    db.add_or_edit driver_locations {
      field_name = "driver_id"
      field_value = $auth.id
      data = {
        driver_id   : $auth.id
        lat         : $input.location.lat
        lng         : $input.location.lng
        is_online   : true
        last_updated: "now"
      }
    } as $updated_location
  
    // Send a real-time event to notify subscribers (e.g., riders) of the driver's new location.
    api.realtime_event {
      channel = "driver_updates"
      data = {
        driver_id : $auth.id
        location  : $input.location
        updated_at: "now"
      }
    
      auth_table = "users"
      auth_id = $auth.id
    }
  
    // Prepare the success response.
    var $api_response_data {
      value = {
        success: true
        message: "Location updated successfully."
        data   : $updated_location
      }
    }
  }

  response = $api_response_data
}