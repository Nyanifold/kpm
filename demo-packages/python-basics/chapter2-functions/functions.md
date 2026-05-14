# Defining & Calling Functions

## Basic Definition

Use the `def` keyword, followed by the function name, a parenthesised parameter list, and a colon. The body is indented.

```python
def greet(name):
    print(f"Hello, {name}!")

greet("Alice")  # Hello, Alice!
```

## Parameters & Arguments

**Positional arguments** are matched left-to-right:

```python
def add(a, b):
    return a + b

result = add(3, 4)  # 7
```

**Default values** make a parameter optional:

```python
def power(base, exponent=2):
    return base ** exponent

power(3)     # 9  (exponent defaults to 2)
power(3, 3)  # 27
```

**Keyword arguments** let you pass values by name in any order:

```python
power(exponent=3, base=2)  # 8
```

## Return Values

`return` exits the function and passes a value back to the caller. A function without an explicit `return` returns `None`.

```python
def absolute(x):
    if x < 0:
        return -x
    return x
```

Multiple values are returned as a tuple:

```python
def min_max(values):
    return min(values), max(values)

lo, hi = min_max([3, 1, 4, 1, 5])
```

## Scope

![Local vs. global scope](img/scope-diagram.svg)

Names defined inside a function are **local** — they do not exist outside it:

```python
def compute():
    result = 42   # local to compute()
    return result

compute()
print(result)  # NameError: name 'result' is not defined
```

To read a module-level name inside a function, just use it. To *reassign* it, declare it with `global`:

```python
count = 0

def increment():
    global count
    count += 1
```

Avoid `global` when possible — prefer returning values and letting the caller update state.

## Docstrings

Document a function with a string literal as its first statement:

```python
def add(a, b):
    """Return the sum of a and b."""
    return a + b

help(add)  # prints the docstring
```
