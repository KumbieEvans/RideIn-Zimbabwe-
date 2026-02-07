// Returns trip not in COMPLETED or CANCELLED status
query "trips/active" verb=GET {
  api_group = "Trips"
  auth = "users"

  input {
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $user
  
    var $mode {
      value = ($user.role == "driver" && $user.force_rider_mode == false) ? "driver" : "rider"
    }
  
    db.query trips {
      where = $db.trips.rider_id == $auth.id && $db.trips.status != "COMPLETED" && $db.trips.status != "CANCELLED"
      return = {type: "single"}
    } as $active_trip
  
    conditional {
      if ($active_trip == null && $mode == "driver") {
        db.query trips {
          where = $db.trips.driver_id == $auth.id && $db.trips.status != "COMPLETED" && $db.trips.status != "CANCELLED"
          return = {type: "single"}
        } as $active_trip
      }
    }
  
    conditional {
      if ($active_trip != null) {
        db.query bids {
          where = $db.bids.trip_id == $active_trip.id
          return = {type: "list"}
        } as $bids
      
        var.update $active_trip {
          value = $active_trip|set:"bids":$bids
        }
      }
    }
  }

  response = $active_trip
}