---
icon: gears
---

# Rocketchat 长连接通信

## connect

**上传的数据格式**

```
["{\"msg\":\"connect\"}"]
```

**响应的数据格式**

```
a["{"msg":"connected","session":"899c8a30-a812-11ef-8e6b-798088259cfa"}"]
```

## login

Rocketchat的登录分为长短连接的登录。前置条件：connect。

### 短连接登录



### 长连接登录

**上传的数据格式：**

```
["{\"msg\":\"method\",\"id\":\"1\",\"method\":\"login\",\"params\":[{\"resume\":\"CmeXLEyx2sAfKF-gabjgGo-4BaENIWI6wLswPL0RP9N\"}]}"]
```

* msg: string用于区分消息类型：method，subscribe，ping。
* id: string用于标记并区分不同的客户端请求，以便客户端能够正确地将服务器响应与原始请求匹配起来。在登录过程中 `"id":"1"` 就是 `login` 请求的唯一标识符。当服务器响应登录请求时，响应消息中也会包含 `"id":"1"`，这样客户端就能知道这个响应是针对之前的登录请求的。
* method: string用于标记调用的方法。
* params: object\[]用于标记方法的参数。

**响应的数据格式：**



```
a["{\"msg\":\"result\",\"id\":\"5\",\"result\":{\"id\":\"xFWck5bgzRWRs9Pri\",\"token\":\"BXeNk5EZMsPE4QdUCWOkFMBFX-LGAPQccglls0cacvg\",\"tokenExpires\":{\"$date\":1733494313168},\"type\":\"resume\"}}"]
```



```
a["{\"msg\":\"updated\",\"methods\":[\"5\"]}"]
```

### 登录紧跟的长连接消息

1. stream-notify-user message
   1. `["{"msg":"sub","id":"QgQANgCw3majdpuG8","name":"stream-notify-user","params":["xFWck5bgzRWRs9Pri/message",{"useCollection":false,"args":[]}]}"]`
2. stream-notify-user subscriptions-changed
   1. `["{"msg":"sub","id":"Q76g6tzAb6pkAnTAa","name":"stream-notify-user","params":["xFWck5bgzRWRs9Pri/subscriptions-changed",{"useCollection":false,"args":[]}]}"]`

## stream-notify-all

**上传的数据格式：**

```
["{\"msg\":\"sub\",\"id\":\"LoENtfnMocBDHRdK3\",\"name\":\"stream-notify-all\",\"params\":[\"public-settings-changed\",{\"useCollection\":false,\"args\":[]}]}"]
```

msg: string用于区分消息类型：method，subscribe，ping。

id: string 用于区分不同的订阅: 一个客户端可以同时订阅多个事件，每个订阅都会有一个唯一的 `id`。这使得服务器可以精确地知道客户端订阅了哪些事件，即使这些事件来自同一个 Streamer（一个Streamer代表一个publication，一个connection可以订阅多次订阅同一个Stramer，依靠id区分不同订阅）。

name: string 用于表示要订阅的 publication。

params: \[string, object] 其中string对应eventName，object对应和订阅相关的配置信息。

**响应的数据格式：**

```
a["{\"msg\":\"ready\",\"subs\":[\"LoENtfnMocBDHRdK3\"]}"]
```

