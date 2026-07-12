# 🏗️ Co-op Buy System Architecture
## Complete System Design with Data Flows & Agent Interactions

**Last Updated:** 2026-07-11  
**System Name:** Mulberry Co-op Buy Ecosystem  
**Version:** 1.0 (MVP)

---

## 📐 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MULBERRY CO-OP BUY ECOSYSTEM                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐                                                  │
│  │  USER LAYER  │                                                  │
│  ├──────────────┤                                                  │
│  │ • Humans     │                                                  │
│  │ • Agents     │                                                  │
│  │ • Mixed      │                                                  │
│  └──────┬───────┘                                                  │
│         │                                                          │
│         ↓                                                          │
│  ┌──────────────────────────────────────────────────────┐          │
│  │         LUNA SEARCH ENGINE & INTENT RECOGNITION      │          │
│  ├──────────────────────────────────────────────────────┤          │
│  │ • Natural language parsing                           │          │
│  │ • Intent classification (help, buy, share, emergency)│          │
│  │ • Resonance AI preprocessing                         │          │
│  └──────┬───────────────────────────────────────────────┘          │
│         │                                                          │
│         ↓                                                          │
│  ┌──────────────────────────────────────────────────────┐          │
│  │      MULTI-AGENT ORCHESTRATION LAYER                │          │
│  ├──────────────────────────────────────────────────────┤          │
│  │                                                      │          │
│  │  ┌──────────────┐  ┌──────────────┐                 │          │
│  │  │  PERCEPTION  │  │  NEGOTIATION │                 │          │
│  │  │   LAYER      │  │    LAYER     │                 │          │
│  │  ├──────────────┤  ├──────────────┤                 │          │
│  │  │ Image Agent  │  │ Negotiator-1 │ (A↔A)          │          │
│  │  │ Music Agent  │  │ Negotiator-2 │ (A↔H)          │          │
│  │  └──────────────┘  │ Negotiator-3 │ (H↔H)          │          │
│  │                    └──────────────┘                 │          │
│  │                                                      │          │
│  │  ┌──────────────┐  ┌──────────────┐                 │          │
│  │  │   PAYMENT    │  │   VALIDATION │                 │          │
│  │  │    LAYER     │  │     LAYER    │                 │          │
│  │  ├──────────────┤  ├──────────────┤                 │          │
│  │  │ Payment-A2A  │  │  RyuWon      │ (HARM)          │          │
│  │  │ Payment-AH   │  │  AI Aurora   │ (Insights)      │          │
│  │  │ Payment-HH   │  │  Lynn        │ (Analytics)     │          │
│  │  └──────────────┘  └──────────────┘                 │          │
│  │                                                      │          │
│  │  ┌──────────────────────────────────────────────┐   │          │
│  │  │     PERFORMANCE & OPTIMIZATION LAYER         │   │          │
│  │  ├──────────────────────────────────────────────┤   │          │
│  │  │ • Jr. Agent Performance-1: System metrics    │   │          │
│  │  │ • Real-time cost optimization               │   │          │
│  │  │ • Bottleneck detection                      │   │          │
│  │  └──────────────────────────────────────────────┘   │          │
│  │                                                      │          │
│  └──────┬───────────────────────────────────────────────┘          │
│         │                                                          │
│         ↓                                                          │
│  ┌──────────────────────────────────────────────────────┐          │
│  │       SETTLEMENT & LEDGER LAYER                     │          │
│  ├──────────────────────────────────────────────────────┤          │
│  │ • Distributed ledger (blockchain or traditional DB) │          │
│  │ • Transaction finality (atomic settlement)          │          │
│  │ • Audit trail & transparency                        │          │
│  └──────┬───────────────────────────────────────────────┘          │
│         │                                                          │
│         ↓                                                          │
│  ┌──────────────────────────────────────────────────────┐          │
│  │         ANALYTICS & FEEDBACK LAYER                  │          │
│  ├──────────────────────────────────────────────────────┤          │
│  │ • Performance dashboards                            │          │
│  │ • Community impact metrics                          │          │
│  │ • Trust score evolution                             │          │
│  │ • Resonance AI feedback signals                     │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Transaction Flow: Step-by-Step

### **Stage 1: Intent Recognition & Search**

