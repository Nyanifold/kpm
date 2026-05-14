# Variables & Types

## The Compilation Model

C++ source files are compiled to machine code before execution. The compiler checks types at compile time, catching many errors before the program ever runs.

```
source.cpp  →  [compiler]  →  object.o  →  [linker]  →  executable
```

![C++ compilation pipeline](img/compilation-model.svg)

A minimal C++ program:

```cpp
#include <iostream>

int main() {
    std::cout << "Hello, world!\n";
    return 0;
}
```

## Declaring Variables

Every variable must be declared with an explicit type:

```cpp
int    age    = 30;
double height = 1.72;
bool   active = true;
char   grade  = 'A';
```

Since C++11, `auto` lets the compiler deduce the type from the initialiser:

```cpp
auto x = 42;        // int
auto y = 3.14;      // double
auto s = "hello";   // const char*
```

Always initialise variables. Reading an uninitialised variable is **undefined behaviour**.

## Fundamental Types

| Type | Size (typical) | Range |
|------|---------------|-------|
| `bool` | 1 byte | `true` / `false` |
| `char` | 1 byte | −128 … 127 |
| `int` | 4 bytes | −2 147 483 648 … 2 147 483 647 |
| `long long` | 8 bytes | ±9.2 × 10¹⁸ |
| `float` | 4 bytes | ~7 significant digits |
| `double` | 8 bytes | ~15 significant digits |

Use `<cstdint>` types (`int32_t`, `uint64_t`, …) when the exact width matters.

## `const` and `constexpr`

`const` marks a variable as immutable after initialisation:

```cpp
const double PI = 3.141592653589793;
```

`constexpr` requires the value to be known at compile time:

```cpp
constexpr int MAX_SIZE = 1024;
```

Prefer `constexpr` over preprocessor macros for named constants.

## Type Conversion

Implicit conversions can silently lose precision. Prefer explicit casts:

```cpp
double d = 9.9;
int    i = static_cast<int>(d);   // 9 — truncates, no surprise
```
