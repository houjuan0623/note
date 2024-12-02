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

## stream-notify-all

在登录之前就会发送这个订阅。负责订阅配置信息。

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

1. stream-notify-logged

```
["{\"msg\":\"sub\",\"id\":\"YnMc93e94eytvR8wr\",\"name\":\"stream-notify-logged\",\"params\":[\"deleteEmojiCustom\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"YnMc93e94eytvR8wr\"]}"]
```

2. stream-notify-logged

```
["{\"msg\":\"sub\",\"id\":\"XbxsDNjJo2Zy4pREG\",\"name\":\"stream-notify-logged\",\"params\":[\"updateEmojiCustom\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"XbxsDNjJo2Zy4pREG\"]}"]
```

3. stream-notify-logged

```
["{\"msg\":\"sub\",\"id\":\"h8oShnPzgS2vmPF9d\",\"name\":\"stream-notify-logged\",\"params\":[\"user-status\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"h8oShnPzgS2vmPF9d\"]}"]
```

```
a["{\"msg\":\"changed\",\"collection\":\"stream-notify-logged\",\"id\":\"id\",\"fields\":{\"eventName\":\"user-status\",\"args\":[[\"xFWck5bgzRWRs9Pri\",\"jindun\",1,null]]}}"]
```

4. stream-notify-logged

```
["{\"msg\":\"sub\",\"id\":\"A74M7gntLrQwFvK5u\",\"name\":\"stream-notify-logged\",\"params\":[\"deleteCustomUserStatus\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"A74M7gntLrQwFvK5u\"]}"]
```

5. stream-notify-logged

```
["{\"msg\":\"sub\",\"id\":\"N7JEd5TzZotk44kH9\",\"name\":\"stream-notify-logged\",\"params\":[\"updateCustomUserStatus\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"N7JEd5TzZotk44kH9\"]}"]
```

6. stream-notify-logged

```
["{\"msg\":\"sub\",\"id\":\"mnNuYnAKth8wXLKMq\",\"name\":\"stream-notify-logged\",\"params\":[\"updateAvatar\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"mnNuYnAKth8wXLKMq\"]}"]
```

7. stream-notify-logged

```
["{\"msg\":\"sub\",\"id\":\"37hzuMp27opGDp2pA\",\"name\":\"stream-notify-logged\",\"params\":[\"Users:NameChanged\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"37hzuMp27opGDp2pA\"]}"]
```

8. stream-notify-logged

```
["{\"msg\":\"sub\",\"id\":\"g3uCFDto6brKshbNh\",\"name\":\"stream-notify-logged\",\"params\":[\"Users:Deleted\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"g3uCFDto6brKshbNh\"]}"]
```

9. stream-notify-user

```
["{\"msg\":\"sub\",\"id\":\"Gg8S9YjiFifYTw4Q6\",\"name\":\"stream-notify-user\",\"params\":[\"xFWck5bgzRWRs9Pri/subscriptions-changed\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"Gg8S9YjiFifYTw4Q6\"]}"]
```

10. stream-notify-all

```
["{\"msg\":\"sub\",\"id\":\"ZGC6N7DHx6fgKZFoe\",\"name\":\"stream-notify-all\",\"params\":[\"deleteCustomSound\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"ZGC6N7DHx6fgKZFoe\"]}"]
```

11. stream-notify-all

```
["{\"msg\":\"sub\",\"id\":\"ocfeL8SXZhezphkmY\",\"name\":\"stream-notify-all\",\"params\":[\"updateCustomSound\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"ocfeL8SXZhezphkmY\"]}"]
```

12. stream-notify-user

```
["{\"msg\":\"sub\",\"id\":\"P4wKGgMERMB4KmRcE\",\"name\":\"stream-notify-user\",\"params\":[\"xFWck5bgzRWRs9Pri/uiInteraction\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"P4wKGgMERMB4KmRcE\"]}"]
```

13. stream-notify-user

```
["{\"msg\":\"sub\",\"id\":\"oPARpc9Cs9A9JZdzf\",\"name\":\"stream-notify-user\",\"params\":[\"xFWck5bgzRWRs9Pri/message\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"oPARpc9Cs9A9JZdzf\"]}"]
```

14. stream-roles

```
["{\"msg\":\"sub\",\"id\":\"G8JKnXMn3r7j34vaZ\",\"name\":\"stream-roles\",\"params\":[\"roles\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"G8JKnXMn3r7j34vaZ\"]}"]
```

15. stream-notify-user

```
["{\"msg\":\"sub\",\"id\":\"idMxRmhjCw6ET2HX9\",\"name\":\"stream-notify-user\",\"params\":[\"xFWck5bgzRWRs9Pri/webrtc\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"idMxRmhjCw6ET2HX9\"]}"]
```

16. stream-notify-user

```
["{\"msg\":\"sub\",\"id\":\"KKjiB64NzAuazkBJu\",\"name\":\"stream-notify-user\",\"params\":[\"xFWck5bgzRWRs9Pri/otr\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"KKjiB64NzAuazkBJu\"]}"]
```

17. stream-notify-logged

```
["{\"msg\":\"sub\",\"id\":\"5F79TzwBdYfWxBeF6\",\"name\":\"stream-notify-logged\",\"params\":[\"banner-changed\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"5F79TzwBdYfWxBeF6\"]}"]
```

18. stream-notify-user

```
["{\"msg\":\"sub\",\"id\":\"K3JfJStcFYntS24jh\",\"name\":\"stream-notify-user\",\"params\":[\"xFWck5bgzRWRs9Pri/notification\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"K3JfJStcFYntS24jh\"]}"]
```

19. stream-notify-user

```
["{\"msg\":\"sub\",\"id\":\"sHY2YPFcAD27wDqRS\",\"name\":\"stream-notify-user\",\"params\":[\"xFWck5bgzRWRs9Pri/userData\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"sHY2YPFcAD27wDqRS\"]}"]
```

```
a["{\"msg\":\"changed\",\"collection\":\"stream-notify-user\",\"id\":\"id\",\"fields\":{\"eventName\":\"xFWck5bgzRWRs9Pri/userData\",\"args\":[{\"diff\":{\"_updatedAt\":{\"$date\":1733155983855},\"status\":\"online\",\"statusConnection\":\"online\"},\"unset\":{},\"type\":\"updated\"}]}}"]
```

20. stream-notify-logged

```
["{\"msg\":\"sub\",\"id\":\"et5hrSsiwgwaY5t6Q\",\"name\":\"stream-notify-logged\",\"params\":[\"roles-change\",{\"useCollection\":false,\"args\":[]}]}"]
```

```
a["{\"msg\":\"ready\",\"subs\":[\"et5hrSsiwgwaY5t6Q\"]}"]
```









