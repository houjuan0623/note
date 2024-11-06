# nginx.conf

```
user www-data;
worker_processes auto;
worker_rlimit_nofile 65535;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
        worker_connections 65535;
        # multi_accept on;
}

http {

        ##
        # Basic Settings
        ##
        include       mime.types;
        # default_type  application/octet-stream;
        
        sendfile on;
        # tcp_nopush on;
        # tcp_nodelay on;
        keepalive_timeout 150;
        types_hash_max_size 2048;
        # server_tokens off;

        # server_names_hash_bucket_size 64;
        # server_name_in_redirect off;

        # include /etc/nginx/mime.types;
        default_type application/octet-stream;
        ##
        # SSL Settings
        ##

        # ssl_protocols TLSv1.2;
        # ssl_prefer_server_ciphers on;

        server {
                listen 443 ssl;
                # listen 8001;
                server_name  chat.kingduns.com;
                # Create folders(/var/log/nginx/) in advance
                # error_log /var/log/nginx/kingdunschaterror.access.log;
                # move valid crt&key to corresponding location
                ssl_certificate      /home/jindun/fornginx/kingduns.com_cert_chain.pem;
                ssl_certificate_key  /home/jindun/fornginx/kingduns.com_key.key;
                ssl_ciphers 'HIGH:!DHE:!EXPORT:!aNULL:!eNULL:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA:EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH';
                ssl_protocols TLSv1.2;

                # IM Server
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
                # 权限管理系统 for 张志浩
                location /qxgl {
                        alias /home/jindun/dist/;
                        index index.html;
                }
                location /qxgl-api/ {
                        proxy_set_header Host $http_host;
                        proxy_set_header X-Real-IP $remote_addr;
                        proxy_set_header REMOTE-HOST $remote_addr;
                        proxy_buffer_size   512k;
                        proxy_buffers   4 512k;
                        proxy_busy_buffers_size   512k;
                        proxy_temp_file_write_size 512k;
                        proxy_read_timeout 300s;
                        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                        proxy_pass http://172.20.20.165:18760/;
                }
                # 金盾信安隐私政策和用户协议的配置
                location /privacy {
                        alias /home/jindun/隐私和协议/;
                        index 金盾信安APP隐私政策.htm;
                }
                location /agreement {
                        alias /home/jindun/隐私和协议/;
                        index 金盾信安app用户协议.htm;
                }
                # app 安装包的下载地址的配置
                location /apk_package {
                        alias /home/jindun/apk-package/;
                        default_type application/vnd.android.package-archive;
                        add_header Content-Disposition "attachment; filename=jindun1.0.3.apk";
                        autoindex off;
                        try_files jindun1.0.3.apk =404;
                }
        }

        ##
        # Logging Settings
        ##

        access_log /var/log/nginx/access.log;
        error_log /var/log/nginx/error.log debug;
        # error_log /var/log/nginx/error.log;
        ##
        # Gzip Settings
        ##

        gzip on;

        gzip_vary on;
        gzip_proxied any;
        gzip_comp_level 6;
        gzip_buffers 8 256k;
        gzip_http_version 1.1;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

        ##
        # Virtual Host Configs
        ##

        include /etc/nginx/conf.d/*.conf;
        include /etc/nginx/sites-enabled/*;
}
```
