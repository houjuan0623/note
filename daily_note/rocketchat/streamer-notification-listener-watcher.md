---
icon: circle-exclamation
---

# Streamer、Notification、Listener、watcher

源码位置

* [Streamer](https://github.com/RocketChat/Rocket.Chat/blob/4.0.0/server/modules/streamer/streamer.module.ts)源码
* [Notification](https://github.com/RocketChat/Rocket.Chat/blob/4.0.0/server/modules/notifications/notifications.module.ts)源码
* [Listener](https://github.com/RocketChat/Rocket.Chat/blob/4.0.0/server/modules/listeners/listeners.module.ts)源码
* [watcher](https://github.com/RocketChat/Rocket.Chat/blob/4.0.0/server/modules/watchers/watchers.module.ts)源码

## Streamer

### 数据结构

<figure><img src="../.gitbook/assets/image (40).png" alt=""><figcaption></figcaption></figure>

### 介绍

Streamer是Rocketchat后端管理订阅的核心数据结构。

服务器启动过程中，将会通过new notification -> new Streamer的调用关系初始化Streamer，其中的allow rules将会在此时完成初始化。

服务器启动以后，客户端将会通过ddp subscribe消息向Subscriptions和subscriptionsByEventName中添加数据。

### method stream-notify-room

* GENERAL/user-activity

### allow rules 初始化







### 问题

#### StreamerLocal 有什么用？

StreamCentral是用来管理streamer的类。

引入streamerCentral的原因：在一个ddp-streamer服务中会有多个streamer实例负责处理业务逻辑，streamerCentral将这些streamer统一管理起来。

```typescript
// streamerCentral 实现源码
class StreamerCentralClass<N extends keyof StreamerEvents> extends EventEmitter {
	public instances: Record<string, Streamer<N>> = {};

	constructor() {
		super();
	}
}

export const StreamerCentral = new StreamerCentralClass();

// 在streamer的constructor中如下：
if (StreamerCentral.instances[name]) {
	console.warn('Streamer instance already exists:', name);
	return StreamerCentral.instances[name];
}
// 可见streamerCentral就是为了将streamer储存起来
```

储存起来什么时候使用？

```typescript
// streamer -> emit
if (broadcast === true) {
    StreamerCentral.emit('broadcast', this.name, eventName, args);
}
// listen broadcast & emit stream
StreamerCentral.on('broadcast', (name, eventName, args) => {
    void api.broadcast('stream', [name, eventName, args]);
});
// listen stream
this.onEvent('stream', ([streamer, eventName, args]): void => {
    // TODO rename StreamerCentral to StreamerStore or something to use it only as a store
    const stream = StreamerCentral.instances[streamer];
    return stream?.emitWithoutBroadcast(eventName, ...args);
});
```

#### 什么情况下需要使用emit(emitWithBroadcast)？什么情况下使用emitWithoutBroadcast？

**`emit(eventName: string | symbol, ...args: any[]): boolean`**

* 触发事件并在 **本地** 和 **所有连接的客户端** 上广播。
* 当你需要将事件通知发送给所有订阅了此 Streamer 的客户端时使用。
* 例如，当一个新消息被创建时，你可以使用 `emit` 方法将新消息的详细信息广播给所有聊天室的参与者。

**`emitWithoutBroadcast(eventName: string, ...args: any[]): void`**

* 仅在 **本地** 触发事件，**不会广播** 给客户端。
* 当你需要在服务器端触发事件，但不需要通知客户端时使用。
* 例如，当 Streamer 接收到来自另一个服务器的广播消息时，可以使用 `emitWithoutBroadcast` 方法在本地处理该消息，而无需将其再次广播给客户端。

比如我启动了n个ddp-streamer服务，这个时候不同的ddp-streamer会维护不同的用户长连接，比如提醒已登录的用户某个用户登录上来了，就需要使用emit，将事件broadcast给各个ddp-streamer，各个ddp-streamer接收到以后在内部处理相应的逻辑。

## notification

### 数据结构

<figure><img src="../.gitbook/assets/image (42).png" alt=""><figcaption></figcaption></figure>



## listeners

### 数据结构

<figure><img src="../.gitbook/assets/image (43).png" alt=""><figcaption></figcaption></figure>



## watchers

### 数据结构

<figure><img src="../.gitbook/assets/image (44).png" alt=""><figcaption></figcaption></figure>

## message

### 短连接



### 发送消息

A和B和C分别连接了Rocketchat的服务器，三个客户端目前位于同一个聊天室。 A客户端发消息，会首先接收到四条消息，然后发送一个method消息，接下来接收到三条消息。

```javascript
// 消息1----a[]
{
    "msg": "changed",
    "collection": "stream-notify-user",
    "id": "id",
    "fields": {
        "eventName": "jAfXDKCQoEydreNpi/subscriptions-changed",
        "args": [
            "updated",
            {
                "_id": "ZRuLyj2HbTcdQXamY",
                "open": true,
                "alert": false,
                "unread": 0,
                "userMentions": 0,
                "groupMentions": 0,
                "ts": {
                    "$date": 1732293708012
                },
                "rid": "giT7Qfy76GRfJWF7u",
                "name": "12321123123",
                "fname": "12321123123",
                "t": "p",
                "u": {
                    "_id": "jAfXDKCQoEydreNpi",
                    "username": "test222",
                    "name": "test222"
                },
                "_updatedAt": {
                    "$date": 1732358386458
                },
                "ls": {
                    "$date": 1732358386458
                }
            }
        ]
    }
}
// 消息2----a[]
{
  "msg": "changed",
  "collection": "stream-room-messages",
  "id": "id",
  "fields": {
    "eventName": "giT7Qfy76GRfJWF7u",
    "args": [
      {
        "_id": "5irE67FQL2T5bsKJr",
        "rid": "giT7Qfy76GRfJWF7u",
        "msg": "343532535",
        "ts": {
          "$date": 1732358386454
        },
        "u": {
          "_id": "jAfXDKCQoEydreNpi",
          "username": "test222",
          "name": "test222"
        },
        "urls": [],
        "mentions": [],
        "channels": [],
        "md": [
          {
            "type": "PARAGRAPH",
            "value": [
              {
                "type": "PLAIN_TEXT",
                "value": "343532535"
              }
            ]
          }
        ],
        "_updatedAt": {
          "$date": 1732358386537
        }
      }
    ]
  }
}
// 消息3----a[]
{
  "msg": "changed",
  "collection": "stream-notify-user",
  "id": "id",
  "fields": {
    "eventName": "jAfXDKCQoEydreNpi/subscriptions-changed",
    "args": [
      "updated",
      {
        "_id": "ZRuLyj2HbTcdQXamY",
        "open": true,
        "alert": false,
        "unread": 0,
        "userMentions": 0,
        "groupMentions": 0,
        "ts": {
          "$date": 1732293708012
        },
        "rid": "giT7Qfy76GRfJWF7u",
        "name": "12321123123",
        "fname": "12321123123",
        "t": "p",
        "u": {
          "_id": "jAfXDKCQoEydreNpi",
          "username": "test222",
          "name": "test222"
        },
        "_updatedAt": {
          "$date": 1732358386633
        },
        "ls": {
          "$date": 1732358386633
        }
      }
    ]
  }
}
// 消息4----a[]
{
  "msg": "changed",
  "collection": "stream-notify-user",
  "id": "id",
  "fields": {
    "eventName": "jAfXDKCQoEydreNpi/rooms-changed",
    "args": [
      "updated",
      {
        "_id": "giT7Qfy76GRfJWF7u",
        "fname": "12321123123",
        "customFields": {},
        "description": "123123",
        "broadcast": false,
        "encrypted": false,
        "name": "12321123123",
        "t": "p",
        "usersCount": 4,
        "u": {
          "_id": "xFWck5bgzRWRs9Pri",
          "username": "jindun"
        },
        "ts": {
          "$date": 1731513413917
        },
        "ro": false,
        "default": false,
        "sysMes": true,
        "_updatedAt": {
          "$date": 1732358386636
        },
        "lastMessage": {
          "_id": "5irE67FQL2T5bsKJr",
          "rid": "giT7Qfy76GRfJWF7u",
          "msg": "343532535",
          "ts": {
            "$date": 1732358386454
          },
          "u": {
            "_id": "jAfXDKCQoEydreNpi",
            "username": "test222",
            "name": "test222"
          },
          "urls": [],
          "mentions": [],
          "channels": [],
          "md": [
            {
              "type": "PARAGRAPH",
              "value": [
                {
                  "type": "PLAIN_TEXT",
                  "value": "343532535"
                }
              ]
            }
          ],
          "_updatedAt": {
            "$date": 1732358386537
          }
        },
        "lm": {
          "$date": 1732358386454
        }
      }
    ]
  }
}
// 消息5----[]
{
  "msg": "method",
  "id": "26",
  "method": "stream-notify-room",
  "params": [
    "giT7Qfy76GRfJWF7u/user-activity",
    "test222",
    [],
    {}
  ]
}
// 消息6----a[]
{
  "msg": "result",
  "id": "26"
}
// 消息7----a[]
{
  "msg": "updated",
  "methods": [
    "26"
  ]
}
// 消息8----a[]
{
    "msg": "changed",
    "collection": "stream-notify-room",
    "id": "id",
    "fields": {
        "eventName": "giT7Qfy76GRfJWF7u/user-activity",
        "args": [
            "test222",
            [],
            {}
        ]
    }
}
```

**消息1：`subscriptions-changed` (1):** 这条消息更新了客户端 A 的订阅信息。 其中 `ls` (last seen) 字段更新为消息发送的时间戳，表示客户端 A 已经“看到”了这条新消息，因此未读消息数 `unread` 仍然为 0。

**消息2：`room-messages`:** 这条消息将客户端 A 刚刚发送的消息添加到 `stream-room-messages` 集合中。 这是客户端 A 自己发送的消息，因此它也需要在本地显示出来。

**消息3：`subscriptions-changed` (2):** 这条消息和第一条类似，也是更新订阅信息，`ls` 字段再次更新，时间戳略有变化，这可能是由于处理消息的微小时间差导致的。

> 经过测试，后端可以不用发送消息 1。

**消息4：`rooms-changed`:** 这条消息更新了聊天室的信息，最重要的是更新了 `lastMessage` 字段，将客户端 A 刚刚发送的消息设置为最后一条消息。 这会更新聊天室列表的预览。

**消息5：`stream-notify-room` (method call):** 这是一个 DDP 方法调用，而不是数据更新通知。客户端 A 调用 `stream-notify-room` 方法，参数包括房间 ID (`giT7Qfy76GRfJWF7u`)、事件名称 (`user-activity`)、用户名 (`test222`) 以及一些额外的参数（空数组和空对象）。 这条消息会发送到服务器，服务器再将其广播给房间内的其他客户端，通知它们客户端 A 的用户活动。

**消息6：`result`:** 这是对之前方法调用的响应。 `id` 为 26，与方法调用消息的 `id` 对应。 表示方法调用成功完成。

**消息7：`updated`:** 这条消息确认方法调用已经更新完成。 `methods` 数组包含已更新的方法 ID，这里也是 26。

**消息8：`stream-notify-room` (changed):** 这条消息更新了 `stream-notify-room` 集合。 虽然和之前的 `stream-notify-room` 方法调用看起来很像，但这实际上是服务器广播给客户端 A 的 _响应_。 因为客户端 A 也订阅了 `stream-notify-room` 集合的更新，所以它也会收到这条消息，用于更新自身的 UI 状态 (例如停止显示自己的打字指示器)。

### 接受消息

A和B和C分别连接了Rocketchat的服务器，三个客户端目前位于同一个聊天室。 A客户端发消息，B和C每个客户端都会接收到5个长连接消息，如下所示：&#x20;

```javascript
// 消息1----a[]
{
    "msg": "changed",
    "collection": "stream-notify-room",
    "id": "id",
    "fields": {
        "eventName": "giT7Qfy76GRfJWF7u/user-activity",
        "args": [
            "test111",
            [],
            {}
        ]
    }
}
// 消息2----a[]
{
    "msg": "changed",
    "collection": "stream-notify-room",
    "id": "id",
    "fields": {
        "eventName": "giT7Qfy76GRfJWF7u/user-activity",
        "args": [
            "test111",
            [],
            {}
        ]
    }
}
// 消息3----a[]
{
    "msg": "changed",
    "collection": "stream-room-messages",
    "id": "id",
    "fields": {
        "eventName": "giT7Qfy76GRfJWF7u",
        "args": [
            {
                "_id": "DEGweYCRwrejsSkaM",
                "rid": "giT7Qfy76GRfJWF7u",
                "msg": "232131",
                "ts": {
                    "$date": 1732355626279
                },
                "u": {
                    "_id": "DX3AynTpW68px8Mtz",
                    "username": "test111",
                    "name": "test111"
                },
                "urls": [],
                "mentions": [],
                "channels": [],
                "md": [
                    {
                        "type": "PARAGRAPH",
                        "value": [
                            {
                                "type": "PLAIN_TEXT",
                                "value": "232131"
                            }
                        ]
                    }
                ],
                "_updatedAt": {
                    "$date": 1732355627591
                }
            }
        ]
    }
}
// 消息4----a[]
{
    "msg": "changed",
    "collection": "stream-notify-user",
    "id": "id",
    "fields": {
        "eventName": "xFWck5bgzRWRs9Pri/rooms-changed",
        "args": [
            "updated",
            {
                "_id": "giT7Qfy76GRfJWF7u",
                "fname": "12321123123",
                "customFields": {},
                "description": "123123",
                "broadcast": false,
                "encrypted": false,
                "name": "12321123123",
                "t": "p",
                "usersCount": 4,
                "u": {
                    "_id": "xFWck5bgzRWRs9Pri",
                    "username": "jindun"
                },
                "ts": {
                    "$date": 1731513413917
                },
                "ro": false,
                "default": false,
                "sysMes": true,
                "_updatedAt": {
                    "$date": 1732355627956
                },
                "lastMessage": {
                    "_id": "DEGweYCRwrejsSkaM",
                    "rid": "giT7Qfy76GRfJWF7u",
                    "msg": "232131",
                    "ts": {
                        "$date": 1732355626279
                    },
                    "u": {
                        "_id": "DX3AynTpW68px8Mtz",
                        "username": "test111",
                        "name": "test111"
                    },
                    "urls": [],
                    "mentions": [],
                    "channels": [],
                    "md": [
                        {
                            "type": "PARAGRAPH",
                            "value": [
                                {
                                    "type": "PLAIN_TEXT",
                                    "value": "232131"
                                }
                            ]
                        }
                    ],
                    "_updatedAt": {
                        "$date": 1732355627591
                    }
                },
                "lm": {
                    "$date": 1732355626279
                }
            }
        ]
    }
}
// 消息5----a[]
{
    "msg": "changed",
    "collection": "stream-notify-user",
    "id": "id",
    "fields": {
        "eventName": "xFWck5bgzRWRs9Pri/subscriptions-changed",
        "args": [
            "updated",
            {
                "_id": "otckiNwfSX2y9uRZQ",
                "open": true,
                "alert": true,
                "unread": 0,
                "userMentions": 0,
                "groupMentions": 0,
                "ts": {
                    "$date": 1731513413917
                },
                "rid": "giT7Qfy76GRfJWF7u",
                "name": "12321123123",
                "fname": "12321123123",
                "t": "p",
                "u": {
                    "_id": "xFWck5bgzRWRs9Pri",
                    "username": "jindun"
                },
                "ls": {
                    "$date": 1732355456689
                },
                "_updatedAt": {
                    "$date": 1732355628628
                },
                "roles": [
                    "owner"
                ]
            }
        ]
    }
}
```

* **消息1和消息2：**&#x8FD9;两条相同的消息更新了 `stream-notify-room` 集合。它们表示房间内的用户活动，特别是打字指示器。`giT7Qfy76GRfJWF7u` 是房间 ID，`user-activity` 是事件名称，`test111` 是用户名，空数组和空对象可能代表额外的活动数据（例如，没有其他并发活动）。重复的消息可能是 bug 或冗余发送。
* **消息3：**&#x8FD9;条消息更新了 `stream-room-messages` 集合，其中包含房间的实际聊天消息。`args` 包含消息对象本身，包括其 ID、房间 ID (`rid`)、内容 (`msg`)、时间戳 (`ts`)、发送者信息 (`u`) 和其他元数据。这是核心消息传递机制。
* **消息4：**&#x8FD9;条消息更新了用户 `xFWck5bgzRWRs9Pri`（可能是客户端 B 或 C）的 `stream-notify-user` 集合。它表示房间信息的变化，由新消息触发。这里的关键信息是房间对象中更新的 `lastMessage` 字段。这允许客户端使用最新的消息片段更新其房间列表预览，而无需获取整个消息历史记录。
* **消息5：**&#x8FD9;条消息也更新了 `stream-notify-user` 集合，特别是用户对房间的订阅数据。这里关键的变化可能是 `unread` 计数，它可能会更新以反映用户已看到新消息（如果用户当前未关注该房间，则可能会增加）。订阅对象中的其他字段，例如 `ls`（上次查看），也可能会更新。

## 总结

* watcher：watcher使用mongodb提供的stream监听数据库的变化，然后将变化的数据通过broadcast函数将事件广播给所有的service。
* listener：监听watcher广播的事件。根据监听到的data通过回调函数调用对应notification
* notification：处理消息，调用对应的streamer。
* streamer：通过检索，查看消息归属哪个订阅，通过订阅数据结构中的connection将消息发送给客户。

`ListenersModule` 监听到的事件会交给 `NotificationsModule` 发送通知，而 `NotificationsModule` 在发送通知的过程中会依赖于 `Streamer`。

`NotificationsModule` 中定义了多个 `Streamer` 实例，每个实例负责一种特定类型的通知流。当 `NotificationsModule` 需要发送通知时，它会使用相应的 `Streamer` 实例来广播通知数据。例如，当需要发送用户状态更新的通知时，`NotificationsModule` 可能会使用名为 `streamUser` 的 `Streamer` 实例来发送这个通知。

`Streamer` 实例负责将通知数据发送给所有订阅相应事件的客户端，从而实现实时通信。所以，`NotificationsModule` 在发送通知时确实依赖于 `Streamer` 来完成数据的广播和传输。

<figure><img src="../.gitbook/assets/image (41).png" alt=""><figcaption></figcaption></figure>

