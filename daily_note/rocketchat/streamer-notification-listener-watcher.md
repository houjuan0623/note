---
icon: circle-exclamation
---

# Streamer、Notification、Listener、watcher

### 源码位置

* [Streamer](https://github.com/RocketChat/Rocket.Chat/blob/4.0.0/server/modules/streamer/streamer.module.ts)源码
* [Notification](https://github.com/RocketChat/Rocket.Chat/blob/4.0.0/server/modules/notifications/notifications.module.ts)源码
* [Listener](https://github.com/RocketChat/Rocket.Chat/blob/4.0.0/server/modules/listeners/listeners.module.ts)源码
* [watcher](https://github.com/RocketChat/Rocket.Chat/blob/4.0.0/server/modules/watchers/watchers.module.ts)源码

## 数据结构概览

<figure><img src="../.gitbook/assets/image.png" alt=""><figcaption></figcaption></figure>

Streamer做了什么？Notification做了什么？Listener做了什么？总览

`ListenersModule` 监听到的事件会交给 `NotificationsModule` 发送通知，而 `NotificationsModule` 在发送通知的过程中会依赖于 `Streamer`。

`NotificationsModule` 中定义了多个 `Streamer` 实例，每个实例负责一种特定类型的通知流。当 `NotificationsModule` 需要发送通知时，它会使用相应的 `Streamer` 实例来广播通知数据。例如，当需要发送用户状态更新的通知时，`NotificationsModule` 可能会使用名为 `streamUser` 的 `Streamer` 实例来发送这个通知。

`Streamer` 实例负责将通知数据发送给所有订阅了相应事件流的客户端，从而实现实时通信。所以，`NotificationsModule` 在发送通知时确实依赖于 `Streamer` 来完成数据的广播和传输。

## StreamCentral

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

什么情况下需要使用emit(emitWithBroadcast)？什么情况下使用emitWithoutBroadcast？

**`emit(eventName: string | symbol, ...args: any[]): boolean`**

* 触发事件并在 **本地** 和 **所有连接的客户端** 上广播。
* 当你需要将事件通知发送给所有订阅了此 Streamer 的客户端时使用。
* 例如，当一个新消息被创建时，你可以使用 `emit` 方法将新消息的详细信息广播给所有聊天室的参与者。

**`emitWithoutBroadcast(eventName: string, ...args: any[]): void`**

* 仅在 **本地** 触发事件，**不会广播** 给客户端。
* 当你需要在服务器端触发事件，但不需要通知客户端时使用。
* 例如，当 Streamer 接收到来自另一个服务器的广播消息时，可以使用 `emitWithoutBroadcast` 方法在本地处理该消息，而无需将其再次广播给客户端。

比如我启动了n个ddp-streamer服务，这个时候不同的ddp-streamer会维护不同的用户长连接，比如提醒已登录的用户某个用户登录上来了，就需要使用emit，将事件broadcast给各个ddp-streamer，各个ddp-streamer接收到以后在内部处理相应的逻辑。
