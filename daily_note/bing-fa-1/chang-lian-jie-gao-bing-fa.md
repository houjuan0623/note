---
icon: water
---

# 长连接高并发

## tcp.c

本示例代码主要是为了说明问题，参考[链接](https://app.gitbook.com/s/auhFbVac5R43tFRixEko/libuv/yuan-ma-fen-xi#tcp.c)。

```c
#include <uv.h>
#include <stdio.h>
#include <stdlib.h>

void alloc_buffer(uv_handle_t *handle, size_t suggested_size, uv_buf_t *buf) {
    buf->base = (char*) malloc(suggested_size);
    buf->len = suggested_size;
}

void echo_write(uv_write_t *req, int status) {
    if (status < 0) {
        fprintf(stderr, "Write error: %s\n", uv_strerror(status));
    }
    free(req);
}

void echo_read(uv_stream_t *client, ssize_t nread, const uv_buf_t *buf) {
    if (nread < 0) {
        if (nread != UV_EOF)
            fprintf(stderr, "Read error: %s\n", uv_err_name(nread));
        uv_close((uv_handle_t*) client, NULL);
    } else if (nread > 0) {
        uv_write_t *req = (uv_write_t*) malloc(sizeof(uv_write_t));
        uv_buf_t wrbuf = uv_buf_init(buf->base, nread);
        uv_write(req, client, &wrbuf, 1, echo_write);
    }

    if (buf->base)
        free(buf->base);
}

void on_new_connection(uv_stream_t *server, int status) {
    if (status < 0) {
        fprintf(stderr, "New connection error: %s\n", uv_strerror(status));
        return;
    }

    uv_tcp_t *client = (uv_tcp_t*) malloc(sizeof(uv_tcp_t));
    uv_tcp_init(uv_default_loop(), client);

    if (uv_accept(server, (uv_stream_t*) client) == 0) {
        uv_read_start((uv_stream_t*) client, alloc_buffer, echo_read);
    } else {
        uv_close((uv_handle_t*) client, NULL);
    }
}

int main() {
    uv_tcp_t server;
    uv_tcp_init(uv_default_loop(), &server);

    struct sockaddr_in addr;
    uv_ip4_addr("0.0.0.0", 7000, &addr);

    uv_tcp_bind(&server, (const struct sockaddr*)&addr, 0);
    int r = uv_listen((uv_stream_t*) &server, 128, on_new_connection);
    if (r) {
        fprintf(stderr, "Listen error: %s\n", uv_strerror(r));
        return 1;
    }
    return uv_run(uv_default_loop(), UV_RUN_DEFAULT);
}

```

## client.c

本示例代码主要是为了说明问题，参考[链接](https://app.gitbook.com/s/auhFbVac5R43tFRixEko/libuv/yuan-ma-fen-xi#client.c)。

```c
#include <uv.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MESSAGE_INTERVAL 1000 // milliseconds

uv_tcp_t client_socket;
uv_connect_t connect_req;
int message_count = 100;
uv_timer_t timer_req;

void on_connect(uv_connect_t *req, int status) {
    if (status < 0) {
        fprintf(stderr, "连接失败: %s\n", uv_strerror(status));
        uv_timer_stop(&timer_req);
        free(timer_req.data);
        exit(1); 
    } else {
        fprintf(stdout, "连接成功.\n");
        fflush(stdout);  
    }

    char message[50];
    sprintf(message, "hello %d", message_count++);
    fprintf(stdout, "发送消息: %s\n", message);  // 输出要发送的消息
    fflush(stdout);  

    uv_buf_t buf = uv_buf_init(message, strlen(message));
    uv_write_t write_req;
    uv_write(&write_req, (uv_stream_t*) &client_socket, &buf, 1, NULL); // Ignore write completion
}

void on_write(uv_write_t *req, int status) {} // We don't need to handle write completion specifically

void send_message(uv_timer_t *timer) {
    uv_tcp_connect(&connect_req, &client_socket, timer->data, on_connect);
}

int main() {
    uv_loop_t *loop = uv_default_loop();

    uv_tcp_init(loop, &client_socket);
    uv_timer_init(loop, &timer_req);

    struct sockaddr_in dest;
    uv_ip4_addr("127.0.0.1", 7000, &dest);  // Server address
    struct sockaddr_in *dest_ptr = malloc(sizeof(struct sockaddr_in));
    memcpy(dest_ptr, &dest, sizeof(struct sockaddr_in));

    timer_req.data = dest_ptr;  // Store address for use in the timer callback

    uv_timer_start(&timer_req, send_message, MESSAGE_INTERVAL, MESSAGE_INTERVAL);

    return uv_run(loop, UV_RUN_DEFAULT);
}

```

## **长连接的高并发是怎样实现的？**

**官方语言：libuv 的单线程事件循环 + 非阻塞 I/O 模型**。

### 事件循环启动

```c
// main() in tcp.c
return uv_run(uv_default_loop(), UV_RUN_DEFAULT);
```

程序主线程执行到这里，就进入了 libuv 的事件循环。它会一直“卡”在这里，但它不是无意义的空转或阻塞。它是在**等待事件**的发生。这是唯一的“服务员”线程。

### 注册“新连接”事件

```c
// main() in tcp.c
uv_listen((uv_stream_t*) &server, 128, on_new_connection);
```

这行代码不是一个阻塞的调用。它做的事情是告诉操作系统内核：“请帮我监听 7000 端口。当有**新的 TCP 连接请求**进来时，请通知我。通知我之后，请调用 `on_new_connection` 这个函数。”

然后，主线程就继续在 `uv_run` 里等待，不消耗 CPU。

### 处理并发连接

现在，假设多个 `client.c` 实例同时发起了连接。

1. **内核通知**: 操作系统内核发现有多个连接请求，于是通知 libuv 的事件循环。
2. **回调执行**: 事件循环被唤醒，它会为**每一个**新的连接请求，调用一次 `on_new_connection` 回调。
3. **隔离连接状态**: 这就是 `malloc` 的关键所在！

```c
// on_new_connection() in tcp.c
uv_tcp_t *client = (uv_tcp_t*) malloc(sizeof(uv_tcp_t));
uv_tcp_init(uv_default_loop(), client);
```

* **`malloc`**: 为每一个到来的连接，都动态分配了一块**全新的、独立的内存**来存放它的句柄 (`uv_tcp_t`)。这块内存就代表了这个客户端连接的**所有状态**。
* **`uv_tcp_init`**: 初始化这个新的句柄。

如果同时来了 100 个连接，`on_new_connection` 就会被调用 100 次，也就会 `malloc` 100 个独立的 `client` 句柄。libuv 通过这些不同地址的句柄来区分和管理每一个连接。

4. **注册“读”事件**:

```c
// on_new_connection() in tcp.c
if (uv_accept(server, (uv_stream_t*) client) == 0) {
    uv_read_start((uv_stream_t*) client, alloc_buffer, echo_read);
}
```

* `uv_accept` 接受连接，并将其与我们刚刚创建的 `client` 句柄关联起来。
* `uv_read_start` 又是另一个非阻塞的注册。它告诉内核：“现在请帮我监听**这个特定的 `client` 连接**。当它上面有数据可读时，请通知我，并调用 `echo_read` 函数。”

### 处理并发数据读写

现在，有 100 个客户端都处于连接状态（长连接），并且我们的主线程（服务员）又回到了 `uv_run` 中等待。

假设第 5 个客户端和第 88 个客户端同时发来了数据。

1. **内核再次通知**: 内核通知 libuv：“句柄 A (第5个客户端) 和句柄 B (第88个客户端) 有数据了！”
2. **回调执行**: 事件循环被唤醒，它会：
   * 为句柄 A 调用 `echo_read`。
   * 为句柄 B 调用 `echo_read`。
3. **`echo_read` 内部**:
   * `echo_read` 函数通过它的第一个参数 `uv_stream_t *client`，准确地知道是哪个客户端发来的数据。
   * 它读取数据，然后调用 `uv_write` 将数据写回。`uv_write` **同样是非阻塞的**。它只是把数据交给内核的发送缓冲区，然后立即返回，并注册一个 `echo_write` 回调，以便在发送完成后进行清理（比如 `free(req)`）。

## 为什么能高并发？

* **单一线程，没有阻塞**: 整个过程只有一个主线程在工作。它从不因为等待网络 I/O（等待连接、等待数据）而被阻塞。它只做一件事：响应事件，执行回调。
* **事件驱动**: 所有的工作都是由事件（新连接、数据到达、写入完成）来驱动的。没有事件时，CPU 占用率极低。
* **状态隔离**: 通过为每个连接 `malloc` 独立的句柄 (`uv_tcp_t`) 和请求 (`uv_write_t`)，libuv 能够清晰地管理成千上万个并发连接的状态，而不会混淆。对libuv来讲仅仅是在管理这成千上万个 `uv_tcp_t` 对应的数据结构。
* **委托内核**: libuv 将繁重的、耗时的 I/O 等待工作完全委托给了操作系统内核（通过 `epoll`, `kqueue`, `IOCP` 等高效的 I/O 多路复用机制）。内核能够非常高效地同时监视成千上万个连接的状态。
