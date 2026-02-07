// Accepts a bid for a trip, updates the trip status, rejects other bids, and notifies the driver.
query "trips/id/accept" verb=POST {
  api_group = "Trips"
  auth = "users"

  input {
    // The ID of the trip being accepted
    int trip_id
  
    // The ID of the bid being accepted
    int bid_id
  }

  stack {
    // Fetch the trip record using the provided trip_id
    db.get trips {
      field_name = "id"
      field_value = $input.trip_id
    } as $trip
  
    // Check if the authenticated user is the rider of the trip
    precondition ($trip.rider_id == $auth.id) {
      error_type = "accessdenied"
      error = "You are not authorized to accept bids for this trip."
    }
  
    // Fetch the bid record using the provided bid_id
    db.get bids {
      field_name = "id"
      field_value = $input.bid_id
    } as $bid
  
    // Check if the bid belongs to the provided trip_id
    precondition ($bid.trip_id == $input.trip_id) {
      error_type = "inputerror"
      error = "The selected bid does not belong to this trip."
    }
  
    // Update the trip status, driver, and final price
    db.edit trips {
      field_name = "id"
      field_value = $input.trip_id
      data = {
        status     : "ACCEPTED"
        driver_id  : $bid.driver_id
        final_price: $bid.offer_price
      }
    } as $updated_trip
  
    // Find all other bids for this trip to reject them
    db.query bids {
      where = $db.bids.trip_id == $input.trip_id && $db.bids.id != $input.bid_id
      return = {type: "list"}
    } as $other_bids
  
    // Iterate through other bids and set status to REJECTED
    foreach ($other_bids) {
      each as $other_bid {
        db.edit bids {
          field_name = "id"
          field_value = $other_bid.id
          data = {status: "REJECTED"}
        }
      }
    }
  
    // Notify the driver that their bid was accepted
    api.realtime_event {
      channel = "driver_updates"
      data = $updated_trip
      auth_table = "users"
      auth_id = $bid.driver_id
    }
  
    // Construct the response object
    var $response_obj {
      value = {
        id         : $updated_trip.id
        status     : $updated_trip.status
        driver_id  : $updated_trip.driver_id
        final_price: $updated_trip.final_price
      }
    }
  }

  response = $response_obj
}