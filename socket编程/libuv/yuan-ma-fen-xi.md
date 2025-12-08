# 🐶 源码分析

## 测试代码

### tcp.c

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

### client.c

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

## epoll\_wait是怎样将新建的主动socket加入到监听队列中的？

1.  **启动监听 (`uv_listen`)** 当你的 `main` 函数调用 `uv_listen` 时，libuv 内部会：

    1. 调用 `uv__io_start`。
    2. `uv__io_start` 会将**监听 socket**（ `server_fd`）和 `POLLIN` 事件通过 `epoll_ctl(EPOLL_CTL_ADD, ...)` 添加到 `backend_fd`（epoll 实例）中。

    对于监听 socket 而言，`POLLIN` 事件的含义是“**有一个新的连接已经完成三次握手，可以被 `accept` 了**”。
2. **等待事件 (`uv_run` -> `uv__io_poll` -> `epoll_wait`)**
   1. 事件循环进入 `uv__io_poll` 函数，调用 `while (!QUEUE_EMPTY(&loop->watcher_queue))` 遍历 watcher\_queue，处理所有由 uv\_\_io\_start 提交的 watcher。最终调用 `epoll_wait(loop->backend_fd, ...)`。
   2. 然后，主线程**阻塞**在 `epoll_wait`，休眠并等待内核通知，不消耗 CPU。
3. **新连接到达，`epoll_wait` 返回**
   1. 当一个客户端连接成功，内核认为 `server_fd` 变为“可读”，于是唤醒 `epoll_wait`。
   2. `epoll_wait` 返回，并告诉 libuv：“`server_fd` 上有 `POLLIN` 事件（之前已经通过 `uv_listen` 监听了 `POLLIN` 事件）！”
4. **执行 `on_new_connection` 回调**
   1. libuv 发现是 `server_fd` 的事件，于是调用注册的回调 `on_new_connection`。
5. **接受连接并添加新 Socket (`uv_accept` -> `uv_read_start`)**
   1. 在 `on_new_connection` 中，调用 `uv_accept`，它从内核中接受这个新连接，得到一个新的**连接 socket**（我们称之为 `client_fd`）。
   2. 紧接着，调用 `uv_read_start((uv_stream_t*) client, ...)`，这才是将新 socket 加入监控的关键一步！
   3. `uv_read_start` 内部会再次调用 `uv__io_start`，但这一次，它传递的是**新的 `client_fd`** 和 `POLLIN` 事件。
   4. `uv__io_start` 再次通过 `epoll_ctl(EPOLL_CTL_ADD, ...)` 将这个**新的 `client_fd`** 添加到同一个 `backend_fd`（epoll 实例）中进行监控。

## `uv__io_poll` 什么时候执行？

`uv__io_poll` 是在 `uv_run` 函数的 `while` 循环中被调用的。它是事件循环的一个关键阶段，专门负责等待 I/O 事件。

`uv__io_poll` 在事件循环的每一次迭代中，在处理完定时器、`idle`、`prepare` 等回调之后，就会被执行。它的主要职责就是调用操作系统的 I/O 多路复用机制（如 `epoll_wait`）来等待网络或文件描述符（fd）上的事件。

## `uv__io_poll` 怎么能遍历到 `uv__io_start` 注册的事件？

**1. `uv__io_start` 的工作：登记和排队**

调用一个启动 I/O 监听的函数时（比如 `uv_tcp_listen` 或 `uv_read_start`），它最终会调用 `uv__io_start`。

`uv__io_start` **并不直接**调用 `epoll_ctl` 去和内核交互。它只是做了一个“登记”工作：

* 更新 `uv__io_t` watcher 结构体中的 `pevents`（pending events）字段，标记它对哪些事件感兴趣。
* 将这个 watcher 放入 `loop->watcher_queue` 这个**待处理队列**中。

**2. `uv__io_poll` 的工作：批量处理和等待**

稍后，当事件循环运行到 `uv__io_poll` 阶段时，它会做两件大事：

**第一件事：处理 `watcher_queue` 队列**

