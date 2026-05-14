# Propositional Logic

## Propositions

A **proposition** is a declarative statement that is either true or false, never both.

```
"2 + 2 = 4"          ✓  (true proposition)
"Paris is in Spain"  ✓  (false proposition)
"x > 5"              ✗  (not a proposition — truth depends on x)
"Close the door!"    ✗  (not a proposition — commands have no truth value)
```

Propositions are typically denoted by lowercase letters: $p, q, r, \ldots$

## Logical Connectives

New propositions are built from existing ones using **connectives**:

| Symbol | Name | Read as |
|--------|------|---------|
| $\neg$ | negation | "not" |
| $\land$ | conjunction | "and" |
| $\lor$ | disjunction | "or" |
| $\to$ | implication | "if … then …" |
| $\leftrightarrow$ | biconditional | "if and only if" |

## Truth Tables

A **truth table** lists every possible truth-value assignment and the resulting value of the compound proposition.

### Negation $\neg p$

| $p$ | $\neg p$ |
|-----|----------|
| T   | F        |
| F   | T        |

### Conjunction $p \land q$

| $p$ | $q$ | $p \land q$ |
|-----|-----|-------------|
| T   | T   | T           |
| T   | F   | F           |
| F   | T   | F           |
| F   | F   | F           |

$p \land q$ is true only when **both** $p$ and $q$ are true.

### Disjunction $p \lor q$

| $p$ | $q$ | $p \lor q$ |
|-----|-----|------------|
| T   | T   | T          |
| T   | F   | T          |
| F   | T   | T          |
| F   | F   | F          |

$p \lor q$ is false only when **both** $p$ and $q$ are false. This is the *inclusive or*.

### Implication $p \to q$

| $p$ | $q$ | $p \to q$ |
|-----|-----|-----------|
| T   | T   | T         |
| T   | F   | F         |
| F   | T   | T         |
| F   | F   | T         |

$p \to q$ is false only when $p$ is true and $q$ is false. When $p$ is false the implication is **vacuously true** — a false hypothesis cannot invalidate the promise.

- $p$ is called the **hypothesis** (antecedent)
- $q$ is called the **conclusion** (consequent)

Common readings: "$p$ implies $q$", "$p$ only if $q$", "$q$ whenever $p$".

### Biconditional $p \leftrightarrow q$

| $p$ | $q$ | $p \leftrightarrow q$ |
|-----|-----|-----------------------|
| T   | T   | T                     |
| T   | F   | F                     |
| F   | T   | F                     |
| F   | F   | T                     |

$p \leftrightarrow q$ is true exactly when $p$ and $q$ have the **same truth value**. It is equivalent to $(p \to q) \land (q \to p)$.

## Tautologies, Contradictions, Contingencies

| Class | Definition | Example |
|-------|-----------|---------|
| **Tautology** | true for every assignment | $p \lor \neg p$ |
| **Contradiction** | false for every assignment | $p \land \neg p$ |
| **Contingency** | true for some, false for others | $p \land q$ |

A tautology is denoted $\top$; a contradiction $\bot$.

## Operator Precedence

From highest to lowest:

1. $\neg$
2. $\land$
3. $\lor$
4. $\to$
5. $\leftrightarrow$

So $\neg p \lor q \to r$ parses as $\bigl((\neg p) \lor q\bigr) \to r$.

## Logical Consequence

A proposition $q$ is a **logical consequence** of $p$ (written $p \models q$) if every assignment making $p$ true also makes $q$ true.

$$p \land q \;\models\; p \qquad \text{(conjunction elimination)}$$

$$p \;\models\; p \lor q \qquad \text{(disjunction introduction)}$$
