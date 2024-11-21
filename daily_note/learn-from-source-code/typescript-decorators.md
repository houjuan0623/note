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

[上述代码对应的js可通过链接查看。](typescript-decorators.md#code-snippet-1-for-class-decorator)

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
bug.reportingURL; // Property 'reportingURL' does not exist on type 'BugReport'.


// !!! But in this case reportingURL is absolutely exists in bug object, because TypeScript cannot detect this situation, it throws an error.
```

[上述代码对应的js可通过链接查看。](typescript-decorators.md#code-snippet-2-for-class-decorator)

### Class Decorators in js <a href="#class-decorators" id="class-decorators"></a>

#### code snippet 1 for Class Decorator

```javascript
'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
function sealed(constructor) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}
let BugReport = class BugReport {
  constructor(t) {
    this.type = 'report';
    this.title = t;
  }
};
BugReport = __decorate([sealed], BugReport);
```

#### code snippet 2 for Class Decorator

```javascript
'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
function reportableClassDecorator(constructor) {
  return class extends constructor {
    constructor() {
      super(...arguments);
      this.reportingURL = 'http://www...';
    }
  };
}
let BugReport = class BugReport {
  constructor(t) {
    this.type = 'report';
    this.title = t;
  }
};
BugReport = __decorate([reportableClassDecorator], BugReport);
const bug = new BugReport('Needs dark mode');
console.log(bug.title); // Prints "Needs dark mode"
console.log(bug.type); // Prints "report"
// Note that the decorator _does not_ change the TypeScript type
// and so the new property `reportingURL` is not known
// to the type system:
// @ts-ignore
bug.reportingURL;
```

### Method Decorators <a href="#method-decorators" id="method-decorators"></a>

方法装饰器是在方法声明之前声明的。装饰器应用于该方法的 **属性描述符**，可用于观察、修改或替换方法定义。方法装饰器不能在声明文件、重载或任何其他环境上下文中（例如在 `declare` 类中）使用。

方法装饰器的表达式将在运行时作为函数调用，并带有以下三个参数：

* 对于静态成员，是类的构造函数；对于实例成员，是类的原型。
* 成员的名称。
* 成员的 **属性描述符**。

**注意**：如果你的脚本目标低于 ES5，则 `Property Descriptor` 将为 `undefined`。

如果方法装饰器返回一个值，它将被用作该方法的 `Property Descriptor`。

**注意**：如果你的脚本目标低于 ES5，则返回值将被忽略。

以下是在 `Greeter` 类的方法上应用方法装饰器（`@enumerable`）的示例：

```typescript
class Greeter {
  greeting: string;
  constructor(message: string) {
    this.greeting = message;
  }
 
  @enumerable(false)
  greet() {
    return "Hello, " + this.greeting;
  }
}
```

我们可以使用以下函数声明定义 `@enumerable` 装饰器：

```typescript
function enumerable(value: boolean) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    descriptor.enumerable = value;
  };
}
```

[上述代码对应的js可以通过链接查看。](typescript-decorators.md#method-decorators-in-js)

这里的 `@enumerable(false)` 装饰 1 器是一个 **装饰器工厂**。 当调用 `@enumerable(false)` 装饰器时，它会修改属性描述符的 `enumerable` 属性。

### Method Decorators in js

```javascript
'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
class Greeter {
  constructor(message) {
    this.greeting = message;
  }
  greet() {
    return 'Hello, ' + this.greeting;
  }
}
__decorate([enumerable(false)], Greeter.prototype, 'greet', null);
function enumerable(value) {
  return function (target, propertyKey, descriptor) {
    descriptor.enumerable = value;
  };
}
```

### Accessor Decorators <a href="#accessor-decorators" id="accessor-decorators"></a>

**访问器装饰器**是在访问器声明之前声明的。访问器装饰器应用于访问器的**属性描述符**，可用于观察、修改或替换访问器的定义。访问器装饰器不能在声明文件或任何其他环境上下文中（例如在 `declare` 类中）使用。

**注意**：TypeScript 不允许同时装饰单个成员的 `get` 和 `set` 访问器。相反，成员的所有装饰器必须应用于文档顺序中指定的第一个访问器（语法上不要既修饰get又修饰set，修饰第一个出现的访问器即会应用于该属性的get和set访问器）。这是因为装饰器应用于**属性描述符**，它结合了 `get` 和 `set` 访问器，而不是单独的每个声明。

访问器装饰器的表达式将在运行时作为函数调用，并带有以下三个参数：

* 对于静态成员，是类的构造函数；对于实例成员，是类的原型。
* 成员的名称。
* 成员的**属性描述符**。

**注意**：如果你的脚本目标低于 ES5，则**属性描述符**将为 `undefined`。

如果访问器装饰器返回一个值，它将被用作该成员的**属性描述符**。

**注意**：如果你的脚本目标低于 ES5，则返回值将被忽略。

以下是在 `Point` 类的成员上应用访问器装饰器（`@configurable`）的示例：

```typescript
class Point {
  private _x: number;
  private _y: number;
  constructor(x: number, y: number) {
    this._x = x;
    this._y = y;
  }
 
