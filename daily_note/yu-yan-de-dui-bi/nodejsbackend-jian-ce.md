# Nodejs-backend监测

## 架构生产级可观测性

### OpenTelemetry 现代可观测性蓝图

#### 什么是OpenTelemetry？

[参考官方内容：](https://opentelemetry.io/docs/what-is-opentelemetry/)

OpenTelemetry is:

*   An [**observability**](https://opentelemetry.io/docs/concepts/observability-primer/#what-is-observability) **framework and toolkit** designed to facilitate the

    * [Generation](https://opentelemetry.io/docs/concepts/instrumentation)
    * Export
    * [Collection](https://opentelemetry.io/docs/concepts/components/#collector)

    of [telemetry data](https://opentelemetry.io/docs/concepts/signals/) such as [traces](https://opentelemetry.io/docs/concepts/signals/traces/), [metrics](https://opentelemetry.io/docs/concepts/signals/metrics/), and [logs](https://opentelemetry.io/docs/concepts/signals/logs/).
* **Open source**, as well as **vendor- and tool-agnostic**, meaning that it can be used with a broad variety of observability backends, including open source tools like [Jaeger](https://www.jaegertracing.io/) and [Prometheus](https://prometheus.io/), as well as commercial offerings. OpenTelemetry is **not** an observability backend itself.

> OpenTelemetry 是：
>
> * 一个可观测性框架和工具包，旨在促进遥测数据（例如轨迹、指标和日志）的生成、导出和收集。
> * 它是开源的，并且与供应商和工具无关，这意味着它可以与各种可观测性后端一起使用，包括 Jaeger 和 Prometheus 等开源工具以及商业产品。OpenTelemetry 本身并不是一个可观测性后端。

#### 分布式系统的挑战与可观测性的兴起

现代应用程序越来越多地采用复杂的微服务架构，这使得识别和诊断问题变得异常困难 。单个用户请求可能会穿越多个服务，这在识别性能瓶颈、跨服务边界调试以及理解服务依赖关系方面带来了巨大挑战 。传统的监控方法，如仅关注单个系统指标或日志，已不足以应对这种复杂性。

可观测性（Observability）应运而生，它超越了传统监控，旨在通过高质量的遥测数据——即链路（Traces）、指标（Metrics）和日志（Logs）——来深入理解系统的内部状态。OpenTelemetry (OTel) 提供了一个标准化的、与供应商无关的框架来实现这一目标 。

#### 可观测行：统一方法

OpenTelemetry 是一个用于生成、收集和导出遥测数据的框架，其核心是可观测性的三大支柱：链路、指标和日志 。

* **链路 (Traces):** 链路记录了单个请求在分布式系统中的完整旅程。它通过跟踪请求流经各个服务的过程，帮助开发人员识别性能瓶颈并理解系统的请求流程 。一条链路由多个Span 组成，每个 Span 代表系统中的一个独立工作单元或操作，例如一次数据库查询或一次 HTTP 调用 。通过将这些 Span 串联起来，链路描绘出一幅详细的、端到端的请求执行图。
* **指标 (Metrics):** 指标提供了关于应用程序和基础设施运行状况的量化信息。这些数据以聚合形式呈现，例如响应时间、内存使用率、请求计数等，从而实现性能监控和趋势分析 。与旨在捕获单个请求生命周期的链路不同，指标旨在提供聚合的统计信息，用于回答诸如“我们服务的平均延迟是多少？”或“过去一小时的错误率是多少？”之类的问题。
* **日志 (Logs):** 日志通过事件记录提供了定性的洞察力，详细说明了系统在特定时间点发生的事情 。它们是离散的、带有时间戳的事件记录，可以包含从结构化数据（如 JSON）到非结构化文本的任何信息。日志对于调试特定错误、理解特定事件的上下文至关重要。

这三大支柱相辅相成，共同提供了一个关于系统性能和行为的整体视图。例如，指标中的错误率峰值（如错误率飙升）可以通过检查相应的链路来调查，以确定确切的请求路径和故障点。然后，可以进一步深入到该特定链路的日志中，以获取详细的错误消息和堆栈跟踪，从而快速定位问题的根源。

#### OpenTelemetry组件

[参考文章：](https://opentelemetry.io/docs/concepts/components/)

OpenTelemetry 的架构由几个关键组件组成，它们共同协作以实现遥测数据的生命周期管理 。

* **API (定义“做什么”):** API 是一组与具体实现无关的、轻量级的接口，用于在代码中进行插桩（instrumentation）。它定义了如何创建 Span、记录指标等操作，但并不包含这些操作的具体实现逻辑。库和框架的开发者应该依赖 API 进行插桩，这样他们的代码就可以与任何兼容 OTel 的实现无缝协作。
* **SDK (定义“如何做”):** SDK 是 API 的具体实现。它负责处理数据的收集、处理（例如采样、聚合）和导出。应用程序的所有者负责配置和使用 SDK，以定义遥测数据如何被处理以及发送到何处 。
* **Exporter (定义“发往何处”):** Exporter 是 SDK 或 Collector 内部的一个组件，负责将遥测数据转换为特定后端的格式并将其发送出去。例如，`JaegerExporter` 会将数据发送到 Jaeger 后端，而 `OTLPExporter` 则使用 OpenTelemetry 原生协议 (OTLP) 发送数据 。
* **Collector (定义“数据管道”):** Collector 是一个与供应商无关的代理服务，可以接收、处理和导出遥测数据。它充当数据管道，能够从多种来源接收数据（如 OTLP、Jaeger、Prometheus 格式），进行批处理、过滤、采样等操作，然后将数据转发到一个或多个后端。在生产环境中使用 Collector 是最佳实践。
* **Propagator (定义“上下文载体”):** Propagator 是在服务之间传递上下文（如 `trace_id`）的机制。当一个请求跨越进程或网络边界时，Propagator 会将追踪上下文注入到请求中（例如，作为 HTTP 头），并在接收端将其提取出来。这是实现分布式追踪的关键机制 。

这种 API 与 SDK 的分离是 OpenTelemetry 生态系统战略的基石。一个库（例如 `pg` PostgreSQL 驱动）的开发者只需针对 `@opentelemetry/api` 进行一次插桩。然后，使用该库的应用程序开发者可以选择任何兼容的 SDK（官方 SDK 或特定供应商的 SDK）和任何后端。`pg` 库的插桩代码将无缝工作，无需任何修改。这种解耦的模式创建了一个强大、可移植的生态系统，避免了供应商锁定，并使代码库能够适应未来的技术发展。

### 插桩分布式 Node.js 应用

下面我将构建一个 `UserService` 和一个下游的 `OrderService`。将从头开始对它们进行插桩。

