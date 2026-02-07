// Retrieves a specific trip by ID, ensuring only the involved rider or driver can access the details.
query "trips/id" verb=GET {
  api_group = "Trips"
  auth = "users"

  input {
    // The unique identifier of the trip to retrieve.
    int trip_id
  }

  stack {
    db.get trips {
      field_name = "id"
      field_value = $input.trip_id
    } as $trip
  
    // Verify that the trip record exists.
    precondition ($trip != null) {
      error_type = "inputerror"
      error = "Trip not found."
    }
  
    conditional {
      if ($trip.rider_id != $auth.id && $trip.driver_id != $auth.id) {
        throw {
          name = "accessdenied"
          value = "You are not authorized to view this trip."
        }
      }
    }
  }

  response = $trip
}