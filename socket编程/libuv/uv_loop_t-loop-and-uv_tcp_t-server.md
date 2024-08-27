# 🐶 uv\_loop\_t loop & uv\_tcp\_t server

loop 数据结构是支持libuv事件循环核心。

server 数据结构是libuv定义中的[handle](https://docs.libuv.org/en/v1.x/design.html#handles-and-requests)。

## uv\_loop\_t

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

## uv\_tcp\_t

```cpp
typedef struct uv_tcp_s uv_tcp_t;
----------------------------------------
/*
 * uv_tcp_t is a subclass of uv_stream_t.
 *
 * Represents a TCP stream or TCP server.
 */
struct uv_tcp_s {
  UV_HANDLE_FIELDS
  UV_STREAM_FIELDS
  UV_TCP_PRIVATE_FIELDS
};
----------------------------------------
#define UV_HANDLE_FIELDS                                                      \
  /* public */                                                                \
  void* data;                                                                 \
  /* read-only */                                                             \
  uv_loop_t* loop;                                                            \
  uv_handle_type type;                                                        \
  /* private */                                                               \
  uv_close_cb close_cb;                                                       \
  void* handle_queue[2];                                                      \
  union {                                                                     \
    int fd;                                                                   \
    void* reserved[4];                                                        \
  } u;                                                                        \
  UV_HANDLE_PRIVATE_FIELDS                                                    \
----------------------------------------
#define UV_STREAM_FIELDS                                                      \
  /* number of bytes queued for writing */                                    \
  size_t write_queue_size;                                                    \
  uv_alloc_cb alloc_cb;                                                       \
  uv_read_cb read_cb;                                                         \
  /* private */                                                               \
  UV_STREAM_PRIVATE_FIELDS
----------------------------------------
#define UV_PIPE_PRIVATE_FIELDS                                                \
  const chr* pipe_fname; /* strdup'ed */

```

