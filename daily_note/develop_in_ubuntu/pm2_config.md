# pm2\_config

安装pm2:&#x20;

```undefined
npm install pm2 -g
```

pm2\_config.json:

```json
{
  "apps": [
    {
      "name": "im-server-3000",
      "script": "/home/jindun/bundle/bundle/main.js",
      "args": [],
      "watch": false,
      "env": {
        "NODE_OPTIONS": "--max-old-space-size=1024",
        "MONGO_URL": "mongodb://172.16.17.190:27017/rocketchat?replicaSet=rs01",
        "MONGO_OPLOG_URL": "mongodb://172.16.17.190:27017/local?replicaSet=rs01",
        "REMOTE_URL": "http://172.16.17.28:18760",
        "DDP_DEFAULT_CONNECTION_URL": "http://172.16.17.190:8080",
        "ROOT_URL": "http://localhost:3000/",
        "PORT": 3000,
        "PROMETHEUS_PORT": 9458
      },
      "instances": 3,
      "exec_mode": "cluster"
    },
    {
      "name": "im-server-3001",
      "script": "/home/jindun/bundle/bundle/main.js",
      "args": [],
      "watch": false,
      "env": {
        "NODE_OPTIONS": "--max-old-space-size=1024",
        "MONGO_URL": "mongodb://172.16.17.190:27017/rocketchat?replicaSet=rs01",
        "MONGO_OPLOG_URL": "mongodb://172.16.17.190:27017/local?replicaSet=rs01",
        "REMOTE_URL": "http://172.16.17.28:18760",
        "ROOT_URL": "http://localhost:3001/",
        "PORT": 3001,
        "PROMETHEUS_PORT": 9459
      },
      "instances": 3,
      "exec_mode": "cluster"
    }
  ]
}
```
