# 🐶 调试过程中的一些note

问题：如果我有n个client向这个server发送消息，一个主事件循环能够搞定吗？libuv仅靠一个主事件循环完成高并发吗？

答案：当有n个客户端向服务器发送消息时，服务器不会为每个连接创建一个新的线程或进程。相反，当数据到达时，它会在主事件循环中触发一个回调函数。这个回调函数会处理数据，并可能将响应写回客户端。因为所有的I/O操作都是非阻塞的，所以即使在处理一个连接的数据时有其他连接的数据到达，主事件循环也能立即切换到那个连接。

***

**这个内容比较重要，稍后需要串起来**

&#x20;![](<../.gitbook/assets/image (1) (1).png>)

当I/O事件发生时，libuv会将io\_watcher结构添加到watcher\_queue中。然后，libuv会定期调用uv\_\_io\_poll函数来检查watcher\_queue中是否有待处理的I/O事件。如果有，libuv会调用io\_watcher结构中的cb回调函数来处理I/O事件。

watcher\_queue的数据结构的作用是将待处理的I/O事件组织成一个队列，以便libuv可以高效地处理它们。

***

**下面的内容重要，稍后需要串起来**

uv\_\_io\_init中会使io\_watcher的cb指向uv\_\_stream\_io。

**Purpose of `uv__stream_io`:**

The primary role of `uv__stream_io` is to act as the central event handler for I/O operations on streams (TCP sockets, named pipes, TTYs) within libuv. When libuv detects that an I/O event (e.g., data available to read, ready to write) has occurred on the file descriptor associated with the stream, it invokes this callback.

**Specific Actions Within `uv__stream_io`:**

1. **Handle Connection Events:** If a connection request is pending (`stream->connect_req`), it initiates the connection process (`uv__stream_connect`).
2. **Handle Read Events:** If a read event occurs (data available or errors), it calls `uv__read` to process the incoming data.
3. **Handle Partial Reads and EOF:** Checks if a partial read occurred along with a POLLHUP event. If so, and the user is interested in read events, it reports an end-of-file (EOF) condition by calling `uv__stream_eof`.
4. **Handle Write Events:** If a write event occurs (ready to write data or errors), it calls `uv__write` to send outgoing data and then processes write callbacks using `uv__write_callbacks`.
5. **Drain Write Queue:** If the write queue is empty after writing, it calls `uv__drain` to notify the user that all pending writes are complete.

**Why Set It as the Callback:**

* **Centralized Handling:** By setting `uv__stream_io` as the callback, all I/O events for the stream are funneled through this single function. This promotes maintainable and organized code.
* **Event Dispatching:** Inside `uv__stream_io`, specific actions are taken based on the type of event (read, write, error) and the state of the stream (connecting, open, etc.). This allows for efficient and context-aware event handling.
* **Abstraction:** `uv__stream_io` abstracts away the low-level details of I/O operations from the user. The user doesn't need to worry about directly interacting with file descriptors or polling for events.

**Key Points:**

* **Event-Driven:** Libuv is an event-driven library. Setting callbacks like `uv__stream_io` is core to how it operates.
* **Stream Lifecycle:** This callback function handles various stages of a stream's lifecycle, from connection establishment to reading/writing data and eventual closure.
* **Efficiency:** This design allows libuv to manage I/O events efficiently, minimizing the overhead of polling and ensuring prompt response to events.

***

在 libuv 中，将 `&stream->io_watcher` 中的 `fd` 初始化为 -1 主要有以下几个原因：

1. **Invalid File Descriptor:**
   * 在 Unix 系统中，文件描述符（fd）是用于标识打开的文件、套接字、管道等的非负整数。
   * 将 `fd` 初始化为 -1 表示该 `io_watcher` 当前未与任何有效的文件描述符关联。
   * 这样做可以明确表明该 `io_watcher` 尚未开始监视任何 I/O 操作。
2. **Initialization and Error Handling:**
   * 初始化为 -1 可以作为一种默认状态或初始值，方便后续的逻辑判断。
   * 在某些情况下，如果无法成功获取或分配有效的文件描述符，也可以将 `fd` 设置为 -1，表示出现错误或异常情况。
3. **Delayed Association:**
   * 在某些情况下，文件描述符的获取或分配可能会延迟到 `uv__io_init` 之后。
   * 例如，在创建 TCP 连接时，套接字的文件描述符可能要等到连接建立成功后才能确定。
   * 因此，先将 `fd` 初始化为 -1，然后在适当的时机（例如，连接建立成功后）再将其更新为有效值。
4. **Code Readability and Maintainability:**
   * 通过将 `fd` 初始化为 -1，可以更清晰地表达该 `io_watcher` 的初始状态，提高代码的可读性和可维护性。
   * 避免了在后续代码中对未初始化的 `fd` 值进行不必要的检查或处理。

***

**Handle (句柄)**

* **长期存在**：Handle 就像是应用程序与操作系统之间的桥梁，代表了一个长期存在的资源。比如，一个 TCP server handle 代表了一个 TCP 服务器，它会一直存在，直到你关闭它。
* **关联回调函数**：每个 handle 都可以关联一个或多个回调函数。当对应的 I/O 事件发生时（比如新的客户端连接、数据到达），libuv 就会调用这些回调函数来通知你的应用程序。
* **类型多样**：libuv 提供了多种类型的 handle，每种类型对应不同的 I/O 资源，例如：
  * `uv_tcp_t`：TCP socket 句柄
  * `uv_timer_t`：定时器句柄
  * `uv_fs_t`：文件系统操作句柄

**Request (请求)**

* **短期操作**：Request 代表了一个具体的 I/O 操作，通常是短期的。比如，一个 write request 代表了一次写操作，当写操作完成后，这个 request 也就结束了。
* **依赖 Handle**：大部分 request 都是基于 handle 的，比如，你要在 TCP socket 上发送数据，就需要创建一个 write request，并指定对应的 TCP server handle。
* **独立 Request**：但也有一些 request 是独立的，不依赖于 handle，比如 `uv_getaddrinfo_t` 用于域名解析。

**总结**

* **Handle** 就像是打开的文件、监听的端口，它们长期存在，等待事件发生。
* **Request** 就像是读取文件、发送数据，它们是具体的 I/O 操作，完成后就消失。
