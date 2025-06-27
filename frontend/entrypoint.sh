#!/bin/sh

# Generate file chứa biến môi trường runtime
cat <<EOF > /usr/share/nginx/html/env.js
window.env = {
  REACT_APP_API_URL: "$REACT_APP_API_URL"
}
EOF

# Khởi động Nginx
nginx -g "daemon off;"
