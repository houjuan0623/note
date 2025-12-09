---
icon: water
---

# 程序并发

本文适用于对并发由初步了解的读者。通过本文希望为读者提供更深的理解。

关于并发，对于开发者来讲，主要面对的有网络并发，程序并发，数据库并发。本文主要讨论程序并发。

本文将会从以下几个角度描述React并发，nodejs并发，多线程并发，多进程并发，go（Goroutines）并发。上述并发总共可以归结为三类：

1. 轻量级（这里的轻量是和线程相比较而言的）数据结构并发：nodejs并发、react并发、go（Goroutines）并发，这三者均是通过比线程更加轻量的内存数据结构实现的并发控制。
2. 多线程并发：java采用多线程模型实现并发控制。
3. 多进程并发。

### 并发需要考虑的问题

1. 资源共享与竞争条件：当多个并发执行单元（进程、线程、协程等）同时访问和修改**共享资源**（如内存中的变量、文件、数据库记录）时，最终结果可能取决于它们执行的精确时序，导致结果不可预测或错误。这就是竞争条件。
2. 同步与顺序保证：有时任务之间存在依赖关系，一个任务必须等待另一个任务完成或达到某个状态后才能继续执行。或者需要确保一系列操作按特定顺序发生。
3. 死锁：两个或多个并发单元互相持有对方需要的资源，并无限期地等待对方释放，导致所有相关单元都无法继续执行。
4. 活锁：并发单元都在积极地执行操作和改变状态，但它们不断地对彼此的操作做出反应，导致系统整体上无法取得有效进展，就像两个人在狭窄的过道里互相让路但总是移动到同一边。关于这种现象主要考虑如何确保系统即使在冲突和重试中也能最终**向前推进。**
5. 饥饿：某个或某些并发单元（通常是低优先级的）持续地无法获得执行所需的资源（如 CPU 时间、锁），导致它们一直无法执行或完成，即使系统整体在运行。
6. 效率与开销：并发机制自身会带来开销，并直接影响系统的整体性能表现。
   1. **上下文切换成本:** 保存一个执行单元的状态并加载另一个执行单元的状态需要时间，尤其是在操作系统级别的线程切换时。
   2. **协调开销:** 使用锁、消息传递等同步机制本身也会带来性能开销。
   3. **可伸缩性:** 并发模型能否有效利用多核处理器？随着并发单元数量或处理器核心数的增加，性能是否能相应提升，还是会遇到瓶颈？
   4. **资源利用率:** CPU、内存、网络、磁盘 I/O 等系统资源是否得到充分且有效的利用？是否存在过度竞争或资源闲置？
   5. **吞吐量:** 系统在单位时间内能处理的任务总量。并发模型是否能有效利用资源（如多核 CPU、I/O 等待时间）来提高吞吐量？
   6. **延迟:** 单个任务从提交到开始执行或最终完成所需的时间。并发调度是否会不必要地增加关键任务的延迟？高优先级任务的低延迟能否得到保证？
7. 响应性：如何确保长时间运行的后台或低优先级任务不会阻塞关键路径，例如用户界面响应、网络事件处理等？
8. 错误处理：一个并发任务中的错误如何处理？它会影响其他任务吗？错误信息如何传播？系统是应该崩溃、隔离错误还是尝试恢复？
9. 取消与中断：如何安全、干净地停止一个正在进行或等待中的并发任务？如果任务已经开始执行副作用或持有资源，如何处理？

## 起源

最早的计算机是严格按顺序执行指令的，一次只运行一个程序（批处理）。这种模式下，不存在并发的概念。

为了提高昂贵计算机资源的利用率（特别是 CPU 常常需要等待慢速的 I/O 设备），以及提供更友好的交互式体验，操作系统开始发展出管理多个程序的能力。

在**单核 CPU** 系统上，操作系统通过快速地在不同程序（进程/任务）之间切换 CPU 的使用权，实现了**宏观上**多个程序同时运行的效果。虽然在任何一个微小的时间点上只有一个程序在真正执行，但在一段较短的时间内，多个程序的执行是**交织 (interleaved)** 在一起的。这种**管理多个逻辑上同时在运行（即使是交织执行）的任务**的机制和现象，就需要一个术语来描述，**“并发” (Concurrency)** 就应运而生了。它描述的是这种**处理多个任务相互交织推进**的特性。

**并发 vs. 并行 (Concurrency vs. Parallelism):** 这就引出了并发和并行的重要区别：

