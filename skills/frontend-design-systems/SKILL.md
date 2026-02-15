---
name: Frontend Design Systems
description: >-
  This skill should be used when the user asks to "build a design system",
  "create consistent UI", "define color ratios", "set up typography system",
  "normalize geometry tokens", "validate visual hierarchy", "apply design
  constraints", or when generating frontend UI that requires systematic
  visual consistency. Augments the frontend-design skill with system-level
  visual decision rules for consistency, hierarchy, and scalable UI
  decision-making.
version: 0.1.0
inspired_by: https://www.youtube.com/watch?v=eVnQFWGDEdY
---

# Frontend Design Systems

## Purpose

Augment the `frontend-design` skill with system-level visual decision rules
derived from practical graphic design heuristics. Focus on consistency,
hierarchy, and scalable UI decision-making rather than aesthetic
experimentation.

Apply this skill *after* layout, accessibility, and interaction logic are
established by `frontend-design`.

## Core Principle

Design quality emerges from repeatable systems: ratios, constraints, typography
systems, geometry rules, and hierarchy validation.

Prefer deterministic structure over stylistic improvisation.

## Heuristics

### 1. Color Ratio System

Do not distribute colors evenly. Use proportional dominance:

- 70-90% neutral base
- 10-25% supporting color
- 1-8% accent color

Map accent color to: primary actions, alerts, focus states, brand signals. If
accent overuse occurs, reduce until hierarchy is restored.

### 2. Typography Superfamily Strategy

Default to a Single System: One Family, multiple Weights, Limited Width/Style
Variation.

Express hierarchy via: size, weight, spacing, rhythm.

Introduce additional typefaces only when semantic separation is required (e.g.,
code vs marketing content).

### 3. Geometry Consistency Rule

All UI must inherit a shared structural language: border radius, angle logic,
stroke thickness, elevation system, spacing cadence.

Do not introduce new geometry tokens unless:

- Existing tokens cannot express the requirement
- Functional clarity would otherwise degrade

Consistency > variety.

### 4. Dual-Scale Validation

Evaluate every interface at two levels:

**Macro (~10% scale):** Hierarchy clarity, scanning flow, section priority.

**Micro (~200-300% scale):** Spacing, alignment, typography precision, component
polish.

Reject designs that succeed at only one scale.

### 5. Constraint-First Brand Framing

Before generating UI styles, define negative constraints. Example:

- not playful
- not aggressive
- not corporate
- not experimental
- not premium
- not youthful

Use constraints to filter: color choices, typography decisions, motion styles,
component density. If a design decision conflicts with constraints, discard it.

### 6. Non-Designer Reality Bias

Assume users: are distracted, scroll quickly, use mobile, operate under low
brightness, do not analyze details.

Optimize for: instant comprehension, strong primary action visibility, minimal
cognitive load, clear visual hierarchy within <2 seconds.

Design for use, not inspection.

### 7. Repetition over Novelty

When uncertain: repeat existing visual rules, reinforce hierarchy, reduce
variation.

Allow novelty only after: clarity is achieved, hierarchy is stable, interaction
affordances are obvious.

## Integration Behavior

When layered after `frontend-design`:

1. Convert layout decisions into visual systems: derive color ratios, apply
   typography hierarchy, normalize geometry tokens.
2. Run constraint filtering before rendering UI variants.
3. Evaluate macro structure first, micro polish second.
4. Optimize for comprehension speed over stylistic uniqueness.
5. Prefer consistency, predictability, clarity, and restraint over visual
   experimentation.

## Failure Modes to Avoid

- Evenly distributed color usage
- Mixing multiple unrelated typefaces
- Inconsistent border radii and spacing logic
- Hierarchy visible only at high zoom
- Designing for designers instead of users
- Novelty introduced without structural justification

## Output Expectations

UI generated with this skill should feel: intentional, cohesive, restrained,
hierarchy-driven, fast to parse, and visually consistent across components and
pages.

Bias toward clarity and repetition until interaction goals are fully satisfied.