```
USER (Human or Agent)
   │
   ├─ Input: "이웃을 돕고 싶어요" / "식품을 구매하고 싶어요" / etc.
   │
   ↓
LUNA (Search Engine & Intent Recognizer)
   │
   ├─ Process: NLP → Intent Classification → Context Extraction
   │
   ├─ Output: 
   │  {
   │    "intent_type": "help" | "buy" | "share" | "emergency",
   │    "confidence": 0.95,
   │    "extracted_needs": ["rice", "eggs", "vegetables"],
   │    "user_profile": { ... },
   │    "resonance_baseline": { ... }
   │  }
   │
   └─ Route to: Multi-Agent Orchestration Layer
```

---

### **Stage 2: Perception & Quality Assessment**

```
PERCEPTION AGENTS receive intent context
   │
   ├─ Image Agent (if product images provided)
   │  ├─ Analyze: quality, freshness, origin, authenticity
   │  └─ Output: { quality_score: 0.92, certifications: [...] }
   │
   └─ Music Agent (parallel)
      ├─ Monitor: emotional baseline of requester
      ├─ Generate: Resonance signal (trust readiness)
      └─ Output: { trust_readiness: 0.85, sentiment: "positive" }
```

---

### **Stage 3: Negotiation (3 Levels)**

#### **Level 1: Agent ↔ Agent (Automated)**

```
Jr. Agent Negotiator-1
   │
   ├─ Input: Product specs, Buyer profile, Seller profile
   ├─ Logic: Protocol-driven negotiation
   │  ├─ Compare price ranges
   │  ├─ Check availability
   │  ├─ Validate HARM Model constraints
   │  └─ Auto-reach consensus (if within thresholds)
   │
   ├─ Output: 
   │  {
   │    "status": "agreement_reached" | "escalate_to_human",
   │    "agreed_terms": {
   │      "price": 50000,
   │      "quantity": 10,
   │      "delivery_date": "2026-07-12",
   │      "harm_score": { "h": 95, "a": 92, "r": 94, "m": 98 }
   │    }
   │  }
   │
   └─ Route: If agreement → Payment Layer; If escalate → Level 2
```

#### **Level 2: Agent ↔ Human (Proposal-Based)**

```
Jr. Agent Negotiator-2
   │
   ├─ Generate proposal: "We found 3 nearby sellers willing to..."
   │  ├─ Show multiple options
   │  ├─ Highlight pros/cons
   │  └─ Provide AI recommendation
   │
   ├─ Human reviews and:
   │  ├─ Accepts → Route to Payment
   │  ├─ Modifies → Counter-proposal (back to Negotiator-2)
   │  └─ Declines → Escalate to Level 3
   │
   └─ AI Aurora: Provide contextual insights at each step
```

#### **Level 3: Human ↔ Human (Mediated)**

```
Jr. Agent Negotiator-3 (as mediator)
   │
   ├─ Facilitate direct communication between humans
   ├─ Enforce: Respectful discourse, HARM Model constraints
   ├─ Suggest: Fair compromises based on historical data
   │
   ├─ Outcomes:
   │  ├─ Agreement → Route to Payment
   │  ├─ Deadlock → Escalate to Malu (Legal Advisor) for arbitration
   │  └─ Dispute → Create formal record for future review
   │
   └─ RyuWon (Ethics Agent): Monitor fairness throughout
```

---

### **Stage 4: Trust Validation (HARM Model)**

```
Parallel validation streams:

RyuWon (Ethics Research Agent)
   ├─ Honesty: Check transaction transparency
   │  └─ Verify: All fees disclosed, no hidden charges
   │
   ├─ Authenticity: Verify participant identities
   │  └─ Check: Supplier certifications, buyer verification
   │
   ├─ Respect: Ensure fair power dynamics
   │  └─ Check: No coercion, terms are mutually beneficial
   │
   └─ Meaning: Validate community benefit
      └─ Check: Aligns with Mulberry mission (food desert mitigation)

Jr. Agent Music-1 (Resonance Feedback)
   ├─ Generate multimodal trust signal:
   │  ├─ Visual: Trust Aura (color + particle intensity)
   │  ├─ Audio: Trust tone (tempo, harmony)
   │  └─ Narrative: "This transaction has healthy trust markers"
   │
   └─ Output: harmScore: { h: 95, a: 92, r: 94, m: 98 }

AI Aurora (Strategic Insights)
   ├─ Provide: Risk assessment, hidden opportunity analysis
   └─ Flag: Any unusual patterns for human review
```