* **并发 (Concurrency):** 关注的是**处理多个任务的能力和结构**。这些任务的执行在时间上可以重叠（可以在单核上交织执行，也可以在多核上并行执行）。它是关于**逻辑上同时处理多件事情**。
* **并行 (Parallelism):** 关注的是**物理上同时执行多个任务**。通常需要多个硬件执行单元（如 CPU 核心）。它是关于**实际上同时做多件事情**。

所以在单核CPU机器上允许并发的存在，但是没有并行的概念。

## REACT 并发

[源码](../../react/aboutReact/react-code-source/src/%E5%B9%B6%E5%8F%91demo/react.development.js)

### 资源共享和同步问题

在react并发模型中的**资源主要是指单线程的执行权。**&#x63A5;下来我们从两个角度讨论执行权的抢占，一方面是react不同优先级任务的执行权的协调，另一方面是react任务和浏览器任务优先权协调。

在react中所有的任务都保存在taskQueue中。taskQueue默认按照最小堆（什么是最小，这里是根据sortIndex的值来比较的，sortIndex在用户传入delay选项的时候值为currentTime+delay，在用户未传入delay选项的时候sortIndex为currentTime+timeout(不同优先级具有不同的超时时间，优先级越高超时时间越小)）建立的，所以taskQueue\[0]储存着最先应该执行task。如图1所示。

通过sortIndex排序建立的最小堆数据结构同时保证了任务之间执行顺序。但是当任务之间有依赖关系时，在[react.development.js](../../react/aboutReact/react-code-source/src/%E5%B9%B6%E5%8F%91demo/react.development.js)中并没有显式的依赖声明机制，所以这这种情况下需要程序员显示声明任务A和任务B之间的依赖关系。

<figure><img src="../.gitbook/assets/image (2).png" alt=""><figcaption><p>图1</p></figcaption></figure>

