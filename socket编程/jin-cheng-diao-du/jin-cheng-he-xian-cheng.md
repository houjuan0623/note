# 进程和线程

## 进程

程序是可执行文件，进程是程序执行的实例（该实例数据结构由操作系统构建）。

利用分时技术可以在linux操作系统上同时运行多个进程。所以进程在运行过程中需要不同的状态（TODO： 增加链接）应对分时运行。

当时间片用完时，就利用调度（TODO：增加链接）程序切换到另一个进程运行。

内核使用进程标识号(ID)来唯一标识进程，进程由**可执行的指令代码**（程序中的代码），**数据**（程序中的数据）和**堆栈区**（堆栈区是一块特殊的内存数据结构，堆区：只要告知OS这块是堆区，使用`malloc`/`free`的时候会依据既定逻辑，自动分配/释放堆区内存。栈区：只要告知OS这块是栈区，`esp`/`eip`寄存器自动可以找到对应的数据）组成。

### 进程数据结构

在linux操作系统中，进程数据结构如下所示：

```c
struct task_struct {
    long state;                // 任务的运行状态（-1：不可运行，0可运行（就绪），>0 已停止）
    ...
    long signal;               // 信号位图，每个比特位代表一种信号，信号值=位偏移值+1
    ...
    unsigned long start_code;  // 代码段地址
    unsigned long end_code;    // 代码长度（字节数）
    unsigned long end_data;    // 代码长度+数据长度（字节数）
    ...
    task_struct *p_pptr;       // 指向父进程的指针
    ...
    struct file * filp[NR_OPEN];  // 文件结构指针，最多32项。表项号就是文件描述符的值。
}
```

* `long state` 字段含有进程的当前状态号，在某一时刻linux下的一个进程可处于五种状态之一，并且可以在内核调度程序操作下载这几种状态之间进行转换。这五种状态分别是：就绪状态（或称运行状态TASK\_RUNNING），可中断睡眠状态（TASK\_INTERRUPTIBLE），不可中断睡眠状态（TASK\_UNINTERRUPTIBLE），僵死状态（TASK\_ZOMBIE）和停止状态（TASK\_STOPPED）。

### 进程状态

在某一时刻Linux操作系统可处于以下五种状态之一。对应的状态值保存在 `long state` 中。

如果进程正在等待CPU或者进程正在被运行，则称其处于就绪状态或运行状态，此时的state的值是TASK\_RUUNNING。如果进程正在等待某一事件的发生因而处于等待（睡眠）状态，则称其处于可中断的睡眠状态或不可中断的睡眠状态。此时state的值分别是TASK\_INTERRUPTIBLE和TASK\_UNINTERRUPTIBLE。如果一个进程已经被终止执行，但其并未完全释放资源，则称其处于僵死状态（TASK\_ZOMBIE）。如果进程被终止，则称其处于停止状态（TASK\_STOPPED）。

Linux操作系统中定义着进程运行时可能出的状态。如下所示：

```c
#define TASK_RUNNING           0  // 进程正在运行或已准备就绪。
#define TASK_INTERRUTIBLE      1  // 进程处于可中断等待状态。
#define TASK_UNINTERRUPTIBLE   2  // 进程处于不可中断等待状态，主要用于I/O操作等待。
#define TASK_ZOMBIE            3  // 进程处于僵死状态。已经停止运行，但父进程还没有发信号。
#define TASK_STOPPED           4  // 进程已经停止。
```





* 就绪状态：进程正在被CPU执行，或者已经准备就绪随时可由调度程序执行，则称该进程处于运行状态（TASK\_RUNNING）。若此时进程没有被CPU执行，则称其处于就绪状态。

