api_group Authentication {
  canonical = "G-puafhu"
  cors = {
    mode       : "custom"
    origins    : ["https://ridein-zimbabwe-1.netlify.app/"]
    methods    : ["DELETE", "GET", "POST", "PUT"]
    headers    : ["Authorization", "Content-Type"]
    credentials: true
    max_age    : 3600
  }
}