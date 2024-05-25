# system.h

<pre class="language-c"><code class="lang-c">#define move_to_user_mode() \
__asm__ ("movl %%esp,%%eax\n\t" \
	"pushl $0x17\n\t" \
	"pushl %%eax\n\t" \
	"pushfl\n\t" \
	"pushl $0x0f\n\t" \
	"pushl $1f\n\t" \
	"iret\n" \
	"1:\tmovl $0x17,%%eax\n\t" \
	"mov %%ax,%%ds\n\t" \
	"mov %%ax,%%es\n\t" \
	"mov %%ax,%%fs\n\t" \
	"mov %%ax,%%gs" \
	:::"ax")

#define sti() __asm__ ("sti"::)
#define cli() __asm__ ("cli"::)
#define nop() __asm__ ("nop"::)

#define iret() __asm__ ("iret"::)

#define _set_gate(gate_addr,type,dpl,addr) \
__asm__ ("movw %%dx,%%ax\n\t" \
	"movw %0,%%dx\n\t" \
	"movl %%eax,%1\n\t" \
	"movl %%edx,%2" \
	: \
	: "i" ((short) (0x8000+(dpl&#x3C;&#x3C;13)+(type&#x3C;&#x3C;8))), \
	"o" (*((char *) (gate_addr))), \
	"o" (*(4+(char *) (gate_addr))), \
	"d" ((char *) (addr)),"a" (0x00080000))

#define set_intr_gate(n,addr) \
	_set_gate(&#x26;idt[n],14,0,addr)

#define set_trap_gate(n,addr) \
	_set_gate(&#x26;idt[n],15,0,addr)

#define set_system_gate(n,addr) \
	_set_gate(&#x26;idt[n],15,3,addr)

#define _set_seg_desc(gate_addr,type,dpl,base,limit) {\
	*(gate_addr) = ((base) &#x26; 0xff000000) | \
		(((base) &#x26; 0x00ff0000)>>16) | \
		((limit) &#x26; 0xf0000) | \
		((dpl)&#x3C;&#x3C;13) | \
		(0x00408000) | \
		((type)&#x3C;&#x3C;8); \
	*((gate_addr)+1) = (((base) &#x26; 0x0000ffff)&#x3C;&#x3C;16) | \
		((limit) &#x26; 0x0ffff); }

#define _set_tssldt_desc(n,addr,type) \
<strong>__asm__ ("movw $104,%1\n\t" \
</strong>	"movw %%ax,%2\n\t" \
	"rorl $16,%%eax\n\t" \
	"movb %%al,%3\n\t" \
	"movb $" type ",%4\n\t" \
	"movb $0x00,%5\n\t" \
	"movb %%ah,%6\n\t" \
	"rorl $16,%%eax" \
	::"a" (addr), "m" (*(n)), "m" (*(n+2)), "m" (*(n+4)), \
	 "m" (*(n+5)), "m" (*(n+6)), "m" (*(n+7)) \
	)

#define set_tss_desc(n,addr) _set_tssldt_desc(((char *) (n)),addr,"0x89")
#define set_ldt_desc(n,addr) _set_tssldt_desc(((char *) (n)),addr,"0x82")

</code></pre>

结合上述代码中的`_set_tssldt_desc`，查看[TSS](gdt.md#tss)和[LDT](gdt.md#ldt)段描述符的结构，接下来我们以tss段描述符的设置举例：

其中rorl的用法参考[`rorl $16,%%eax` 中 rorl 用法](sometips.md#rorl-16eax-zhong-rorl-yong-fa)

```
movw $104,%1       ; 将 TSS 的大小（104 字节）写入 GDT 中 TSS 描述符的 Limit[15:0] 字段（第1和第2字节）。
movw %%ax,%2       ; 将 TSS 基址的低 16 位（Base[15:0]）写入 GDT 中 TSS 描述符的 Base[15:0] 字段（第3和第4字节）。
rorl $16,%%eax     ; 将 eax 寄存器中的值（TSS 基址）循环右移 16 位，使得 Base[31:24] 位于 al 寄存器中。
movb %%al,%3       ; 将 TSS 基址的高 8 位（Base[23:16]）写入 GDT 中 TSS 描述符的 Base[23:16] 字段（第5字节）。
movb $0x89,%4       ; 将 TSS 描述符的Type S DPL P 初始化为0x89，写入 GDT 中 TSS 描述符的 第6字节。
movb $0x00,%5       ; 将 GDT 中 TSS 描述符的第 7 个字节清零（这些位用于存储段属性，如 G、AVL、Limit 等）。
movb %%ah,%6       ; 将 TSS 基址的中间 8 位（Base[31:24]）写入 GDT 中 TSS 描述符的 Base[31:24] 字段（第7字节）。
rorl $16,%%eax     ; 将 eax 寄存器中的值（TSS 基址）循环右移 16 位，恢复为原始值。
```
