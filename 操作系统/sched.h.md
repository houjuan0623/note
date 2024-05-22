---
description: include/linux/sched.h
---

# sched.h

本来计划将`.h`文件都跳过，随着阅读发现里面有很多逻辑代码，并非简单的定义，所以在这里随着阅读将所有的 `.h` 文件解析都记录下来。

sched.h 是 Linux 0.12 内核进程调度的核心，它定义了进程调度的基本参数、数据结构、函数和宏，为进程的创建、切换、调度提供了基础设施。

```cpp
#ifndef _SCHED_H
#define _SCHED_H

/* 时钟频率 HZ 表示每秒钟有 100 个时钟中断 */
#define HZ 100

/* 系统最大进程数量 */
/* NR 也许是number的简写 */
#define NR_TASKS	64
#define TASK_SIZE	0x04000000
#define LIBRARY_SIZE	0x00400000

#if (TASK_SIZE & 0x3fffff)
#error "TASK_SIZE must be multiple of 4M"
#endif

#if (LIBRARY_SIZE & 0x3fffff)
#error "LIBRARY_SIZE must be a multiple of 4M"
#endif

#if (LIBRARY_SIZE >= (TASK_SIZE/2))
#error "LIBRARY_SIZE too damn big!"
#endif

#if (((TASK_SIZE>>16)*NR_TASKS) != 0x10000)
#error "TASK_SIZE*NR_TASKS must be 4GB"
#endif

#define LIBRARY_OFFSET (TASK_SIZE - LIBRARY_SIZE)

#define CT_TO_SECS(x)	((x) / HZ)
#define CT_TO_USECS(x)	(((x) % HZ) * 1000000/HZ)

#define FIRST_TASK task[0]
#define LAST_TASK task[NR_TASKS-1]

#include <linux/head.h>
#include <linux/fs.h>
#include <linux/mm.h>
#include <sys/param.h>
#include <sys/time.h>
#include <sys/resource.h>
#include <signal.h>

#if (NR_OPEN > 32)
#error "Currently the close-on-exec-flags and select masks are in one long, max 32 files/proc"
#endif

#define TASK_RUNNING		0
#define TASK_INTERRUPTIBLE	1
#define TASK_UNINTERRUPTIBLE	2
#define TASK_ZOMBIE		3
#define TASK_STOPPED		4

#ifndef NULL
#define NULL ((void *) 0)
#endif

extern int copy_page_tables(unsigned long from, unsigned long to, long size);
extern int free_page_tables(unsigned long from, unsigned long size);

extern void sched_init(void);
extern void schedule(void);
extern void trap_init(void);
extern void panic(const char * str);
extern int tty_write(unsigned minor,char * buf,int count);

typedef int (*fn_ptr)();

struct i387_struct {
	long	cwd;
	long	swd;
	long	twd;
	long	fip;
	long	fcs;
	long	foo;
	long	fos;
	long	st_space[20];	/* 8*10 bytes for each FP-reg = 80 bytes */
};

struct tss_struct {
	long	back_link;	/* 16 high bits zero */
	long	esp0;
	long	ss0;		/* 16 high bits zero */
	long	esp1;
	long	ss1;		/* 16 high bits zero */
	long	esp2;
	long	ss2;		/* 16 high bits zero */
	long	cr3;
	long	eip;
	long	eflags;
	long	eax,ecx,edx,ebx;
	long	esp;
	long	ebp;
	long	esi;
	long	edi;
	long	es;		/* 16 high bits zero */
	long	cs;		/* 16 high bits zero */
	long	ss;		/* 16 high bits zero */
	long	ds;		/* 16 high bits zero */
	long	fs;		/* 16 high bits zero */
	long	gs;		/* 16 high bits zero */
	long	ldt;		/* 16 high bits zero */
	long	trace_bitmap;	/* bits: trace 0, bitmap 16-31 */
	struct i387_struct i387;
};

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

/*
 * Per process flags
 */
#define PF_ALIGNWARN	0x00000001	/* Print alignment warning msgs */
					/* Not implemented yet, only for 486*/

/*
 *  INIT_TASK is used to set up the first task table, touch at
 * your own risk!. Base=0, limit=0x9ffff (=640kB)
 */
#define INIT_TASK \
/* state etc */	{ 0,15,15, \
/* signals */	0,{{},},0, \
/* ec,brk... */	0,0,0,0,0,0, \
/* pid etc.. */	0,0,0,0, \
/* suppl grps*/ {NOGROUP,}, \
/* proc links*/ &init_task.task,0,0,0, \
/* uid etc */	0,0,0,0,0,0, \
/* timeout */	0,0,0,0,0,0,0, \
/* rlimits */   { {0x7fffffff, 0x7fffffff}, {0x7fffffff, 0x7fffffff},  \
		  {0x7fffffff, 0x7fffffff}, {0x7fffffff, 0x7fffffff}, \
		  {0x7fffffff, 0x7fffffff}, {0x7fffffff, 0x7fffffff}}, \
/* flags */	0, \
/* math */	0, \
/* fs info */	-1,0022,NULL,NULL,NULL,NULL,0, \
/* filp */	{NULL,}, \
	{ \
		{0,0}, \
/* ldt */	{0x9f,0xc0fa00}, \
		{0x9f,0xc0f200}, \
	}, \
/*tss*/	{0,PAGE_SIZE+(long)&init_task,0x10,0,0,0,0,(long)&pg_dir,\
	 0,0,0,0,0,0,0,0, \
	 0,0,0x17,0x17,0x17,0x17,0x17,0x17, \
	 _LDT(0),0x80000000, \
		{} \
	}, \
}

extern struct task_struct *task[NR_TASKS];
extern struct task_struct *last_task_used_math;
extern struct task_struct *current;
extern unsigned long volatile jiffies;
extern unsigned long startup_time;
extern int jiffies_offset;

#define CURRENT_TIME (startup_time+(jiffies+jiffies_offset)/HZ)

extern void add_timer(long jiffies, void (*fn)(void));
extern void sleep_on(struct task_struct ** p);
extern void interruptible_sleep_on(struct task_struct ** p);
extern void wake_up(struct task_struct ** p);
extern int in_group_p(gid_t grp);

/*
 * Entry into gdt where to find first TSS. 0-nul, 1-cs, 2-ds, 3-syscall
 * 4-TSS0, 5-LDT0, 6-TSS1 etc ...
 */
#define FIRST_TSS_ENTRY 4
#define FIRST_LDT_ENTRY (FIRST_TSS_ENTRY+1)
#define _TSS(n) ((((unsigned long) n)<<4)+(FIRST_TSS_ENTRY<<3))
#define _LDT(n) ((((unsigned long) n)<<4)+(FIRST_LDT_ENTRY<<3))
#define ltr(n) __asm__("ltr %%ax"::"a" (_TSS(n)))
#define lldt(n) __asm__("lldt %%ax"::"a" (_LDT(n)))
#define str(n) \
__asm__("str %%ax\n\t" \
	"subl %2,%%eax\n\t" \
	"shrl $4,%%eax" \
	:"=a" (n) \
	:"a" (0),"i" (FIRST_TSS_ENTRY<<3))
/*
 *	switch_to(n) should switch tasks to task nr n, first
 * checking that n isn't the current task, in which case it does nothing.
 * This also clears the TS-flag if the task we switched to has used
 * tha math co-processor latest.
 */
 /* 定义 switch_to 宏 */
#define switch_to(n) {\
/* 定义结构体：这里a和b是long类型，因为long类型在32为操作系统中占用32个bit，已经足够寻址32位操作系统的最大地址 */
struct {long a,b;} __tmp; \
__asm__("cmpl %%ecx,_current\n\t" \ /* 比较 ecx 寄存器（存储新任务的 task_struct 指针）和 _current 变量（存储当前任务的 task_struct 指针）。 */
	"je 1f\n\t" \ /* 如果 ecx 寄存器（新任务的 task_struct 指针）与 _current 变量（当前任务的 task_struct 指针）相等，则跳转到标号为 1 的位置。这表示要切换到的新任务就是当前任务，不需要进行任务切换，直接结束 switch_to 宏。 */
	"movw %%dx,%1\n\t" \ /* 将 dx 寄存器中存储的 16 位数据（新任务的 TSS 段选择符）移动到 __tmp 结构体 b 成员所在的内存地址处。 */
	"xchgl %%ecx,_current\n\t" \ /* 将 ecx 寄存器中的值（新任务的 task_struct 指针）和 _current 变量中的值（当前任务的 task_struct 指针）进行交换。交换后，ecx 寄存器中存储的是原先当前任务的 task_struct 指针，而 _current 变量中存储的是新任务的 task_struct 指针。 */
	"ljmp %0\n\t" \ /* 汇编指令，表示进行远跳转。ljmp *%0 的作用是：
			 * 获取跳转目标地址： 从 __tmp 结构体的 a 成员中读取新任务的代码入口地址。
			 * 执行远跳转： 将CPU的指令指针（EIP）设置为新任务的代码入口地址，开始执行新任务的代码。
			*/
	"cmpl %%ecx,_last_task_used_math\n\t" \ /* 比较任务指针： 比较 ecx 寄存器中的值（原先当前任务的 task_struct 指针）和 _last_task_used_math 变量中的值（上次使用数学协处理器的任务的 task_struct 指针）。 */
	"jne 1f\n\t" \ /* 如果不同则直接跳转到switch_to执行结束，接下来如果显式调用协处理器上下文保存函数save_i387()，则会保存协处理器上下文 */
	"clts\n" \ /* 执行 clts 指令，清除 TS 标志。这样，在下次切换回这个任务时，由于 TS 标志为 0，系统就不会进行协处理器上下文的保存和恢复操作 */
	/* 如果即将切换出去的任务是上次使用 FPU 的任务。
	 * 清除 TS 标志，告诉硬件当前任务没有使用过 FPU。
	 * 优化 FPU 上下文切换： 由于新任务不需要使用 FPU，或者新任务和原先任务的 FPU 上下文相同，因此在下次切换回该任务时，不需要进行 FPU 状态的保存和恢复操作，从而提高任务切换的效率。 */
	"1:" \
	::"m" (*&__tmp.a),"m" (*&__tmp.b), \
	"d" (_TSS(n)),"c" ((long) task[n])); \
}

#define PAGE_ALIGN(n) (((n)+0xfff)&0xfffff000)

#define _set_base(addr,base) \
__asm__("movw %%dx,%0\n\t" \
	"rorl $16,%%edx\n\t" \
	"movb %%dl,%1\n\t" \
	"movb %%dh,%2" \
	::"m" (*((addr)+2)), \
	  "m" (*((addr)+4)), \
	  "m" (*((addr)+7)), \
	  "d" (base) \
	:"dx")

#define _set_limit(addr,limit) \
__asm__("movw %%dx,%0\n\t" \
	"rorl $16,%%edx\n\t" \
	"movb %1,%%dh\n\t" \
	"andb $0xf0,%%dh\n\t" \
	"orb %%dh,%%dl\n\t" \
	"movb %%dl,%1" \
	::"m" (*(addr)), \
	  "m" (*((addr)+6)), \
	  "d" (limit) \
	:"dx")

#define set_base(ldt,base) _set_base( ((char *)&(ldt)) , base )
#define set_limit(ldt,limit) _set_limit( ((char *)&(ldt)) , (limit-1)>>12 )

#define _get_base(addr) ({\
unsigned long __base; \
__asm__("movb %3,%%dh\n\t" \
	"movb %2,%%dl\n\t" \
	"shll $16,%%edx\n\t" \
	"movw %1,%%dx" \
	:"=d" (__base) \
	:"m" (*((addr)+2)), \
	 "m" (*((addr)+4)), \
	 "m" (*((addr)+7))); \
__base;})

#define get_base(ldt) _get_base( ((char *)&(ldt)) )

#define get_limit(segment) ({ \
unsigned long __limit; \
__asm__("lsll %1,%0\n\tincl %0":"=r" (__limit):"r" (segment)); \
__limit;})

#endif

```

