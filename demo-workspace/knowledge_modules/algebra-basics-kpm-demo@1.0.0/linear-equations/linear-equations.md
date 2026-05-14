# Solving Linear Equations

## One Variable

A linear equation in one variable has the form `ax + b = 0` where `a ≠ 0`.

**Strategy:** isolate the variable by applying the same operation to both sides.

```
3x + 6 = 0
3x     = −6     (subtract 6)
x      = −2     (divide by 3)
```

Verify: `3(−2) + 6 = −6 + 6 = 0` ✓

**Edge cases:**
- `0x = 0` — infinitely many solutions (every real number is a solution)
- `0x = 5` — no solution (a contradiction)

## Two Variables

A linear equation in two variables, `ax + by = c`, defines a straight line in the plane. Infinitely many pairs `(x, y)` satisfy it.

To find a particular point, substitute any value of x and solve for y:

```
2x + y = 5

Let x = 1:  2(1) + y = 5  →  y = 3    solution: (1, 3)
Let x = 0:  2(0) + y = 5  →  y = 5    solution: (0, 5)
```

## Systems of Two Equations

Two linear equations in two unknowns:

```
2x +  y = 5   … (1)
 x − 2y = 0   … (2)
```

**Substitution method:** solve one equation for one variable, substitute into the other.

From (2): `x = 2y`  
Substitute into (1): `2(2y) + y = 5` → `5y = 5` → `y = 1`  
Back-substitute: `x = 2(1) = 2`

Solution: `(x, y) = (2, 1)`

**Elimination method:** scale equations so one variable cancels.

Multiply (2) by 2: `2x − 4y = 0`  
Subtract from (1): `(2x + y) − (2x − 4y) = 5 − 0` → `5y = 5` → `y = 1`

## Geometric Interpretation

Each linear equation in two variables is a line. A system's solution is the intersection point.

| Number of solutions | Geometric picture |
|--------------------|-------------------|
| Exactly one | Lines intersect at one point |
| Infinitely many | Lines are identical (same equation) |
| None | Lines are parallel (never meet) |

![Three cases: intersecting, identical, and parallel lines](img/two-lines.svg)

Two lines are parallel when their slopes are equal but their y-intercepts differ.  
`ax + by = c` has slope `−a/b` (when `b ≠ 0`).
