# Pointers & References

## What Is a Pointer?

A pointer is a variable that holds the **memory address** of another variable. Declare one with `*` after the type:

```cpp
int  value   = 42;
int* ptr     = &value;   // & gives the address of value

std::cout << ptr;    // prints the address, e.g. 0x7ffee4b2c8ac
std::cout << *ptr;   // dereferences: prints 42
```

`*ptr = 100;` writes through the pointer, changing `value` to `100`.

![Pointer pointing to a value in memory](img/pointer-diagram.svg)

## Null Pointers

A pointer that holds no valid address should be set to `nullptr`:

```cpp
int* p = nullptr;

if (p != nullptr) {
    std::cout << *p;   // safe only if p is non-null
}
```

Dereferencing a null pointer is undefined behaviour and typically crashes the program.

## References

A reference is an alias for an existing variable. Unlike a pointer, a reference:

- must be initialised at declaration
- cannot be reseated to refer to a different variable
- does not require `*` to access the value

```cpp
int  x = 10;
int& ref = x;

ref = 20;           // x is now 20
std::cout << x;     // 20
```

References are the preferred way to pass large objects to functions without copying:

```cpp
void double_it(int& n) {
    n *= 2;
}

int val = 5;
double_it(val);
std::cout << val;   // 10
```

## Stack vs. Heap

| | Stack | Heap |
|---|---|---|
| Allocation | automatic (variable declaration) | manual (`new`) |
| Lifetime | ends when scope exits | until `delete` |
| Size | limited (~1–8 MB) | limited by available RAM |
| Speed | very fast | slower (allocator overhead) |

![Stack and heap memory layout](img/memory-layout.svg)

```cpp
// Stack
int stack_var = 7;           // freed automatically

// Heap
int* heap_var = new int(7);  // must be freed explicitly
delete heap_var;
heap_var = nullptr;
```

## RAII and Smart Pointers

Manual `new`/`delete` is error-prone. The modern C++ idiom is **RAII**: resource lifetime is tied to an object's lifetime. Use smart pointers from `<memory>`:

```cpp
#include <memory>

auto p = std::make_unique<int>(42);   // freed automatically when p goes out of scope
std::cout << *p;                       // 42
```

`std::unique_ptr` models exclusive ownership. `std::shared_ptr` allows shared ownership with reference counting. Prefer these over raw `new`.
