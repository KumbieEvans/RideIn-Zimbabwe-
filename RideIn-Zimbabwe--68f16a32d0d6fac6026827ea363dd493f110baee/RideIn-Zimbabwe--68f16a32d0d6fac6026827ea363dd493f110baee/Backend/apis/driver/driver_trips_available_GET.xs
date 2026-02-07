// Fetches trips with status 'BIDDING' within a specified radius of the driver's location.
query "driver/trips/available" verb=GET {
  api_group = "Driver"
  auth = "users"

  input {
    // Driver's current latitude
    decimal lat
  
    // Driver's current longitude
    decimal lng
  
    // Search radius in kilometers
    int radius
  }

  stack {
    // Fetch all trips currently in the bidding phase
    db.query trips {
      where = $db.trips.status == "BIDDING"
      return = {type: "list"}
    } as $bidding_trips
  
    // Initialize the array to hold trips that match the criteria
    var $available_trips {
      value = []
    }
  
    foreach ($bidding_trips) {
      each as $trip {
        // Calculate distance between driver and pickup location in meters
        // Note: pickup_lat/lng are text in schema, converting to decimal
        util.geo_distance {
          latitude_1 = $input.lat
          longitude_1 = $input.lng
          latitude_2 = $trip.pickup_lat|to_decimal
          longitude_2 = $trip.pickup_lng|to_decimal
        } as $distance_meters
      
        // Convert distance to kilometers for comparison
        var $distance_km {
          value = $distance_meters / 1000
        }
      
        // Filter trips within the specified radius
        conditional {
          if ($distance_km <= $input.radius) {
            array.push $available_trips {
              value = {
                id                : $trip.id
                status            : $trip.status
                distance_to_pickup: $distance_km
                proposed_price    : $trip.proposed_price
              }
            }
          }
        }
      }
    }
  }

  response = $available_trips
}