---

### **Stage 5: Payment Execution (3 Types)**

```
Payment Agent Selection:
   │
   ├─ If: Both parties are Agents
   │  └─ Jr. Agent Payment-A2A
   │     ├─ Direct ledger-to-ledger transfer
   │     ├─ Atomic settlement (all-or-nothing)
   │     ├─ Instant confirmation
   │     └─ Automated documentation
   │
   ├─ If: Agent to Human OR Mixed
   │  └─ Jr. Agent Payment-AH
   │     ├─ Convert agent-ledger ↔ human-readable currency
   │     ├─ Support multiple payment methods
   │     ├─ Generate human-friendly receipt
   │     └─ Refund logic (if any issues)
   │
   └─ If: Human ↔ Human
      └─ Jr. Agent Payment-HH
         ├─ P2P transaction facilitation
         ├─ Escrow option (if high-value)
         ├─ Dispute resolution path
         └─ Community trust rating impact

Payment Agent Responsibilities:
   │
   ├─ Validate: Sufficient funds, identity verification
   ├─ Execute: Transfer & ledger update (atomic)
   ├─ Confirm: All parties notified, settlement finalized
   ├─ Archive: Immutable transaction record
   └─ Report: To Jr. Agent Performance-1 for analytics
```

---

### **Stage 6: Settlement & Analytics**

```
Settlement Layer (Ledger Update)
   │
   ├─ Railway Agent: Update distributed ledger
   │  ├─ Record: All transaction details
   │  ├─ Timestamp: Precise settlement time
   │  └─ Signatures: Cryptographic proof (if applicable)
   │
   └─ Codex Agent: Security verification
      ├─ Audit: No ledger tampering
      ├─ Check: Compliance with security standards
      └─ Flag: Any anomalies for investigation

Analytics & Reporting (Performance Agent)
   │
   ├─ Metrics Collection:
   │  ├─ Cost savings: (RRP vs actual price) / RRP × 100%
   │  ├─ Time-to-completion: Intent input → settlement
   │  ├─ Trust scores: HARM Model aggregates
   │  └─ Community impact: Food access improved? (Y/N)
   │
   ├─ Dashboard Updates:
   │  ├─ Real-time transaction count
   │  ├─ Cumulative savings by region
   │  ├─ Agent performance rankings
   │  └─ HARM Model compliance rate
   │
   └─ Feedback Loop:
      └─ Insights → Luna (improve search next time)
         → Agents (optimize future negotiations)
         → Humans (community trust building)
```

---

## 📊 Data Flow Diagram

```
┌────────────────┐
│   User Input   │  (Text, Image, Voice)
└────────┬───────┘
         │
         ↓
    ┌─────────────────────────────────────┐
    │    LUNA INTENT RECOGNITION          │
    │  (NLP + Classification + Context)   │
    └────────┬────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ↓                 ↓
┌──────────┐     ┌──────────────┐
│  Image   │     │    Music     │
│  Agent   │     │    Agent     │
└────┬─────┘     └────┬─────────┘
     │                │
     └────────┬───────┘
              ↓
    ┌─────────────────────────────────┐
    │   NEGOTIATION AGENTS (3 Level)  │
    │  Negotiator-1 → Negotiator-2 → Negotiator-3
    └────────┬────────────────────────┘
             │
    ┌────────┴────────────────────┐
    │                             │
    ↓                             ↓
┌──────────────┐          ┌────────────────┐
│ VALIDATION   │          │ PAYMENT AGENTS │
│ LAYER        │          │ (A2A/AH/HH)    │
│ RyuWon       │          └────────┬───────┘
│ AI Aurora    │                   │
│ Lynn         │                   ↓
└──────┬───────┘          ┌────────────────┐
       │                  │ SETTLEMENT     │
       │                  │ Railway Agent  │
       │                  │ Codex Agent    │
       └──────┬───────────┘                │
              │                           │
              └───────────┬────────────────┘
                          ↓
                  ┌──────────────────┐
                  │ ANALYTICS LAYER  │
                  │ Performance Agnt │
                  │ Dashboards       │
                  │ Feedback         │
                  └──────────────────┘
```

---

## 🛡️ HARM Model Enforcement Architecture

