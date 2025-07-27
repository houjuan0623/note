# 神奇的 file descriptor

[源码位置](https://github.com/houjuan0623/linux/blob/main/%E4%B8%8D%E5%90%8C%E7%89%88%E6%9C%AC%E7%9A%84old%20linux/linux-0.12/fs/open.c#L171)

```c
int sys_open(const char * filename,int flag,int mode)
{
	struct m_inode * inode;
	struct file * f;
	int i,fd;

	mode &= 0777 & ~current->umask;
	for(fd=0 ; fd<NR_OPEN ; fd++)
		if (!current->filp[fd])
			break;
	if (fd>=NR_OPEN)
		return -EINVAL;
	current->close_on_exec &= ~(1<<fd);
	/**
	  
	*/
	return (fd);
}
```

**一个文件描述符 fd 是一个非负整数。**

> 注意：fd 并不是计算得来的，是内核在管理进程资源时分配的一个索引。

在每个进程[数据结构](../../jin-cheng-diao-du/jin-cheng-he-xian-cheng.md#jin-cheng-shu-ju-jie-gou)内部都有一个文件描述符表指针 flip。flip 数组记录着所有文件描述符，**数组的索引就是文件描述符 fd**。**数组中的每个元素是指向 file 结构体的指针**。

fd
