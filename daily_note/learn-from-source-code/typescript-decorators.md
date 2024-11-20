# ☺️ typescript decorators

## 概念

### 术语描述

装饰器是一种设计模式，用于在不修改原函数的情况下，动态地为函数添加额外的功能。它通过将函数作为参数传递给另一个函数来实现，通常用于日志记录、性能分析和权限校验等场景。

### 渐入佳境

#### 装饰器的诞生

用户编写代码的时候，有这样一种场景，在整个项目中不同的位置调用同一段代码。也许这段代码就是为了实现两个数相加，使用console打印字符串等等。大家能接受的思路是，在应该调用该功能时编写对应的调用函数。

but one day，somebody has find an easy way to realize above function.

wow，既然如此，那当然要尝试一下了。

为了区别这种巧妙的语法和正常调用之间的区别，工程师们引入了 @ 符号。并将其称为注解。可是在ES6标准中并没有注解相应的实现标准，所以仅仅使用 ES6 对应的JavaScript是不能体会到@带来的方便的。不用担心，我们有TypeScript。

回忆一下，@ 的本质是帮助编程人员修饰某个代码片段，丰富改代码片段的功能。这个思想貌似和装饰者模式有些相似哦。

我们来研究下，装饰者模式怎么为某个代码片段添加功能。

比如，我们要创建一个Coffe类。

```javascript
// 定义 Coffee 基类
class Coffee {
  constructor() {
    this.description = "咖啡";
    this.cost = 10;
  }

  getDescription() {
    return this.description;
  }

  getCost() {
    return this.cost;
  }
}

```

某天，需求发生改变，需要我们在咖啡中添加牛奶并计算其价格。此时就可以使用装饰者模式：

```javascript
// 牛奶装饰器
class Milk extends CondimentDecorator {
  constructor(coffee) {
    super(coffee);
    this.description = this.coffee.getDescription() + " 加牛奶";
    this.cost = this.coffee.getCost() + 2;
  }
}
```

使用装饰者模式，在不改变原有代码的基础上，我们完成了在咖啡中添加牛奶的功能。

Typescript开发者也想到了用户的这种需求，于是引入了 @ 符号，称为装饰器。自动帮开发者实现装饰者模式。代码如下：

```typescript
// 定义 Coffee 类
class Coffee {
  description = "咖啡";
  cost = 10;

  getDescription() {
    return this.description;
  }

  getCost() {
    return this.cost;
  }
}
```

使用 @ 添加装饰器：

```typescript
// 定义调料装饰器
function addMilk<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    description = super.description + " 加牛奶";
    cost = super.cost + 2;
  };
}

// 使用装饰器
@addMilk
class MyCoffee extends Coffee {}
```

目前我们就可以将装饰器看做实现了装饰者模式的一种语法糖或简化实现。

二者的相似之处是：

* **目的:** 两者都旨在动态地为对象添加新的行为或修改现有行为，而无需修改对象的原始代码。
* **方式:** 两者都通过将对象包装在另一个对象中来实现目的。

区别在于：

* **实现方式:** 装饰者模式是一种结构型设计模式，通常通过继承或组合来实现。而 TypeScript 装饰器是一种语言特性，通过 `@` 符号和装饰器函数来实现。
*   **静态 vs 动态:** 装饰者模式通常在运行时动态地添加行为，而 TypeScript 装饰器在编译时就确定了要添加的行为。

    > 这里解释下为什么装饰者模式在运行时动态地添加行为，而 TypeScript 装饰器在编译时添加行为。
    >
    > JavaScript是解释型语言，代码在执行过程中可以根据不同的条件或需求来添加或修改功能。
    >
    > 而Typescript是编译型语言，代码在运行之前就已经确定了要添加或修改哪些功能。
* **应用场景:** 装饰者模式更侧重于对象的组合和扩展，而 TypeScript 装饰器更侧重于对类、方法和属性的元编程。

请读者继续向下阅读。

## 装饰器的分类

### Class Decorators <a href="#class-decorators" id="class-decorators"></a>

类装饰器是在类声明之前声明的。它会被应用于类的构造函数，可以用来观察、修改或替换类的定义。类装饰器不能用在声明文件或任何其他环境上下文中（例如在 `declare` 类上）。

类装饰器的表达式会在运行时作为函数被调用，其唯一参数是被装饰类的构造函数。

如果类装饰器返回一个值，它会用提供的构造函数替换类声明。

下面是一个应用于 `BugReport` 类的类装饰器 (`@sealed`) 的例子：

```typescript
@sealed
class BugReport {
  type = "report";
  title: string;
 
  constructor(t: string) {
    this.title = t;
  }
}
```

我们可以使用以下函数声明来定义 `@sealed` 装饰器：

```typescript
function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}
```

当 `@sealed` 装饰器执行时，它会密封构造函数及其原型，从而防止在运行时通过访问 `BugReport.prototype` 或在 `BugReport` 本身上定义属性来添加或删除任何功能（请注意，ES2015 类实际上只是基于原型的构造函数的语法糖）。这个装饰器**不会**阻止类继承 `BugReport`。

接下来，我们将展示如何覆盖构造函数来设置新的默认值。

```typescript
function reportableClassDecorator<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    reportingURL = "http://www...";
  };
}
 
@reportableClassDecorator
class BugReport {
  type = "report";
  title: string;
 
  constructor(t: string) {
    this.title = t;
  }
}
 
const bug = new BugReport("Needs dark mode");
console.log(bug.title); // Prints "Needs dark mode"
console.log(bug.type); // Prints "report"
 
// Note that the decorator _does not_ change the TypeScript type
// and so the new property `reportingURL` is not known
// to the type system:
bug.reportingURL;
Property 'reportingURL' does not exist on type 'BugReport'.
```































##

## 装饰器在 NestJS 中的应用
