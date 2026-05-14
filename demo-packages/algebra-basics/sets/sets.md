# Set Notation & Operations

## Writing Sets

A set is written with curly braces. The **roster** (extension) form lists every element:

```
A = {1, 2, 3, 4, 5}
B = {2, 4, 6, 8, …}    (ellipsis indicates a pattern continues)
```

The **set-builder** (comprehension) form describes elements by a rule:

```
C = { x ∈ ℤ | x > 0 }   (all positive integers)
```

Order and repetition do not matter: `{1, 2, 3}` and `{3, 1, 2, 1}` describe the same set.

## Membership

`x ∈ A` means "x is an element of A".  
`x ∉ A` means "x is not an element of A".

```
3 ∈ {1, 2, 3}   ✓
5 ∉ {1, 2, 3}   ✓
```

## Special Sets

| Symbol | Name | Members |
|--------|------|---------|
| `∅` or `{}` | empty set | none |
| `ℕ` | natural numbers | 0, 1, 2, 3, … |
| `ℤ` | integers | …, −2, −1, 0, 1, 2, … |
| `ℚ` | rationals | all fractions p/q, q ≠ 0 |
| `ℝ` | real numbers | all points on the number line |

## Subsets

`A ⊆ B` means every element of A is also in B ("A is a subset of B").  
`A ⊂ B` means A ⊆ B and A ≠ B ("A is a proper subset of B").

```
{1, 2} ⊆ {1, 2, 3}   ✓
{1, 2} ⊂ {1, 2, 3}   ✓  (proper: the sets are not equal)
{1, 2} ⊆ {1, 2}      ✓  (every set is a subset of itself)
```

## Union and Intersection

**Union** `A ∪ B` — elements in A *or* B (or both):

```
{1, 2, 3} ∪ {3, 4, 5} = {1, 2, 3, 4, 5}
```

**Intersection** `A ∩ B` — elements in A *and* B:

```
{1, 2, 3} ∩ {3, 4, 5} = {3}
```

If `A ∩ B = ∅`, the sets are **disjoint** — they share no elements.

![Venn diagram: union and intersection](img/venn-diagram.svg)

## Complement

Given a universal set U, the **complement** of A is:

```
Aᶜ = { x ∈ U | x ∉ A }
```

Example with U = {1, 2, 3, 4, 5} and A = {1, 3, 5}:

```
Aᶜ = {2, 4}
```

## Cardinality

The **cardinality** `|A|` of a finite set is the number of elements:

```
|{a, b, c}| = 3
|∅|          = 0
```