  @configurable(false)
  get x() {
    return this._x;
  }
 
  @configurable(false)
  get y() {
    return this._y;
  }
}
```

我们可以使用以下函数声明定义 `@configurable` 装饰器：

```typescript
function configurable(value: boolean) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescri   ptor) {
    descriptor.configurable = value;
  };
}
```

[上述代码对应的js可以通过链接查看。](typescript-decorators.md#accessor-decorators-1)

### Accessor Decorators in js <a href="#accessor-decorators" id="accessor-decorators"></a>

```javascript
'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
class Point {
  constructor(x, y) {
    this._x = x;
    this._y = y;
  }
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
}
__decorate([configurable(false)], Point.prototype, 'x', null);
__decorate([configurable(false)], Point.prototype, 'y', null);
function configurable(value) {
  return function (target, propertyKey, descriptor) {
    descriptor.configurable = value;
  };
}
```

### Property Decorators <a href="#property-decorators" id="property-decorators"></a>

**属性装饰器**是在属性声明之前声明的。属性装饰器不能在声明文件或任何其他环境上下文中（例如在 `declare` 类中）使用。

属性装饰器的表达式将在运行时作为函数调用，并带有以下两个参数：

* 对于静态成员，是类的构造函数；对于实例成员，是类的原型。
* 成员的名称。

**注意**：由于 TypeScript 中属性装饰器的初始化方式，因此不会将**属性描述符**作为参数提供给属性装饰器。这是因为当前没有机制在定义原型的成员时描述实例属性，也没有办法观察或修改属性的初始化器。返回值也会被忽略。因此，属性装饰器只能用于观察已为类声明了特定名称的属性。

我们可以使用此信息来记录有关属性的元数据，如以下示例所示：

```typescript
class Greeter {
  @format("Hello, %s")
  greeting: string;
  constructor(message: string) {
    this.greeting = message;
  }
  greet() {
    let formatString = getFormat(this, "greeting");
    return formatString.replace("%s", this.greeting);
  }
}
```

然后，我们可以使用以下函数声明定义 `@format` 装饰器和 `getFormat` 函数：

```typescript
import "reflect-metadata";
const formatMetadataKey = Symbol("format");
function format(formatString: string) {
  return Reflect.metadata(formatMetadataKey, formatString);
}
function getFormat(target: any, propertyKey: string) {
  return Reflect.getMetadata(formatMetadataKey, target, propertyKey);
}
```

[上述代码对应的js可通过链接查看。](typescript-decorators.md#property-decorators-1)

这里的 `@format("Hello, %s")` 装饰器是一个装饰器工厂。当调用 `@format("Hello, %s")` 时，它会使用 `reflect-metadata` 库中的 `Reflect.metadata` 函数为属性添加元数据条目。当调用 `getFormat` 时，它会读取格式的元数据值。  &#x20;

**注意**：此示例需要 `reflect-metadata` 库。有关 `reflect-metadata` 库的更多信息，请参阅**元数据**。

### Property Decorators in js <a href="#property-decorators" id="property-decorators"></a>

```javascript
'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
Object.defineProperty(exports, '__esModule', { value: true });
require('reflect-metadata');
class Greeter {
  constructor(message) {
    this.greeting = message;
  }
  greet() {
    let formatString = getFormat(this, 'greeting');
    return formatString.replace('%s', this.greeting);
  }
}
__decorate(
  [format('Hello, %s'), __metadata('design:type', String)],
  Greeter.prototype,
  'greeting',
  void 0,
);
const formatMetadataKey = Symbol('format');
function format(formatString) {
  return Reflect.metadata(formatMetadataKey, formatString);
}
function getFormat(target, propertyKey) {
  return Reflect.getMetadata(formatMetadataKey, target, propertyKey);
}
```

### Parameter Decorators <a href="#parameter-decorators" id="parameter-decorators"></a>

**参数装饰器**是在参数声明之前声明的。参数装饰器应用于类构造函数或方法声明的函数。参数装饰器不能在声明文件、重载或任何其他环境上下文中（例如在 `declare` 类中）使用。

参数装饰器的表达式将在运行时作为函数调用，并带有以下三个参数：

* 对于静态成员，是类的构造函数；对于实例成员，是类的原型。
* 成员的名称。
* 参数在函数参数列表中的序号索引。

**注意**：参数装饰器只能用于观察方法上已声明的参数。参数装饰器的返回值将被忽略。

以下是在 `BugReport` 类的成员的参数上应用参数装饰器（`@required`）的示例：

```typescript
class BugReport {
  type = "report";
  title: string;
 
