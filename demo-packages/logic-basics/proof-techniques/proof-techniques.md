# Proof Techniques

## What Is a Proof?

A **proof** is a finite sequence of statements, each either an axiom or derived from earlier statements by a valid inference rule, ending in the theorem to be established.

The goal is to show that a conclusion follows **necessarily** from the hypotheses — not just that it seems plausible.

## Direct Proof

To prove $p \to q$ directly:

1. Assume $p$ is true.
2. Use definitions, axioms, and previously proved results to derive $q$.

**Example.** Prove: if $n$ is odd, then $n^2$ is odd.

*Proof.* Assume $n$ is odd. Then $n = 2k + 1$ for some integer $k$.

$$n^2 = (2k+1)^2 = 4k^2 + 4k + 1 = 2(2k^2 + 2k) + 1$$

Since $2k^2 + 2k$ is an integer, $n^2$ has the form $2m + 1$ and is therefore odd. $\blacksquare$

## Proof by Contrapositive

To prove $p \to q$, prove the logically equivalent contrapositive $\neg q \to \neg p$.

**Example.** Prove: if $n^2$ is even, then $n$ is even.

*Proof.* Assume $n$ is odd (i.e., $\neg q$). By the previous example, $n^2$ is odd ($\neg p$). Therefore, by contrapositive, if $n^2$ is even then $n$ is even. $\blacksquare$

## Proof by Contradiction (Reductio ad Absurdum)

To prove $p$:

1. Assume $\neg p$.
2. Derive a contradiction — a statement of the form $q \land \neg q$.
3. Conclude $p$ must be true.

This works because $\neg p \to \bot$ is logically equivalent to $p$.

**Example.** Prove $\sqrt{2}$ is irrational.

*Proof.* Assume $\sqrt{2}$ is rational. Then $\sqrt{2} = \dfrac{a}{b}$ with $a, b \in \mathbb{Z}$, $b \neq 0$, and $\gcd(a, b) = 1$.

$$2 = \frac{a^2}{b^2} \implies a^2 = 2b^2$$

So $a^2$ is even, hence $a$ is even (from the contrapositive example above). Write $a = 2c$.

$$4c^2 = 2b^2 \implies b^2 = 2c^2$$

So $b^2$ is even, hence $b$ is even. But then $2 \mid a$ and $2 \mid b$, contradicting $\gcd(a,b)=1$. $\blacksquare$

## Proof by Cases (Exhaustion)

When the hypothesis can be divided into finitely many cases, prove each case separately.

**Example.** Prove: for every integer $n$, $n^2 + n$ is even.

*Proof.* Every integer is either even or odd.

**Case 1:** $n = 2k$. Then $n^2 + n = 4k^2 + 2k = 2(2k^2 + k)$, which is even.

**Case 2:** $n = 2k+1$. Then $n^2 + n = 4k^2+4k+1+2k+1 = 4k^2+6k+2 = 2(2k^2+3k+1)$, which is even.

In both cases $n^2 + n$ is even. $\blacksquare$

## Proof by Mathematical Induction

To prove $P(n)$ for all integers $n \geq n_0$:

1. **Base case:** Prove $P(n_0)$.
2. **Inductive step:** Assume $P(k)$ (the **inductive hypothesis**); prove $P(k+1)$.

The principle rests on the well-ordering of $\mathbb{N}$: if there were a smallest counterexample, the base case and inductive step would jointly produce a contradiction.

**Example.** Prove: $\displaystyle\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$ for all $n \geq 1$.

*Proof.*

**Base case** ($n = 1$): $\displaystyle\sum_{i=1}^{1} i = 1 = \frac{1 \cdot 2}{2}$. ✓

**Inductive step:** Assume $\displaystyle\sum_{i=1}^{k} i = \frac{k(k+1)}{2}$. Then:

$$\sum_{i=1}^{k+1} i = \left(\sum_{i=1}^{k} i\right) + (k+1) = \frac{k(k+1)}{2} + (k+1) = \frac{k(k+1) + 2(k+1)}{2} = \frac{(k+1)(k+2)}{2}$$

This is the formula with $n = k+1$. By induction the formula holds for all $n \geq 1$. $\blacksquare$

## Strong Induction

The inductive hypothesis is strengthened: assume $P(n_0), P(n_0+1), \ldots, P(k)$ all hold, then prove $P(k+1)$.

Strong induction is equivalent to ordinary induction but is more convenient when $P(k+1)$ depends on earlier cases beyond $P(k)$.

**Example.** Every integer $n \geq 2$ has a prime factorisation.

*Proof.* Base case $n = 2$: 2 is prime, so it is its own factorisation.

Inductive step: Assume every integer from 2 to $k$ has a prime factorisation. Consider $k+1$:
- If $k+1$ is prime, it is its own factorisation.
- If $k+1$ is composite, write $k+1 = ab$ with $2 \leq a, b < k+1$. By the strong inductive hypothesis both $a$ and $b$ have prime factorisations; their product gives one for $k+1$.

By strong induction, every integer $n \geq 2$ has a prime factorisation. $\blacksquare$

## Choosing a Strategy

| Situation | Suggested approach |
|-----------|-------------------|
| Straightforward algebraic manipulation | Direct proof |
| "$p \to q$" and negating $q$ is more natural | Contrapositive |
| Claim seems hard to attack directly | Contradiction |
| Hypothesis splits into distinct subcases | Cases |
| Statement holds for all natural numbers | Induction / Strong induction |
