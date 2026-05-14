# 定义与调用函数

## 基本定义

使用 `def` 关键字，后跟函数名、括号括起的参数列表和冒号。函数体缩进书写。

```python
def greet(name):
    print(f"你好，{name}！")

greet("Alice")  # 你好，Alice！
```

## 形参与实参

**位置参数**按从左到右的顺序匹配：

```python
def add(a, b):
    return a + b

result = add(3, 4)  # 7
```

**默认值**使参数变为可选：

```python
def power(base, exponent=2):
    return base ** exponent

power(3)     # 9（exponent 默认为 2）
power(3, 3)  # 27
```

**关键字参数**可以按名称以任意顺序传递：

```python
power(exponent=3, base=2)  # 8
```

## 返回值

`return` 退出函数并将值传回调用方。没有显式 `return` 的函数返回 `None`。

```python
def absolute(x):
    if x < 0:
        return -x
    return x
```

多个返回值以元组形式返回：

```python
def min_max(values):
    return min(values), max(values)

lo, hi = min_max([3, 1, 4, 1, 5])
```

## 作用域

![局部作用域与全局作用域](img/scope-diagram.svg)

函数内部定义的名称是**局部**的——在函数外不存在：

```python
def compute():
    result = 42   # 仅在 compute() 内部存在
    return result

compute()
print(result)  # NameError: name 'result' is not defined
```

在函数内读取模块级名称可直接使用；若要*重新赋值*，需用 `global` 声明：

```python
count = 0

def increment():
    global count
    count += 1
```

尽量避免使用 `global`——优先通过返回值让调用方更新状态。

## 文档字符串

将字符串字面量作为函数的第一条语句来为其编写文档：

```python
def add(a, b):
    """返回 a 与 b 的和。"""
    return a + b

help(add)  # 打印文档字符串
```
