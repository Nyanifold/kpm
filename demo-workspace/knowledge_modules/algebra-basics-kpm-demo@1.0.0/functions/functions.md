# Functions: Definition & Properties

## Definition

A **function** f from set A to set B, written `f : A → B`, is a rule that assigns to every element `x ∈ A` exactly one element `f(x) ∈ B`.

- **Domain**: the set A (valid inputs)
- **Codomain**: the set B (declared output type)
- **Range** (image): `{ f(x) | x ∈ A }` — the subset of B actually reached

Example: `f : ℝ → ℝ`, `f(x) = x²`  
Domain = ℝ, Codomain = ℝ, Range = [0, ∞)

![Function mapping domain to codomain](img/function-mapping.svg)

## Notation

| Notation | Meaning |
|----------|---------|
| `f(x)` | value of f at x |
| `f : A → B` | f maps A to B |
| `x ↦ x²` | the rule "square x" |

These are equivalent: `f(x) = x²` and `f : x ↦ x²`.

## Injectivity, Surjectivity, Bijectivity

**Injective** (one-to-one): distinct inputs give distinct outputs.  
`f(a) = f(b)  ⟹  a = b`

`f(x) = 2x` is injective. `f(x) = x²` over ℝ is not: `f(2) = f(−2) = 4`.

**Surjective** (onto): every element of the codomain is reached.  
`∀ y ∈ B, ∃ x ∈ A : f(x) = y`

`f(x) = x²` with codomain ℝ is not surjective (no x satisfies f(x) = −1). With codomain [0, ∞) it is surjective.

**Bijective**: both injective and surjective. A bijection has an inverse.

## Composition

Given `f : A → B` and `g : B → C`, the **composition** `g ∘ f : A → C` is:

```
(g ∘ f)(x) = g(f(x))
```

Example: `f(x) = x + 1`, `g(x) = x²`

```
(g ∘ f)(x) = (x + 1)²
(f ∘ g)(x) = x² + 1
```

Composition is associative: `h ∘ (g ∘ f) = (h ∘ g) ∘ f`.  
It is generally **not** commutative: `g ∘ f ≠ f ∘ g`.

## Inverse Functions

If f is bijective, the **inverse** `f⁻¹ : B → A` satisfies:

```
f⁻¹(f(x)) = x   for all x ∈ A
f(f⁻¹(y)) = y   for all y ∈ B
```

Example: `f(x) = 2x + 3`  
Solve `y = 2x + 3` for x: `x = (y − 3) / 2`  
So `f⁻¹(y) = (y − 3) / 2`.
