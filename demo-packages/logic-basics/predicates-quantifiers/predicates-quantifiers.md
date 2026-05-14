# Predicates & Quantifiers

## Predicates

A **predicate** (propositional function) is a statement containing one or more variables that becomes a proposition once those variables are assigned values.

$$P(x) = \text{"x is greater than 3"}$$

- $P(4)$ is true; $P(2)$ is false.

A predicate $P(x_1, x_2, \ldots, x_n)$ with $n$ variables is called an $n$-place predicate or $n$-ary predicate.

## Domain of Discourse

The **domain** (universe of discourse) is the set of values a variable may take. The truth of a quantified statement depends on the domain.

$P(x) = \text{"x is even"}$ is true for all $x$ in $\{2, 4, 6\}$ but not in $\mathbb{Z}$.

## Universal Quantifier

$$\forall x \, P(x)$$

Read: "for all $x$, $P(x)$" — $P(x)$ holds for **every** element in the domain.

$$\forall x \, P(x) \text{ is true} \iff P(a) \text{ is true for every } a \text{ in the domain}$$

A single **counterexample** suffices to disprove $\forall x \, P(x)$.

**Example.** Domain $= \mathbb{Z}$, $P(x) = (x^2 \geq 0)$: $\forall x \, P(x)$ is true.

## Existential Quantifier

$$\exists x \, P(x)$$

Read: "there exists an $x$ such that $P(x)$" — $P(x)$ holds for **at least one** element.

$$\exists x \, P(x) \text{ is true} \iff P(a) \text{ is true for some } a \text{ in the domain}$$

**Example.** Domain $= \mathbb{Z}$, $Q(x) = (x^2 = 2)$: $\exists x \, Q(x)$ is false (no integer squares to 2).

## Uniqueness Quantifier

$$\exists! \, x \, P(x)$$

Read: "there exists a **unique** $x$ such that $P(x)$" — exactly one element satisfies $P$.

$$\exists!\, x \, P(x) \;\equiv\; \exists x \bigl(P(x) \land \forall y\,(P(y) \to y = x)\bigr)$$

## Negating Quantifiers

| Statement | Negation |
|-----------|---------|
| $\forall x \, P(x)$ | $\exists x \, \neg P(x)$ |
| $\exists x \, P(x)$ | $\forall x \, \neg P(x)$ |

These are the quantifier analogues of De Morgan's laws.

**Example.** Negate "every student passed":

$$\neg\bigl(\forall x \, \text{Passed}(x)\bigr) \equiv \exists x \, \neg\text{Passed}(x)$$

"Some student did not pass."

## Nested Quantifiers

Quantifiers may be nested. The **order matters** when quantifiers differ.

$$\forall x \, \exists y \, (y > x) \qquad \text{domain } \mathbb{R}: \text{ true (for any x, take y = x+1)}$$

$$\exists y \, \forall x \, (y > x) \qquad \text{domain } \mathbb{R}: \text{ false (no single y exceeds all reals)}$$

### Negating Nested Quantifiers

Negate from the outside in, flipping each quantifier:

$$\neg\,\forall x \, \exists y \, P(x,y) \;\equiv\; \exists x \, \forall y \, \neg P(x,y)$$

**Example.** "Every person has a best friend" $= \forall x \, \exists y \, \text{BestFriend}(x, y)$.

Negation: $\exists x \, \forall y \, \neg\text{BestFriend}(x, y)$ — "Some person has no best friend."

## Bound and Free Variables

In $\forall x \, P(x, y)$:

- $x$ is **bound** by the quantifier $\forall x$
- $y$ is **free** — the expression is a predicate in $y$, not a proposition

A formula with no free variables is a proposition and has a definite truth value (given a domain).
