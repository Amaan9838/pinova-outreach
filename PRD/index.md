Pinova Outreach Engine v2
Master PRD – Table of Contents

Below is the complete structure of the PRD we will build.

Nothing missing.

SECTION 0 — Vision & Constraints

0.1 System Objective
0.2 Non-Negotiable Architectural Rules
0.3 Deliverability-First Philosophy
0.4 Timezone & US Delivery Strategy (India → US)
0.5 What This System Is NOT

SECTION 1 — Core Architecture

1.1 High-Level System Overview
1.2 Single Scheduler Design
1.3 Single State Machine Principle
1.4 One Mailbox Per Campaign Constraint
1.5 Service Boundaries
1.6 Allowed Mutation Points

SECTION 2 — Data Models (MongoDB)

2.1 Campaign Schema (v2)
2.2 Lead Runtime Schema (CampaignProspect v2)
2.3 Message Schema
2.4 Mailbox Schema Constraints
2.5 EngineLog Schema
2.6 Indexing Strategy
2.7 Data Integrity Rules

SECTION 3 — Scheduling & Timing System

3.1 nextActionAt as Single Timing Authority
3.2 Cron Design (/api/cron/outreach-engine)
3.3 Locking Mechanism
3.4 Retry Backoff Strategy
3.5 Follow-up Spacing Logic (Shrinking vs Expanding Clarified)
3.6 Cooling-Off Cycles
3.7 Business Hours Enforcement (US Timezone Safe Sending)
3.8 Daily / Hourly Send Limits
3.9 Anti-Spam Burst Control

SECTION 4 — State Machine Design

4.1 Allowed States
4.2 State Transition Table
4.3 State Transition Rules
4.4 Hard Stop Conditions
4.5 Failure Handling States
4.6 Bounce Handling
4.7 Manual Pause / Resume

SECTION 5 — Angle Rotation System (Per Campaign)

5.1 Campaign-Level Angle Definition
5.2 Angle Ordering Strategy
5.3 Deterministic Rotation Formula
5.4 Escalation Model
5.5 Preventing Repetition
5.6 Angle + Open vs No-Open Branching
5.7 Angle Reset After Cooling Period

SECTION 6 — AI Integration Layer

6.1 AI Role Definition (Structured Generator, Not Writer)
6.2 Input Contract to AI
6.3 Output Contract from AI
6.4 Follow-up Fallback Logic
6.5 Reply Classification Structure
6.6 Objection Handling Mode
6.7 Memory Handling (aiMemory object)
6.8 Spam-Safe Prompt Constraints

SECTION 7 — Email Sending System

7.1 SMTP Service Contract
7.2 Structured Send Response
7.3 Error Handling Rules
7.4 No Silent Failures Rule
7.5 Threading & Message-ID Handling
7.6 Tracking Pixel Strategy
7.7 Plain-Text Bias for Deliverability

SECTION 8 — IMAP & Reply Handling

8.1 Reply Detection Architecture
8.2 Thread Matching Rules
8.3 Bounce Detection Rules
8.4 Reply Event → Engine Trigger Flow
8.5 No Direct State Mutation Rule

SECTION 9 — API Layer & Backend Contracts

(New — critical)

9.1 Campaign APIs
9.2 Lead Management APIs
9.3 Activation / Pause APIs
9.4 Settings APIs
9.5 Engine Trigger APIs
9.6 Validation Rules
9.7 Permission Boundaries

SECTION 10 — Frontend Architecture

10.1 Campaign Creation Flow
10.2 Angle Configuration UI
10.3 Deliverability Settings UI
10.4 Lead Import UX
10.5 Campaign Activation UX
10.6 Lead Debug View
10.7 Engine Logs Viewer
10.8 Manual Stop / Resume
10.9 UI Constraints (What UI is NOT allowed to do)

SECTION 11 — Observability & Debugging

11.1 EngineLog System
11.2 Lead Lifecycle Auditability
11.3 Failure Visibility
11.4 Admin Debug Dashboard Requirements
11.5 Metrics (Single Source of Truth)

SECTION 12 — Migration Plan (From Current Chaos)

12.1 Feature Flag Strategy (useV2Engine)
12.2 Parallel Execution Phase
12.3 Data Cleanup Rules
12.4 Legacy Engine Shutdown Order
12.5 Production Rollout Plan

SECTION 13 — Acceptance Criteria

13.1 Functional Criteria
13.2 Deliverability Criteria
13.3 Stability Criteria
13.4 Scale Criteria




