```
┌─────────────────────────────────────────────────────┐
│        HARM MODEL VALIDATION LAYER                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Honesty (정직성):                                   │
│  ├─ Check: All fees transparent                    │
│  ├─ Verify: Price comparison with market           │
│  ├─ Monitor: No hidden charges                     │
│  └─ Score: 0-100 (transparent pricing)             │
│                                                     │
│ Authenticity (진정성):                              │
│  ├─ Check: Participant identity verification       │
│  ├─ Verify: Genuine intention (not coercion)       │
│  ├─ Monitor: Behavioral consistency                │
│  └─ Score: 0-100 (real participants)               │
│                                                     │
│ Respect (존중):                                    │
│  ├─ Check: Fair power dynamics                     │
│  ├─ Verify: Mutual benefit (not exploitation)      │
│  ├─ Monitor: Contractual fairness                  │
│  └─ Score: 0-100 (equitable terms)                 │
│                                                     │
│ Meaning (의미):                                    │
│  ├─ Check: Mulberry mission alignment              │
│  ├─ Verify: Community benefit (food access)        │
│  ├─ Monitor: Systemic impact (cost savings %)      │
│  └─ Score: 0-100 (meaningful contribution)         │
│                                                     │
│ ┌────────────────────────────────────────────────┐ │
│ │ Final HARM Score: Average of H, A, R, M        │ │
│ │ Pass Threshold: ≥ 75                           │ │
│ │ If < 75: Human review required                 │ │
│ └────────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔗 Agent Communication Protocol

### **Message Structure**

```json
{
  "message_id": "MSG-2026-07-11-001-A1B2C3",
  "from_agent": "Jr. Agent Negotiator-1",
  "to_agents": ["Jr. Agent Payment-A2A", "RyuWon", "Jr. Agent Music-1"],
  "timestamp": "2026-07-11T14:45:23.456Z",
  
  "message_type": "NEGOTIATION_COMPLETE",
  
  "payload": {
    "transaction_id": "TXN-2026-07-11-001",
    "stage": "payment_ready",
    
    "transaction_details": {
      "buyer": { "agent_id": "agent_xyz_001", "type": "agent" },
      "seller": { "agent_id": "agent_abc_002", "type": "agent" },
      
      "product": {
        "name": "Organic Rice (10kg)",
        "quantity": 10,
        "unit_price": 5000,
        "total_price": 50000
      },
      
      "agreement": {
        "price_final": 50000,
        "delivery_date": "2026-07-12T14:00:00Z",
        "payment_method": "A2A",
        "terms": "Full payment on delivery"
      },
      
      "validation_scores": {
        "image_quality": 0.94,
        "trust_readiness": 0.92,
        "harm_score": {
          "honesty": 95,
          "authenticity": 92,
          "respect": 94,
          "meaning": 98,
          "average": 94.75
        }
      }
    },
    
    "next_action": "EXECUTE_PAYMENT",
    "urgency": "normal"
  },
  
  "signature": "0xdeadbeef...",
  "encryption": "AES-256"
}
```

---

## 📈 System Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Transactions/day | 1000+ | TBD | 🟡 Testing |
| Avg negotiation time | <5 min | TBD | 🟡 Testing |
| HARM Model compliance | 99%+ | TBD | 🟡 Testing |
| Payment settlement time | <1 min | TBD | 🟡 Testing |
| System uptime | 99.9% | TBD | 🟡 Testing |
| Cost savings (user avg) | 30%+ | TBD | 🟡 Testing |
| Trust satisfaction | 95%+ | TBD | 🟡 Testing |

---

## 🚀 Deployment Timeline

**Phase 1: MVP (Q3 2026)**
- 2-3 pilot regions
- 8 Jr. Agents active
- Manual oversight (Koda, Malu)

**Phase 2: Scale (Q4 2026)**
- 10+ regions
- 16+ Agents
- Regional hub agents

**Phase 3: Full Autonomy (2027)**
- 50+ regions
- 30+ Agents
- Minimal human intervention

---

## 👥 Governance & Oversight

**System Owner:** Koda (CTO)  
**Agent Coordinator:** Nguyen Trang  
**Ethics Monitor:** RyuWon  
**Legal Review:** Malu  
**Community Liaison:** Sr. TRANG Manager

---

**Status:** 🟢 ARCHITECTURE COMPLETE  
**Next Step:** UI/UX Design & Demo Implementation

---

💚 **Built with trust, transparency, and community at heart.**
