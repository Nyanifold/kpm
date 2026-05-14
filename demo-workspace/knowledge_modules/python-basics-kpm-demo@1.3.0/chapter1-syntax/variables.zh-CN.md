# 变量与数据类型

## 赋值变量

在 Python 中，通过将值赋给名称来创建变量，无需声明或类型注解。

```python
name = "Alice"
age = 30
height = 1.72
is_student = False
```

变量名必须以字母或下划线开头，可包含字母、数字和下划线。按惯例使用 `snake_case` 命名风格。

## 内置类型

| 类型 | 示例 | 备注 |
|------|------|------|
| `int` | `42`, `-7` | 任意精度整数 |
| `float` | `3.14`, `-0.5` | IEEE 754 双精度浮点 |
| `str` | `"hello"`, `'world'` | 不可变，Unicode |
| `bool` | `True`, `False` | `int` 的子类 |
| `NoneType` | `None` | 空值 |

![Python 内置类型层次结构](img/type-hierarchy.svg)

使用 `type()` 在运行时检查值的类型：

```python
print(type(42))       # <class 'int'>
print(type("hello"))  # <class 'str'>
```

## 类型转换

Python 不会隐式转换类型，需使用显式构造函数：

```python
x = int("10")     # 10
y = float(3)      # 3.0
z = str(100)      # "100"
```

传入不兼容的值会抛出 `ValueError`：

```python
int("abc")  # ValueError: invalid literal for int() with base 10: 'abc'
```

## 多重赋值

Python 允许在一条语句中赋值多个变量：

```python
a, b, c = 1, 2, 3
x = y = z = 0      # 三个变量指向同一对象
```

## 常量

Python 没有内置的 `const` 关键字。按惯例，模块级全大写名称被视为常量，不应重新赋值：

```python
MAX_RETRIES = 5
PI = 3.141592653589793
```
