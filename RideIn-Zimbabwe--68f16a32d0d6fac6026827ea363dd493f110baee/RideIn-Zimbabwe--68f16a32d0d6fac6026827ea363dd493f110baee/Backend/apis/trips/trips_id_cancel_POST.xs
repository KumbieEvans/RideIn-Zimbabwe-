// Cancels a trip if the user is authorized and the trip is in a valid state
query "trips/id/cancel" verb=POST {
  api_group = "Trips"

  input {
    // The ID of the trip to cancel
    int id
  }

  stack {
    // Retrieve the trip record
    db.get trips {
      field_name = "id"
      field_value = $input.id
    } as $trip
  
    // Check if trip exists
    precondition ($trip != null) {
      error_type = "notfound"
      error = "Trip not found"
    }
  
    // Check authorization: User must be rider or driver
    precondition ($trip.rider_id == $auth.id || $trip.driver_id == $auth.id) {
      error_type = "accessdenied"
      error = "You are not authorized to cancel this trip"
    }
  
    // Check if status allows cancellation
    var $allowed_statuses {
      value = ["PENDING", "BIDDING", "ACCEPTED", "ARRIVING"]
    }
  
    precondition ($allowed_statuses|contains:$trip.status) {
      error_type = "inputerror"
      error = "Trip cannot be cancelled in its current status"
    }
  
    // Update status to CANCELLED
    db.edit trips {
      field_name = "id"
      field_value = $input.id
      data = {status: "CANCELLED"}
    } as $updated_trip
  }

  response = {id: $updated_trip.id, status: $updated_trip.status}
}