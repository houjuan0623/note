# task\_struct

**本文中先用记读书笔记的形式记录，因为现在关于怎样写本文，我的思路暂未形成。等将来把进程都掌握了，在拐回来整理章节结构。**

## task\_struct 的数据结构

```c
struct task_struct {
/* these are hardcoded - don't touch */
	long state;	/* -1 unrunnable, 0 runnable, >0 stopped */
	long counter;
	long priority;
	long signal;
	struct sigaction sigaction[32];
	long blocked;	/* bitmap of masked signals */
/* various fields */
	int exit_code;
	unsigned long start_code,end_code,end_data,brk,start_stack;
	long pid,pgrp,session,leader;
	int	groups[NGROUPS];
	/* 
	 * pointers to parent process, youngest child, younger sibling,
	 * older sibling, respectively.  (p->father can be replaced with 
	 * p->p_pptr->pid)
	 */
	struct task_struct	*p_pptr, *p_cptr, *p_ysptr, *p_osptr;
	unsigned short uid,euid,suid;
	unsigned short gid,egid,sgid;
	unsigned long timeout,alarm;
	long utime,stime,cutime,cstime,start_time;
	struct rlimit rlim[RLIM_NLIMITS]; 
	unsigned int flags;	/* per process flags, defined below */
	unsigned short used_math;
/* file system info */
	int tty;		/* -1 if no tty, so it must be signed */
	unsigned short umask;
	struct m_inode * pwd;
	struct m_inode * root;
	struct m_inode * executable;
	struct m_inode * library;
	unsigned long close_on_exec;
	struct file * filp[NR_OPEN];
/* ldt for this task 0 - zero 1 - cs 2 - ds&ss */
	struct desc_struct ldt[3];
/* tss for this task */
	struct tss_struct tss;
};
```

每个进程创建的时候都会默认创建一个内核态栈吗？

每个进程在创建的时候都会默认创建一个内核态栈。

**内核态栈的作用：**

内核态栈（Kernel Stack）是操作系统内核为每个进程分配的一块栈空间，用于在进程进入内核态时保存其执行上下文和临时数据。内核态栈的主要作用包括：

* 保存上下文：当进程从用户态切换到内核态时（例如，通过系统调用或硬件中断），需要保存当前执行的上下文（如寄存器值、程序计数器等）。这些上下文信息保存在内核态栈中，以便在返回用户态时恢复。
* 处理内核态任务：进程需要调用内核态的任务（例如系统调用的处理、设备驱动程序的操作等）时会使用内核态栈来存储临时数据和调用函数时的参数等。

**内核态栈的特点：**

* 独立性：每个进程都有自己独立的内核态栈，互不干扰。这确保了在进程切换时，内核态栈中的内容能够正确保存和恢复。
* 固定大小：内核态栈的大小通常是固定的，例如在Linux中常见的大小是8KB（在32位系统上）或16KB（在64位系统上）。固定大小的好处是简化了内核栈的管理，但也意味着栈空间是有限的，内核态代码需要小心避免栈溢出。

**内核态栈的创建：**

* 进程描述符分配：为新进程分配一个进程描述符（例如Linux中的`task_struct`）。
* 内核态栈分配：为新进程分配一个内核态栈，并将其与进程描述符关联。内核态栈的地址通常会存储在进程描述符中。
* 初始化栈：初始化内核态栈，使其包含必要的上下文信息，以便在进程首次进入内核态时能够正确执行。

在 Linux 内核中，`task_struct` 结构体并不直接包含内核态栈（kernel stack）。然而，每个进程确实有自己的内核态栈，通常通过内核的堆栈管理机制分配，并与 `task_struct` 关联。

在现代 Linux 内核中，内核态栈是通过特定的内核机制进行管理的，通常位于 `task_struct` 的附近。在不同的内核版本和架构中，内核态栈的管理方式可能有所不同。下面是关于如何管理和关联内核态栈的一些信息：

* **栈的分配和管理**： 内核态栈通常在进程创建时分配，并且在进程的生命周期内保持分配状态。在早期的内核版本中，内核态栈的大小是固定的，例如 8KB（在 32 位系统上）或 16KB（在 64 位系统上）。
* **关联方式**： 在早期的内核版本中，内核态栈可能直接跟在 `task_struct` 之后，或者在分配 `task_struct` 时一起分配。在现代的 Linux 内核中，内核态栈通常是通过单独分配，并在 `task_struct` 中通过指针进行关联。

