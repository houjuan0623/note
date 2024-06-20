# 🐶 uv\_\_io\_poll

**`uv__io_poll` 是 libuv 事件循环的核心引擎，它驱动着整个事件循环的运转，实现了异步 I/O 的核心功能。**



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
```

`uv__io_poll` 负责管理 I/O 观察者（uv\_\_io\_t），这些观察者用于监听特定文件描述符上的 I/O 事件。
