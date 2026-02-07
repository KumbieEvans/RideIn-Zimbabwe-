// Allows a driver to place a bid on a trip.
query "trips/id/offers" verb=POST {
  api_group = "Trips"
  auth = "users"

  input {
    // The ID of the trip to bid on.
    int trip_id
  
    // The price offered by the driver.
    decimal offer_price
  
    // Optional ID of the driver. Defaults to the authenticated user.
    int driver_id?
  }

  stack {
    // Determine the driver ID to use for the bid.
    var $driver_id_to_use {
      value = ($input.driver_id != null) ? $input.driver_id : $auth.id
    }
  
    // Fetch the authenticated user to verify driver status.
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $current_user
  
    // Ensure the authenticated user is an approved driver.
    precondition ($current_user.driver_approved) {
      error_type = "accessdenied"
      error = "You must be an approved driver to place a bid."
    }
  
    // Retrieve the trip details.
    db.get trips {
      field_name = "id"
      field_value = $input.trip_id
    } as $trip
  
    // Ensure the trip exists.
    precondition ($trip != null) {
      error_type = "inputerror"
      error = "Trip not found."
    }
  
    // Check if a bid already exists for this driver and trip.
    db.query bids {
      where = $db.bids.trip_id == $input.trip_id && $db.bids.driver_id == $driver_id_to_use
      return = {type: "count"}
    } as $existing_bid_count
  
    // Prevent duplicate bids.
    precondition ($existing_bid_count == 0) {
      error_type = "inputerror"
      error = "You have already placed a bid on this trip."
    }
  
    // Create the new bid record.
    db.add bids {
      data = {
        trip_id    : $input.trip_id
        driver_id  : $driver_id_to_use
        offer_price: $input.offer_price
        status     : "pending"
      }
    } as $new_bid
  
    // Send a realtime notification to the rider.
    api.realtime_event {
      channel = "trip_" ~ $input.trip_id
      data = $new_bid
      auth_table = "users"
      auth_id = $trip.rider_id
    }
  }

  response = $new_bid
}