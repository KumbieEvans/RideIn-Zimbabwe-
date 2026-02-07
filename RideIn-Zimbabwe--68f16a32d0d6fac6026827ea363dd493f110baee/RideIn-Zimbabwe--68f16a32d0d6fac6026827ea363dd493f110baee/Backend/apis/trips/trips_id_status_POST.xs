// Updates the status of a trip with state transition validation.
query "trips/id/status" verb=POST {
  api_group = "Trips"
  auth = "users"

  input {
    // The ID of the trip to update
    int id
  
    // The new status for the trip (e.g., ACCEPTED, STARTED, COMPLETED, CANCELLED)
    text status filters=trim|upper
  }

  stack {
    // Fetch the trip record based on the provided ID
    db.get trips {
      field_name = "id"
      field_value = $input.id
    } as $trip
  
    // Check if the trip exists
    precondition ($trip != null) {
      error_type = "notfound"
      error = "Trip not found."
    }
  
    // Ensure the authenticated user is either the rider or the driver
    precondition ($trip.rider_id == $auth.id || $trip.driver_id == $auth.id) {
      error_type = "accessdenied"
      error = "You are not authorized to update this trip."
    }
  
    // Validate the status transition based on the current status
    var $valid_transition {
      value = false
    }
  
    switch ($trip.status) {
      case ("PENDING") {
        conditional {
          if ($input.status == "ACCEPTED" || $input.status == "CANCELLED") {
            var.update $valid_transition {
              value = true
            }
          }
        }
      } break
    
      case ("ACCEPTED") {
        conditional {
          if ($input.status == "ARRIVED" || $input.status == "STARTED" || $input.status == "CANCELLED") {
            var.update $valid_transition {
              value = true
            }
          }
        }
      } break
    
      case ("ARRIVED") {
        conditional {
          if ($input.status == "STARTED" || $input.status == "CANCELLED") {
            var.update $valid_transition {
              value = true
            }
          }
        }
      }
    
      case ("STARTED") {
        conditional {
          if ($input.status == "COMPLETED") {
            var.update $valid_transition {
              value = true
            }
          }
        }
      } break
    
      default {
        // Terminal states like COMPLETED or CANCELLED cannot change
      }
    }
  
    precondition ($valid_transition) {
      error_type = "inputerror"
      error = "Invalid status transition from " ~ $trip.status ~ " to " ~ $input.status
    }
  
    // Update the trip status and timestamps
    db.edit trips {
      field_name = "id"
      field_value = $input.id
      data = {
        status      : $input.status
        updated_at  : "now"
        completed_at: ($input.status == "COMPLETED" ? "now" : $trip.completed_at)
      }
    } as $updated_trip
  }

  response = $updated_trip
}