在调用 `epoll_wait` 之前，`uv__io_poll` 会先遍历 `loop->watcher_queue`，把所有待处理的 watcher 都处理掉。`uv__io_start` 提交的“更新请求”在此时被**批量处理。**

**第二件事：等待事件**

处理完队列后，`uv__io_poll` 才调用 `epoll_wait` 进入阻塞等待状态。

当 `epoll_wait` 返回时，它会带回一系列发生了事件的 fd。`uv__io_poll` 就会根据这些 fd，从 `loop->watchers` 数组中快速找到对应的 `uv__io_t` watcher，并执行其注册的回调函数（比如 `uv__server_io` 或 `echo_read`）。

`uv__io_start` 和 `uv__io_poll` 之间的关系可以概括为**生产者-消费者模型**：

* **生产者 (`uv__io_start`)**: 当需要监听一个新的 I/O 事件时，`uv__io_start` 并不立即去打扰内核，而是把这个“请求”放入一个名为 `watcher_queue` 的队列中。
* **消费者 (`uv__io_poll`)**: 在每次事件循环的 I/O 阶段，`uv__io_poll` 首先会清空 `watcher_queue` 队列，通过 `epoll_ctl` 将所有新的监听请求一次性地、批量地告知内核。然后，它才调用 `epoll_wait` 等待所有已注册事件的发生。

## uv\_run

libuv 的核心功能——**事件循环（Event Loop）**

