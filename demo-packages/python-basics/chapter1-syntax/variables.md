# Variables & Data Types

## Assigning Variables

In Python, you create a variable by assigning a value to a name. No declaration or type annotation is required.

```python
name = "Alice"
age = 30
height = 1.72
is_student = False
```

Variable names must start with a letter or underscore and may contain letters, digits, and underscores. By convention, use `snake_case`.

## Built-in Types

| Type | Example | Notes |
|------|---------|-------|
| `int` | `42`, `-7` | arbitrary precision |
| `float` | `3.14`, `-0.5` | IEEE 754 double |
| `str` | `"hello"`, `'world'` | immutable, Unicode |
| `bool` | `True`, `False` | subclass of `int` |
| `NoneType` | `None` | the null value |

![Python built-in type hierarchy](img/type-hierarchy.svg)

Use `type()` to inspect a value's type at runtime:

```python
print(type(42))       # <class 'int'>
print(type("hello"))  # <class 'str'>
```

## Type Conversion

Python does not implicitly convert between types. Use explicit constructors:

```python
x = int("10")     # 10
y = float(3)      # 3.0
z = str(100)      # "100"
```

Passing an incompatible value raises a `ValueError`:

```python
int("abc")  # ValueError: invalid literal for int() with base 10: 'abc'
```

## Multiple Assignment

Python allows assigning several variables in one statement:

```python
a, b, c = 1, 2, 3
x = y = z = 0      # all three point to the same object
```

## Constants

Python has no built-in `const` keyword. By convention, module-level names written in `ALL_CAPS` are treated as constants and should not be reassigned:

```python
MAX_RETRIES = 5
PI = 3.141592653589793
```
