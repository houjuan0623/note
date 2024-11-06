# ngin.conf

```json
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
	worker_connections 1024;
	# multi_accept on;
}

http {

	##
	# Basic Settings
	##
	
	sendfile on;
	# tcp_nopush on;
	# tcp_nodelay on;
	keepalive_timeout 65;
	types_hash_max_size 2048;
	# server_tokens off;

	# server_names_hash_bucket_size 64;
	# server_name_in_redirect off;

	include /etc/nginx/mime.types;
	default_type application/octet-stream;

	upstream sockjs_backend {
                ip_hash;
                server 172.16.17.199:3000;
	}
	
	server {
                listen 8080;
                location / {
                        client_max_body_size 1000m;
                        proxy_pass http://localhost:3000;
                        proxy_buffer_size   512k;
                        proxy_buffers   4 512k;
                        proxy_busy_buffers_size   512k;
                        proxy_read_timeout 150s;
                        proxy_http_version 1.1;
                        proxy_set_header Host $http_host;

                        proxy_set_header X-Real-IP $remote_addr;
                        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                        proxy_set_header X-Forwarded-Proto http;
                        proxy_set_header X-Nginx-Proxy true;

                        proxy_redirect default; 
                }
                location ~* /sockjs/ {
                        client_max_body_size 1000m;
                        proxy_pass http://localhost:3001;
                        proxy_buffer_size   512k;
                        proxy_buffers   4 512k;
                        proxy_busy_buffers_size   512k;
                        proxy_read_timeout 150s;
                        proxy_http_version 1.1;
                        proxy_set_header Upgrade $http_upgrade;
                        proxy_set_header Connection "upgrade";
                        proxy_set_header Host $http_host;

                        proxy_set_header X-Real-IP $remote_addr;
                        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                        proxy_set_header X-Forwarded-Proto http;
                        proxy_set_header X-Nginx-Proxy true;

                        proxy_redirect default;
                }
                location ~* /websocket {
                        client_max_body_size 1000m;
                        proxy_pass http://localhost:3001;
                        proxy_buffer_size   512k;
                        proxy_buffers   4 512k;
                        proxy_busy_buffers_size   512k;
                        proxy_read_timeout 150s;
                        proxy_http_version 1.1;
                        proxy_set_header Upgrade $http_upgrade;
                        proxy_set_header Connection "upgrade";
                        proxy_set_header Host $http_host;

                        proxy_set_header X-Real-IP $remote_addr;
                        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                        proxy_set_header X-Forwarded-Proto http;
                        proxy_set_header X-Nginx-Proxy true;

                        proxy_redirect default;
                } 
	}

	##
	# Logging Settings
	##

	access_log /var/log/nginx/access.log;
	error_log /var/log/nginx/error.log debug;

	##
	# Gzip Settings
	##

	gzip on;

	gzip_vary on;
	gzip_proxied any;
	gzip_comp_level 6;
	gzip_buffers 16 8k;
	gzip_http_version 1.1;
	gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

	##
	# Virtual Host Configs
	##

	include /etc/nginx/conf.d/*.conf;
	include /etc/nginx/sites-enabled/*;
}
```