> `uv_run` 的本质是一个巨大的 `while` 循环。 **`while` 循环本身不是阻塞的，但它内部的一个关键函数调用 `uv__io_poll` 是阻塞的，所以 `while` 不会一直占用 CPU 资源。**
>
> **这个 `while` 在等待什么呢？**[**等待 `epoll_wait` 返回。**](yuan-ma-fen-xi.md#uv_io_poll)
>
> 在循环开始时，libuv 会调用一次 `uv__update_time` 来获取当前时间并缓存起来。这样做是为了在本次循环的后续阶段（比如检查定时器是否到期）中，可以高效地使用这个统一的时间戳，避免多次调用系统函数获取时间。

```c
int uv_run(uv_loop_t* loop, uv_run_mode mode) {
  int timeout;
  int r;
  int ran_pending;

  r = uv__loop_alive(loop);
  if (!r)
    uv__update_time(loop);
  // 检查是否还有“待办事项”
  while (r != 0 && loop->stop_flag == 0) {
    // 更新循环的内部时间
    uv__update_time(loop);
    // 执行到期的定时器
    uv__run_timers(loop);
    // 执行待处理的回调 (I/O 完成后被推入)
    ran_pending = uv__run_pending(loop);
    // 执行 idle 句柄
    uv__run_idle(loop);
    // 执行 prepare 句柄
    uv__run_prepare(loop);

    timeout = 0;
    if ((mode == UV_RUN_ONCE && !ran_pending) || mode == UV_RUN_DEFAULT)
      // 计算 I/O 轮询的超时时间，并进行 I/O 轮询
      timeout = uv_backend_timeout(loop);
    // 执行 I/O
    uv__io_poll(loop, timeout);

    /* Run one final update on the provider_idle_time in case uv__io_poll
     * returned because the timeout expired, but no events were received. This
     * call will be ignored if the provider_entry_time was either never set (if
     * the timeout == 0) or was already updated b/c an event was received.
     */
    uv__metrics_update_idle_time(loop);
    // 执行 check 句柄
    uv__run_check(loop);
    // 执行关闭句柄的回调
    uv__run_closing_handles(loop);

    if (mode == UV_RUN_ONCE) {
      /* UV_RUN_ONCE implies forward progress: at least one callback must have
       * been invoked when it returns. uv__io_poll() can return without doing
       * I/O (meaning: no callbacks) when its timeout expires - which means we
       * have pending timers that satisfy the forward progress constraint.
       *
       * UV_RUN_NOWAIT makes no guarantees about progress so it's omitted from
       * the check.
       */
      uv__update_time(loop);
      uv__run_timers(loop);
    }

    r = uv__loop_alive(loop);
    if (mode == UV_RUN_ONCE || mode == UV_RUN_NOWAIT)
      break;
  }

  /* The if statement lets gcc compile it to a conditional store. Avoids
   * dirtying a cache line.
   */
  if (loop->stop_flag != 0)
    loop->stop_flag = 0;

  return r;
}
```

## uv\_\_io\_start

```c
void uv__io_start(uv_loop_t* loop, uv__io_t* w, unsigned int events) {
  assert(0 == (events & ~(POLLIN | POLLOUT | UV__POLLRDHUP | UV__POLLPRI)));
  assert(0 != events);
  assert(w->fd >= 0);
  assert(w->fd < INT_MAX);

  w->pevents |= events;
  maybe_resize(loop, w->fd + 1);

#if !defined(__sun)
  /* The event ports backend needs to rearm all file descriptors on each and
   * every tick of the event loop but the other backends allow us to
   * short-circuit here if the event mask is unchanged.
   */
  // 更新 watcher 期望监听的事件
  if (w->events == w->pevents)
    return;
#endif

  if (QUEUE_EMPTY(&w->watcher_queue)) // 如果 watcher 不在队列中，就把它加入到 loop->watcher_queue 的尾部
    QUEUE_INSERT_TAIL(&loop->watcher_queue, &w->watcher_queue);

  // 在 watchers 数组中注册 watcher，方便通过 fd 快速查找
  if (loop->watchers[w->fd] == NULL) {
    loop->watchers[w->fd] = w;
    loop->nfds++;
  }
}

```

## uv\_io\_poll

**`uv__io_poll` 是 libuv 事件循环的核心引擎，它驱动着整个事件循环的运转，实现了异步 I/O 的核心功能。**

> `epoll_wait` （当 libuv 调用它时，程序主线程会**进入休眠状态**，将 CPU 控制权完全交还给操作系统。此时程序**不消耗任何 CPU 资源**）返回条件：
>
> * **I/O 事件就绪**：当有网络数据到达、新的 TCP 连接建立、或者文件可以写入时，操作系统内核会**唤醒**线程，`epoll_wait` 会立即返回，并告诉 libuv 哪些文件描述符（socket）上有事件发生。
> * **超时 (`timeout`)**：在调用 `epoll_wait` 之前，libuv 会通过 `uv_backend_timeout(loop)` 计算一个超时时间。这个时间通常是**下一个即将到期的定时器**所需的时间。如果在这段时间内没有任何 I/O 事件，`epoll_wait` 也会在超时后返回。

```c
void uv__io_poll(uv_loop_t* loop, int timeout) {
  /* A bug in kernels < 2.6.37 makes timeouts larger than ~30 minutes
   * effectively infinite on 32 bits architectures.  To avoid blocking
   * indefinitely, we cap the timeout and poll again if necessary.
   *
   * Note that "30 minutes" is a simplification because it depends on
   * the value of CONFIG_HZ.  The magic constant assumes CONFIG_HZ=1200,
   * that being the largest value I have seen in the wild (and only once.)
   */
  static const int max_safe_timeout = 1789569;
  static int no_epoll_pwait_cached;
  static int no_epoll_wait_cached;
  int no_epoll_pwait;
  int no_epoll_wait;
  struct epoll_event events[1024];
  struct epoll_event* pe;
  struct epoll_event e;
  int real_timeout;
  QUEUE* q;
  uv__io_t* w;
  sigset_t sigset;
  uint64_t sigmask;
  uint64_t base;
  int have_signals;
  int nevents;
  int count;
  int nfds;
  int fd;
  int op;
  int i;
  int user_timeout;
  int reset_timeout;

  if (loop->nfds == 0) {
    assert(QUEUE_EMPTY(&loop->watcher_queue));
    return;
  }

  memset(&e, 0, sizeof(e));

  // 通过这种方式，uv__io_start 提交的“更新请求”在这里被批量处理。libuv 将多次对不同 fd 的监听设置操作，合并到事件循环的一个阶段来完成，减少了系统调用的次数。
  while (!QUEUE_EMPTY(&loop->watcher_queue)) {
    q = QUEUE_HEAD(&loop->watcher_queue);
    QUEUE_REMOVE(q);
    QUEUE_INIT(q);

    w = QUEUE_DATA(q, uv__io_t, watcher_queue);
    assert(w->pevents != 0);
    assert(w->fd >= 0);
    assert(w->fd < (int) loop->nwatchers);

    e.events = w->pevents;  // 获取期望监听的事件
    e.data.fd = w->fd;

    if (w->events == 0)
      op = EPOLL_CTL_ADD;  // 如果是新的，就 ADD
    else
      op = EPOLL_CTL_MOD;  // 如果是已有的，就 MOD

    /* XXX Future optimization: do EPOLL_CTL_MOD lazily if we stop watching
     * events, skip the syscall and squelch the events after epoll_wait().
     */
    // *** 在这里才真正调用 epoll_ctl 与内核交互 ***
    if (epoll_ctl(loop->backend_fd, op, w->fd, &e)) {
      if (errno != EEXIST)
        abort();

      assert(op == EPOLL_CTL_ADD);

      /* We've reactivated a file descriptor that's been watched before. */
      if (epoll_ctl(loop->backend_fd, EPOLL_CTL_MOD, w->fd, &e))
        abort();
    }

    w->events = w->pevents;
  }

  sigmask = 0;
  if (loop->flags & UV_LOOP_BLOCK_SIGPROF) {
    sigemptyset(&sigset);
    sigaddset(&sigset, SIGPROF);
    sigmask |= 1 << (SIGPROF - 1);
  }

  assert(timeout >= -1);
  base = loop->time;
  count = 48; /* Benchmarks suggest this gives the best throughput. */
  real_timeout = timeout;

  if (uv__get_internal_fields(loop)->flags & UV_METRICS_IDLE_TIME) {
    reset_timeout = 1;
    user_timeout = timeout;
    timeout = 0;
  } else {
    reset_timeout = 0;
    user_timeout = 0;
  }

  /* You could argue there is a dependency between these two but
   * ultimately we don't care about their ordering with respect
   * to one another. Worst case, we make a few system calls that
   * could have been avoided because another thread already knows
   * they fail with ENOSYS. Hardly the end of the world.
   */
  no_epoll_pwait = uv__load_relaxed(&no_epoll_pwait_cached);
  no_epoll_wait = uv__load_relaxed(&no_epoll_wait_cached);
  // for 会把执行权转移给系统函数 epoll_pwait
  for (;;) {
    /* Only need to set the provider_entry_time if timeout != 0. The function
     * will return early if the loop isn't configured with UV_METRICS_IDLE_TIME.
     */
    if (timeout != 0)
      uv__metrics_set_provider_entry_time(loop);

    /* See the comment for max_safe_timeout for an explanation of why
     * this is necessary.  Executive summary: kernel bug workaround.
     */
    if (sizeof(int32_t) == sizeof(long) && timeout >= max_safe_timeout)
      timeout = max_safe_timeout;

    if (sigmask != 0 && no_epoll_pwait != 0)
      if (pthread_sigmask(SIG_BLOCK, &sigset, NULL))
        abort();

    if (no_epoll_wait != 0 || (sigmask != 0 && no_epoll_pwait == 0)) {
      // *** 阻塞等待 I/O 事件 ***
      nfds = epoll_pwait(loop->backend_fd,
                         events,
                         ARRAY_SIZE(events),
                         timeout,
                         &sigset);
      if (nfds == -1 && errno == ENOSYS) {
        uv__store_relaxed(&no_epoll_pwait_cached, 1);
        no_epoll_pwait = 1;
      }
    } else {
      // 默认使用水平触发，有数据就会发出通知事件
      nfds = epoll_wait(loop->backend_fd,
                        events,
                        ARRAY_SIZE(events),
                        timeout);
      if (nfds == -1 && errno == ENOSYS) {
        uv__store_relaxed(&no_epoll_wait_cached, 1);
        no_epoll_wait = 1;
      }
    }

    if (sigmask != 0 && no_epoll_pwait != 0)
      if (pthread_sigmask(SIG_UNBLOCK, &sigset, NULL))
        abort();

    /* Update loop->time unconditionally. It's tempting to skip the update when
     * timeout == 0 (i.e. non-blocking poll) but there is no guarantee that the
     * operating system didn't reschedule our process while in the syscall.
     */
    SAVE_ERRNO(uv__update_time(loop));

    if (nfds == 0) {
      assert(timeout != -1);

      if (reset_timeout != 0) {
        timeout = user_timeout;
        reset_timeout = 0;
      }

      if (timeout == -1)
        continue;

      if (timeout == 0)
        return;

      /* We may have been inside the system call for longer than |timeout|
       * milliseconds so we need to update the timestamp to avoid drift.
       */
      goto update_timeout;
    }

    if (nfds == -1) {
      if (errno == ENOSYS) {
        /* epoll_wait() or epoll_pwait() failed, try the other system call. */
        assert(no_epoll_wait == 0 || no_epoll_pwait == 0);
        continue;
      }

      if (errno != EINTR)
        abort();

      if (reset_timeout != 0) {
        timeout = user_timeout;
        reset_timeout = 0;
      }

      if (timeout == -1)
        continue;

      if (timeout == 0)
        return;

      /* Interrupted by a signal. Update timeout and poll again. */
      goto update_timeout;
    }

    have_signals = 0;
    nevents = 0;

    {
      /* Squelch a -Waddress-of-packed-member warning with gcc >= 9. */
      union {
        struct epoll_event* events;
        uv__io_t* watchers;
      } x;

      x.events = events;
      assert(loop->watchers != NULL);
      loop->watchers[loop->nwatchers] = x.watchers;
      loop->watchers[loop->nwatchers + 1] = (void*) (uintptr_t) nfds;
    }
    // *** 处理返回的事件 ***
    for (i = 0; i < nfds; i++) {
      pe = events + i;
      fd = pe->data.fd;

      /* Skip invalidated events, see uv__platform_invalidate_fd */
      if (fd == -1)
        continue;

      assert(fd >= 0);
      assert((unsigned) fd < loop->nwatchers);

      w = loop->watchers[fd];

      if (w == NULL) {
        /* File descriptor that we've stopped watching, disarm it.
         *
         * Ignore all errors because we may be racing with another thread
         * when the file descriptor is closed.
         */
        epoll_ctl(loop->backend_fd, EPOLL_CTL_DEL, fd, pe);
        continue;
      }

      /* Give users only events they're interested in. Prevents spurious
       * callbacks when previous callback invocation in this loop has stopped
       * the current watcher. Also, filters out events that users has not
       * requested us to watch.
       */
      pe->events &= w->pevents | POLLERR | POLLHUP;

      /* Work around an epoll quirk where it sometimes reports just the
       * EPOLLERR or EPOLLHUP event.  In order to force the event loop to
       * move forward, we merge in the read/write events that the watcher
       * is interested in; uv__read() and uv__write() will then deal with
       * the error or hangup in the usual fashion.
       *
       * Note to self: happens when epoll reports EPOLLIN|EPOLLHUP, the user
       * reads the available data, calls uv_read_stop(), then sometime later
       * calls uv_read_start() again.  By then, libuv has forgotten about the
       * hangup and the kernel won't report EPOLLIN again because there's
       * nothing left to read.  If anything, libuv is to blame here.  The
       * current hack is just a quick bandaid; to properly fix it, libuv
       * needs to remember the error/hangup event.  We should get that for
       * free when we switch over to edge-triggered I/O.
       */
      if (pe->events == POLLERR || pe->events == POLLHUP)
        pe->events |=
          w->pevents & (POLLIN | POLLOUT | UV__POLLRDHUP | UV__POLLPRI);

      if (pe->events != 0) {
        /* Run signal watchers last.  This also affects child process watchers
         * because those are implemented in terms of signal watchers.
         */
        if (w == &loop->signal_io_watcher) {
          have_signals = 1;
        } else {
          uv__metrics_update_idle_time(loop);
          // 调用当初注册这个 watcher 时指定的回调函数
          // 对于 tcp.c 服务器的监听 socket，这个 cb 指向的是 uv__server_io (在 uv_listen 内部设置)。uv__server_io 接着会调用你提供的 on_new_connection。
          // 对于一个已连接的 client socket，这个 cb 指向的是 uv__stream_io (在 uv_read_start 内部设置)。uv__stream_io 接着会调用你提供的 echo_read。
          w->cb(loop, w, pe->events); 
        }

        nevents++;
      }
    }

    if (reset_timeout != 0) {
      timeout = user_timeout;
      reset_timeout = 0;
    }

    if (have_signals != 0) {
      uv__metrics_update_idle_time(loop);
      loop->signal_io_watcher.cb(loop, &loop->signal_io_watcher, POLLIN);
    }

    loop->watchers[loop->nwatchers] = NULL;
    loop->watchers[loop->nwatchers + 1] = NULL;

    if (have_signals != 0)
      return;  /* Event loop should cycle now so don't poll again. */

    if (nevents != 0) {
      if (nfds == ARRAY_SIZE(events) && --count != 0) {
        /* Poll for more events but don't block this time. */
        timeout = 0;
        continue;
      }
      return;
    }

    if (timeout == 0)
      return;

    if (timeout == -1)
      continue;

update_timeout:
    assert(timeout > 0);

    real_timeout -= (loop->time - base);
    if (real_timeout <= 0)
      return;

    timeout = real_timeout;
  }
}

```

## uv\_\_io\_t

```cpp
typedef struct uv_loop_s uv_loop_t;
----------------------------------------------
struct uv_loop_s {

 /* User data - use this for whatever. */

 void* data;

 /* Loop reference counting. */

 unsigned int active_handles;

 void* handle_queue[2];

 union {

  void* unused;

  unsigned int count;

 } active_reqs;

 /* Internal storage for future extensions. */

 void* internal_fields;

 /* Internal flag to signal loop stop. */

 unsigned int stop_flag;

 UV_LOOP_PRIVATE_FIELDS

};
----------------------------------------------
#define UV_LOOP_PRIVATE_FIELDS                        \

 unsigned long flags;                            \

 int backend_fd;                               \

 void* pending_queue[2];                           \

 void* watcher_queue[2];                           \

 uv__io_t** watchers;                            \

 unsigned int nwatchers;                           \

 unsigned int nfds;                             \

 void* wq[2];                                \

 uv_mutex_t wq_mutex;                            \

 uv_async_t wq_async;                            \

 uv_rwlock_t cloexec_lock;                          \

 uv_handle_t* closing_handles;                        \

 void* process_handles[2];                          \

 void* prepare_handles[2];                          \

 void* check_handles[2];                           \

 void* idle_handles[2];                           \

 void* async_handles[2];                           \

 void (*async_unused)(void); /* TODO(bnoordhuis) Remove in libuv v2. */   \

 uv__io_t async_io_watcher;                         \

 int async_wfd;                               \

 struct {                                  \

  void* min;                                \

  unsigned int nelts;                            \

 } timer_heap;                                \

 uint64_t timer_counter;                           \

 uint64_t time;                               \

 int signal_pipefd[2];                            \

 uv__io_t signal_io_watcher;                         \

 uv_signal_t child_watcher;                         \

 int emfile_fd;                               \

 UV_PLATFORM_LOOP_FIELDS   
----------------------------------------------
 #define UV_PLATFORM_LOOP_FIELDS 
                                               \
  uv__io_t inotify_read_watcher; 
                                               \
  void* inotify_watchers;       
                                                \
  int inotify_fd; 
```

`uv__io_poll` 负责管理 I/O 观察者（uv\_\_io\_t），这些观察者用于监听特定文件描述符上的 I/O 事件。
