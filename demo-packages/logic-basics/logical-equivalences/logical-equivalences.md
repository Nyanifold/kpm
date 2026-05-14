# Logical Equivalences

## Definition

Two propositions $p$ and $q$ are **logically equivalent**, written $p \equiv q$, if they have identical truth values for every possible assignment of their variables. Equivalently, $p \equiv q$ iff $p \leftrightarrow q$ is a tautology.

## Standard Equivalence Laws

### Identity Laws

$$p \land \top \equiv p \qquad p \lor \bot \equiv p$$

### Domination Laws

$$p \lor \top \equiv \top \qquad p \land \bot \equiv \bot$$

### Idempotent Laws

$$p \lor p \equiv p \qquad p \land p \equiv p$$

### Double Negation

$$\neg(\neg p) \equiv p$$

### Commutative Laws

$$p \lor q \equiv q \lor p \qquad p \land q \equiv q \land p$$

### Associative Laws

$$(p \lor q) \lor r \equiv p \lor (q \lor r)$$

$$(p \land q) \land r \equiv p \land (q \land r)$$

### Distributive Laws

$$p \land (q \lor r) \equiv (p \land q) \lor (p \land r)$$

$$p \lor (q \land r) \equiv (p \lor q) \land (p \lor r)$$

### De Morgan's Laws

$$\neg(p \land q) \equiv \neg p \lor \neg q$$

$$\neg(p \lor q) \equiv \neg p \land \neg q$$

De Morgan's laws are among the most frequently applied: negating a conjunction produces a disjunction of negations, and vice versa.

**Example.** Negate "It is raining and cold":

$$\neg(\text{rain} \land \text{cold}) \equiv \neg\text{rain} \lor \neg\text{cold}$$

"It is not raining or it is not cold."

### Absorption Laws

$$p \lor (p \land q) \equiv p \qquad p \land (p \lor q) \equiv p$$

### Negation Laws

$$p \lor \neg p \equiv \top \qquad p \land \neg p \equiv \bot$$

## Implication and Biconditional Reductions

Implication and biconditional can always be expressed using only $\neg$, $\land$, $\lor$:

$$p \to q \;\equiv\; \neg p \lor q$$

$$p \leftrightarrow q \;\equiv\; (p \to q) \land (q \to p) \;\equiv\; (p \land q) \lor (\neg p \land \neg q)$$

## Contrapositive, Converse, Inverse

Given the implication $p \to q$:

| Name | Form | Equivalent to original? |
|------|------|------------------------|
| Original | $p \to q$ | — |
| **Contrapositive** | $\neg q \to \neg p$ | Yes, $p \to q \equiv \neg q \to \neg p$ |
| Converse | $q \to p$ | No |
| Inverse | $\neg p \to \neg q$ | No (equivalent to converse) |

$$p \to q \;\equiv\; \neg q \to \neg p$$

**Example.** "If it rains, the ground is wet" has contrapositive "If the ground is not wet, it did not rain" — both say the same thing.

## Proving Equivalences

To prove $p \equiv q$, either:

1. **Build a truth table** and confirm both columns are identical.
2. **Apply known laws** in a chain of equivalence steps.

**Example** — prove $\neg(p \to q) \equiv p \land \neg q$:

$$\neg(p \to q) \equiv \neg(\neg p \lor q) \qquad \text{(implication reduction)}$$

$$\equiv \neg(\neg p) \land \neg q \qquad \text{(De Morgan)}$$

$$\equiv p \land \neg q \qquad \text{(double negation)}$$