屏幕刷新率为60HZ的时候，浏览器每帧存活时间约为16.67ms，React规定在这16.67ms内至多有[5ms](../../react/aboutReact/react-code-source/src/%E5%B9%B6%E5%8F%91demo/react.development.js#L2417)用于执行task。

```javascript
function shouldYieldToHost() {
  var timeElapsed = getCurrentTime() - startTime;

  if (timeElapsed < frameInterval) {
    // frameInterval默认为5ms
    // The main thread has only been blocked for a really short amount of time;
    // smaller than a single frame. Don't yield yet.
    return false;
  } // The main thread has been blocked for a non-negligible amount of time. We


  return true;
}
```

<figure><img src="../.gitbook/assets/image (1) (1).png" alt=""><figcaption><p>图2</p></figcaption></figure>

如图2所示，react任务最多执行5ms，超过5ms的情况下会通过return终止当前任务的执行，然后就会将执行权交给浏览器。

由于5ms的限制，会产生一个任务执行完5ms以后并未执行完毕的情况，这个时候`workLoop` 返回 `true` ，`flushWork` 的 `finally` 块会调用 `schedulePerformWorkUntilDeadline()`。这个函数利用 `MessageChannel` (或其他异步机制) 的 `postMessage` 将一个**新的宏任务**放入事件循环队列。这个新任务就是去执行 `performWorkUntilDeadline`，而 `performWorkUntilDeadline` 的核心工作就是再次调用 `flushWork`。总之会利用浏览器的事件循环机制，将一个新的事件压入事件循环队列中。这样一来执行权就交给浏览器了。

### 死锁和活锁问题

当我们仅仅将注意力集中在[react.development.js](../../react/aboutReact/react-code-source/src/%E5%B9%B6%E5%8F%91demo/react.development.js)的时候，它本身的设计几乎不可能产生经典意义上的死锁和活锁现象。

这段代码设计的运行环境（浏览器 JavaScript 主线程或 Node.js）通常是单线程的。死锁的典型场景是多个线程（或进程）互相持有对方需要的资源（通常通过锁来控制访问）并等待对方释放。在单线程模型下，不存在多个线程同时持有并等待资源的情况。

活锁通常发生在多个单元都在积极地改变状态以响应对方，但整体无法前进。这里的任务是由 `workLoop` 单方面按优先级挑选和执行的，它们之间没有形成调度器层面的、互相响应导致空转的循环。

接下来我们来看一下，react并发是怎样处理饿死问题的。

### 饿死

解决饿死问题，依赖过期时间机制。

即使一个任务是以 `LowPriority`（10秒超时）调度的，它的 `expirationTime` 在创建时就被确定了。随着时间的推移 (`currentTime` 增加)，这个 `expirationTime` 最终会被 `currentTime` 超过。

一旦 `currentTime <= currentTask.expirationTime`，这个低优先级任务就“过期”了。根据上述 `workLoop` 的逻辑：

* 过期的任务在 `taskQueue` 中的有效优先级提高了（因为它不再轻易因为 `shouldYieldToHost` 而被跳过）。
* 同时，因为 `sortIndex` 基于 `expirationTime`，越接近过期的任务在队列中的排名也越靠前。

因此，一个低优先级的任务（除了 `IdlePriority`）不会无限期地等待下去。只要时间足够长，它总会过期，一旦过期并且轮到它（到达队首），它就会被 `workLoop` 执行。这就**缓解**了饥饿现象。

### 性能

这个调度器实现的并发是单线程内依赖队列实现的并发，不是操作系统级别的抢占式多线程。因此，没有保存和恢复完整操作系统线程上下文所带来的高昂成本。但是它的性能上限受限于单个 CPU 核心的处理能力。

所谓的上下文的切换，是指`workLoop` 因为时间片用完 (`shouldYieldToHost`) 或执行完一个任务后，通过 `requestHostCallback` (如 `MessageChannel` 或 `setTimeout`) 将执行权交还给事件循环，并在稍后恢复执行。或者是在 `workLoop` 内部从执行一个任务的回调切换到执行下一个。其成本主要是 JavaScript 函数调用、调用栈管理的开销，以及 `requestHostCallback` 机制本身的微小开销，远低于 OS 线程切换。

所以上下文中并不传递状态，如果任务需要记录共享状态，需要程序员通过变成实现。React本身既是通过将状态保存在Fiber节点上实现的中断和恢复能力。

#### 资源利用率

* **CPU：** 它试图通过 `workLoop` 批量执行任务来利用 CPU，但同时通过 `shouldYieldToHost` **主动让步**，避免完全阻塞主线程，以保证 UI 的响应性。它追求的是**响应速度**和**有效利用空闲时间**（特别是 `IdlePriority` 任务），而不是让 CPU 持续满载运行taskQueue中的任务。
* **内存：** 主要内存开销是存储在 `taskQueue` 和 `timerQueue` 中的任务对象。其大小取决于待处理任务的数量。堆操作是原地进行的，额外开销很小。任务回调函数自身的内存使用不受调度器直接控制。
* **I/O：** 通过让步机制，调度器允许在 React 任务暂停时，事件循环有机会处理 I/O（网络、磁盘等）完成的回调。这使得 CPU 工作（React 计算）和 I/O 等待可以更好地重叠，**有助于提高应用整体的资源利用率**，但这依赖于任务回调函数自身是否触发了 I/O 操作。

#### 延迟

* **保证高优先级低延迟：** 调度器的设计明确旨在最小化高优先级任务（`ImmediatePriority`, `UserBlockingPriority`）的延迟。它们有很短的超时时间、在队列中优先级高，并且过期的任务能绕过某些让步检查，这为关键更新提供了良好的低延迟保证。
* **低优先级任务延迟：** 低优先级任务可能会因为让步或被高优先级任务抢占而经历较长的延迟。这是为了保证整体响应性而做出的**有意权衡**。
* **调度自身延迟：** 调度机制本身（入队、出队、事件循环延迟）会引入非常微小的延迟，通常可以忽略不计。

### 响应性

React通过下面的机制实现来确保浏览器能够处理自身的事件，进而提供用户友好的响应速度。

* **协作式多任务与让步（Cooperative Multitasking / Yielding）：**
  * **核心机制：** 这是保证响应性的最关键手段。调度器不是一次性执行完所有任务，而是在执行一小段时间后主动暂停。
  * **`shouldYieldToHost()` 函数：** 在主执行循环 `workLoop` 中，会调用此函数。它检查自当前批次任务开始执行 (`startTime`) 以来是否已过去特定时间（`frameInterval`，默认为 5ms）。
  * **`workLoop` 的让步行为：** 如果 `shouldYieldToHost()` 返回 `true`（表示时间片用完）并且当前任务尚未过期，`workLoop` 就会 `break`，停止处理当前事件循环 tick 中剩余的任务。
  * **`requestHostCallback()` 异步调度：** 当 `workLoop` 让步或完成当前批次后，它会使用 `requestHostCallback`（通过 `MessageChannel`, `setImmediate` 或 `setTimeout` 实现）来异步地安排下一次 `flushWork` 的调用。这就在**工作块之间**将控制权交还给了浏览器的事件循环。
* **时间分片（Time Slicing）：**
  * 由 `frameInterval` 定义的时间间隔（默认 5ms）决定了调度器大约会连续执行多长时间的任务，然后才让步。这能将可能很长的计算任务（例如一个大型组件树的渲染）分解成多个小的时间片段来执行。
* **优先级调度（Prioritization）：**
  * 高优先级的任务（如 `ImmediatePriority`, `UserBlockingPriority`）会被放在 `taskQueue` 优先队列的前面。
  * `workLoop` 总是尝试先执行队列中优先级最高的可用任务。
  * 这确保了即使有大量低优先级任务积压，新调度进来的高优先级任务（概念上，比如由用户输入触发的更新）也能迅速“插队”到前面，并在下一个可用的时间片内被优先处理。

**上面的机制允许浏览器处理其他事务：** 在 React 让步的间隙，浏览器的事件循环就有机会去处理队列中的其他任务，包括：**用户输入事件**（点击、输入、滚动等）、**渲染和绘制**（更新屏幕显示）、**网络事件回调**（处理 fetch 或 XHR 的响应）、**定时器回调**（`setTimeout`, `setInterval`）。

### 错误处理

查看核心的 `workLoop` 函数，它在执行 `callback(didUserCallbackTimeout)` 这行代码时，**并没有**使用 `try...catch` 来包裹这个回调函数的调用。

由于 `workLoop` 内部没有捕获 `callback` 可能抛出的错误，如果 `callback` 真的出错了，这个错误会从 `callback` 抛出，经过 `workLoop`，再经过 `flushWork`（即使在 profiling 路径下被 catch 了也会被 re-throw）。

因为 `flushWork` 通常是通过 `requestHostCallback` 异步调用的（例如 `MessageChannel` 或 `setTimeout`），这个未被捕获的错误最终会成为一个**全局未捕获异常**，通常会被浏览器或 Node.js 环境报告到控制台。

`flushWork` 通常在 `finally` 块中检查是否还有更多工作 (`hasMoreWork`) 并通过 `schedulePerformWorkUntilDeadline()` 重新调度自己。如果错误导致执行未能到达或正确完成这个 `finally` 块中的重新调度逻辑（虽然 `finally` 通常会执行，但错误可能干扰 `hasMoreWork` 的判断或后续流程），调度器可能会停止工作，直到有新的外部调用 `unstable_scheduleCallback` 来重新触发 `requestHostCallback`。

所以错误应该由程序员来处理，[react.development.js](../../react/aboutReact/react-code-source/src/%E5%B9%B6%E5%8F%91demo/react.development.js)对任务内部的失败采取的是比较简单的“失败即停止（当前批次）”策略。

### 取消和中断

**显式取消 (`unstable_cancelCallback`)**

* **机制：** 文件提供了一个 `unstable_cancelCallback(task)` 函数。你需要传入之前调用 `unstable_scheduleCallback` 时返回的那个 `task` 对象。
* **操作：** 这个函数的核心动作是 `task.callback = null;`。它找到对应的任务对象，并将其 `callback` 属性设置为 `null`。
* **效果：** 当调度器的 `workLoop` 最终从队列中取出这个任务时，它会检查 `if (typeof callback === 'function')`。由于此时 `callback` 已经是 `null`，这个检查会失败，`workLoop` 就不会执行任何操作，通常会直接将这个任务从队列中 `pop` 掉（如果它在队首的话）。
* **适用范围：** 这种方法只对那些**还在 `taskQueue` 或 `timerQueue` 中等待，尚未开始执行**的任务有效。它可以干净地阻止这些任务被执行。

**中断正在运行的任务**

* **无抢占式中断：** 由于 JavaScript 的单线程和协作式模型，这个调度器无法强行中断一个正在同步执行的回调函数。如果你的 `callback` 函数正在执行一个长时间的同步计算（比如一个大的 `for` 循环），调度器无法在循环中途将其暂停。
* **让步作为中断点：** 调度器实现的唯一“中断”形式发生在**任务之间**，或者一个可分解任务的**多个分块之间**（如果回调返回一个函数作为续体）。当中 `shouldYieldToHost()` 返回 `true` 时，`workLoop` 会中断执行 `break`。这并非中断当前正在执行的回调代码，而是决定**暂时不开始执行下一个任务（或下一个任务块）**
* **取消时对副作用和资源的处理**
  * **任务未开始时取消：** 如果在任务的回调函数开始执行**之前**调用了 `unstable_cancelCallback`，那么该回调函数内部的任何副作用都不会发生。这是一个干净的取消。
  * **任务已开始时取消：** 如果任务的回调函数**已经开始执行**其同步代码，`unstable_cancelCallback` **无法阻止它继续执行**。并且，调度器本身**没有任何机制**通知那个正在运行的回调：“你应该停下来并进行清理”。
  * **清理责任：** 如果一个任务被意图取消，但其回调已经开始执行，那么任何必要的清理逻辑（例如，释放它持有的资源、中止它发起的网络请求等）都**完全是回调函数自身或者更高层应用代码的责任**。回调函数需要自己内部包含检查逻辑（比如检查一个外部设置的标志位）来判断是否应该提前中止并执行清理。[react.development.js](../../react/aboutReact/react-code-source/src/%E5%B9%B6%E5%8F%91demo/react.development.js)**中的调度器代码不提供任何用于这种执行中取消信号或清理编排的基础设施。**
  * **React 语境下的处理：** 在完整的 React 应用中，`useEffect` 的清理函数（cleanup function）扮演了类似的角色。当组件卸载或依赖项变化时，如果之前的异步 effect 尚未完成，其清理函数会被调用，开发者可以在清理函数中取消网络请求、移除监听器等。但这套机制是与 React 组件生命周期和 Hooks 规则绑定的，由渲染器管理，而非这段独立的调度器代码直接提供。

## Nodejs 并发

Nodejs 代码主要运行在**单个主线程**上。所以**通常（没有使用wokrer的情况下）不需要担心传统意义上的线程竞争条件。**

**传统层面：**

* Java 的情况： 两个线程可以同时修改同一个变量 `count++`。如果没有 `synchronized`，变量值就乱了。
* Node.js 的情况： 事件循环（Event Loop）一次只执行一个回调。即使有 10000 个并发请求，在 CPU 处理这行 `count++` 代码的那一微秒，绝对没有别的代码能插手。

但是仍然需要关注共享状态存在的挑战（这是异步带来的挑战）。

**逻辑层面：单线程的“竞态条件”**

虽然没有内存竞争，但 Node.js 广泛使用异步（Async/Await）。只要代码中间有了 `await`，执行权就会交出去。这时，“逻辑锁”就变得非常必要。

示例代码：

```javascript
let stock = 1;

async function buy() {
  if (stock > 0) {
    // 关键点：这里有一个 await，比如去查一下用户积分
    await checkUserScore(); 
    // 在这等待期间，stock 还是 1，其他请求进来了，也通过了 if (stock > 0)
    stock--; 
    console.log("购买成功");
  } else {
    console.log("没货了");
  }
}
```

如果同时发 10 个请求，虽然 JS 是单线程的，但因为中间那个 `await` 暂停了当前函数的执行，导致 10 个请求都可能进入 `if` 内部。最后库存变成 -9。

### 关于worker\_threads模块

Node.js 提供了 `worker_threads` 模块，允许你创建真正的操作系统级线程来执行 JavaScript 代码，主要用于 CPU 密集型任务。当使用 `worker_threads` 并且在工作线程和主线程之间共享内存时，那么[传统的线程安全问题](cheng-xu-bing-fa.md#bing-fa-xu-yao-kaolde-wen-ti)都要考虑进来。

为此，Node.js（基于 V8）提供了 `Atomics` 对象，这就是 Node.js 的“锁”：

* `Atomics.wait(int32Array, index, value)`: 相当于 Java 的 `Object.wait()` 或锁的挂起。
* `Atomics.notify(int32Array, index, count)`: 相当于 Java 的 `Object.notify()`。
* `Atomics.compareExchange(...)`: 典型的 CAS (Compare-And-Swap) 原子操作。

### 关于集群cluster模块

cluster 允许你创建多个 Node.js **进程**（不是线程）来利用多核 CPU。每个进程有自己独立的内存空间。它们之间的状态共享通常需要通过 IPC（进程间通信）或者外部存储（如 Redis、数据库）来实现，这时关注点是数据一致性和同步，而不是传统意义上的同一进程内的线程安全。

### 关于外部资源并发

当Nodejs和外部资源（如数据库、缓存服务、消息队列）交互时，这些外部系统本身有自己的并发控制机制。所以我们在编写代码之前要提前做好功课。[理解数据库的并发](shu-ju-ku-bing-fa.md)，缓存服务的并发，消息队列的并发。

## Java 并发

### 关于外部资源的并发