  constructor(t: string) {
    this.title = t;
  }
 
  @validate
  print(@required verbose: boolean) {
    if (verbose) {
      return `type: ${this.type}\ntitle: ${this.title}`;
    } else {
     return this.title; 
    }
  }
}
```

然后，我们可以使用以下函数声明定义 `@required` 和 `@validate` 装饰器：

```typescript
import "reflect-metadata";
const requiredMetadataKey = Symbol("required");
 
function required(target: Object, propertyKey: string | symbol, parameterIndex: number) {
  let existingRequiredParameters: number[] = Reflect.getOwnMetadata(requiredMetadataKey, target, propertyKey) || [];
  existingRequiredParameters.push(parameterIndex);
  Reflect.defineMetadata( requiredMetadataKey, existingRequiredParameters, target, propertyKey);
}
 
function validate(target: any, propertyName: string, descriptor: TypedPropertyDescriptor<Function>) {
  let method = descriptor.value!;
 
  descriptor.value = function () {
    let requiredParameters: number[] = Reflect.getOwnMetadata(requiredMetadataKey, target, propertyName);
    if (requiredParameters) {
      for (let parameterIndex of requiredParameters) {
        if (parameterIndex >= arguments.length || arguments[parameterIndex] === undefined) {
          throw new Error("Missing required argument.");
        }
      }
    }
    return method.apply(this, arguments);
  };
}
```

[上述代码对应的js可通过链接查看。](typescript-decorators.md#parameter-decorators-1)

`@rquired` 装饰器添加一个元数据条目，将参数标记为必需。然后，`@validate` 装饰器将现有的 `print` 方法包装在一个函数中，该函数在调用原始方法之前验证参数。

**注意**：此示例需要 `reflect-metadata` 库。有关 `reflect-metadata` 库的更多信息，请参阅**元数据**。

### Parameter Decorators in js <a href="#parameter-decorators" id="parameter-decorators"></a>

```javascript
'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
Object.defineProperty(exports, '__esModule', { value: true });
require('reflect-metadata');
class BugReport {
  constructor(t) {
    this.type = 'report';
    this.title = t;
  }
  // @ts-ignore
  print(verbose) {
    if (verbose) {
      return `type: ${this.type}\ntitle: ${this.title}`;
    } else {
      return this.title;
    }
  }
}
__decorate(
  [
    validate,
    __param(0, required),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Boolean]),
    __metadata('design:returntype', void 0),
  ],
  BugReport.prototype,
  'print',
  null,
);
const requiredMetadataKey = Symbol('required');
function required(target, propertyKey, parameterIndex) {
  let existingRequiredParameters =
    Reflect.getOwnMetadata(requiredMetadataKey, target, propertyKey) || [];
  existingRequiredParameters.push(parameterIndex);
  Reflect.defineMetadata(
    requiredMetadataKey,
    existingRequiredParameters,
    target,
    propertyKey,
  );
}
function validate(target, propertyName, descriptor) {
  let method = descriptor.value;
  descriptor.value = function () {
    let requiredParameters = Reflect.getOwnMetadata(
      requiredMetadataKey,
      target,
      propertyName,
    );
    if (requiredParameters) {
      for (let parameterIndex of requiredParameters) {
        if (
          parameterIndex >= arguments.length ||
          arguments[parameterIndex] === undefined
        ) {
          throw new Error('Missing required argument.');
        }
      }
    }
    return method.apply(this, arguments);
  };
}
```

## 装饰器在 NestJS 中的应用

