# Holiday Tinkering: Building Autonomous Agents That Actually Act on Your Behalf

I'm someone who's obsessed with automation, productivity, and removing the mundane from daily life. So when the holidays rolled around and I found myself drowning in the same property management tasks that everyone deals with - remembering to pay body corporate levies, extracting line items from bills, sending invoices to tenants, tracking whether rentals have been paid - I did what any engineer would do. I built a system to automate it.

What started as a simple holiday project became something far more interesting: a deep dive into building autonomous agents that can actually act on your behalf. Not just chatbots or assistants that suggest actions - real agents that process documents, make decisions, execute payments, and even handle service provider workflows.

## The Real Problem

Property management is full of repetitive, forgettable tasks. A body corporate statement arrives in your email. You need to extract the water, electricity, and levy amounts. Match them to the right property and tenant. Generate an invoice. Send it. Then remember to pay the body corporate itself. And do this every month, for every property, without missing deadlines.

Then there's the maintenance side. A tenant messages you about a leak. You need to contact service providers, get quotes, compare them, choose one, dispatch the work, and pay the invoice. It's a constant stream of coordination and decision-making.

It's the kind of work that's perfect for automation - if you can build agents smart enough to handle it.

## Autonomous Agents That Actually Work

The breakthrough came when I realized this wasn't about building a single AI system. It was about creating a **network of specialized sub-agents**, each with a specific role, working together autonomously.

When an email arrives with a bill, one agent analyzes it and decides what needs to happen. Another agent extracts the relevant data - not just reading the PDF, but understanding what each line item means and where it belongs. A third agent matches it to the right property and billing period. Yet another generates the invoice. And critically, the system can execute payments on your behalf.

The fascinating part? These agents don't just follow scripts. They adapt. When a bill arrives from a portal that requires login, an agentic browser agent figures out how to navigate it, enter credentials, and extract what's needed - even when the portal changes its layout. It reads the email context, understands the goal, and finds a path forward.

This is where the real power of modern AI architectures shows up. You're not just automating known processes. You're deploying agents that can handle the unexpected, make reasonable decisions, and act autonomously within defined boundaries.

## Creating a Clone: Sub-Agents That Coordinate at Scale

The real breakthrough came when I started thinking about this differently. I wasn't just building automation tools - I was effectively **creating a clone of myself** that could coordinate and handle these tasks with an unlimited number of properties, tenants, and service providers.

This became clear with the WhatsApp automation. Tenants message about issues - a leak, a broken appliance, whatever needs attention. But instead of me having to respond, coordinate, and make decisions, a network of sub-agents handles it. One agent receives the message and creates an incident. Another identifies what needs to be done and which service providers to contact. Yet another sends RFQ requests via WhatsApp to my trusted providers. When quotes come back, comparison agents evaluate them and select the best option. Dispatch agents coordinate the work, and payment agents handle the financial side.

The entire workflow runs autonomously. A tenant reports an issue. The agent network creates the incident, identifies requirements, sends RFQ requests to the right service providers, collects quotes, compares them, selects the best option, dispatches the work, and handles payment. All without me having to coordinate messages, compare prices, or remember to follow up.

This is what sub-agent architecture enables: **effectively creating a clone of yourself** that can coordinate with an unlimited number of parties, make decisions, and execute entire workflows. The agents handle the coordination, the comparison, the execution, and the payment - operating as an extension of your decision-making, but at a scale you couldn't achieve manually.

## Delegated Payments: Trusting Agents With Real Money

The most interesting challenge was building **delegated payment workflows**. This isn't just about processing payments - it's about creating a system where you can safely delegate financial authority to autonomous agents.

The system handles the full lifecycle: bills arrive, payment instructions are extracted, payables are generated, and payments can be executed automatically. But here's what makes it work: comprehensive guardrails, encrypted credential management, full audit trails, and the ability to set approval thresholds.

You can define templates for recurring payments (like monthly body corporate levies), set up beneficiaries securely, and let the system handle the execution while maintaining complete visibility and control. The agents act on your behalf, but you maintain oversight.

This pattern - delegating authority to autonomous systems while maintaining control - is going to be critical as we build more sophisticated AI applications. Whether it's property management, Capital Markets trading systems, or any domain where agents need to act autonomously, the principles are the same: clear boundaries, comprehensive monitoring, and the ability to intervene when needed.

## Guardrails, Intelligent Accounts, and the Future of Autonomous Banking

Building delegated payment workflows forced me to think deeply about **guardrails for financial autonomy**. How do you give an agent access to a bank account while ensuring it can only act within defined parameters? The answer isn't just encryption and authentication - it's about building constraints into the system architecture itself.

This led me to explore a fascinating possibility: **bank accounts fully controlled by autonomous agents**. Imagine an account where agents can make decisions, execute payments, and reconcile transactions - all within guardrails you define. The account becomes intelligent, responding to bills automatically, matching payments to invoices, and maintaining perfect records.

The opportunities here are significant. **Automated reconciliation** becomes trivial when agents can read bank statements, match transactions to invoices, and flag discrepancies automatically. The system I built can already do this - when a tenant payment arrives, agents match it to the correct invoice, update balances, and generate reconciliation reports. But imagine this scaled: agents monitoring multiple accounts, handling complex multi-party transactions, and maintaining real-time financial visibility.

**Intelligent bank accounts** could transform how we manage finances. Instead of manually reviewing statements, agents could categorize transactions, detect anomalies, and even make routine payments autonomously. The account becomes proactive rather than reactive.

One of the most interesting learnings came from working with **Claude's code skills and hooks** - the ability to give AI agents tools and let them decide when and how to use them. This pattern is exactly what you need for autonomous financial agents. The agent doesn't just execute predefined workflows - it analyzes the situation, decides what actions are needed, and uses the appropriate tools (payment APIs, reconciliation engines, reporting systems) to accomplish its goals.

The key insight? You're not building a payment system with AI features. You're building an AI agent with financial capabilities. The agent has goals, constraints, and tools. It makes decisions within those boundaries. This is fundamentally different from traditional automation, and it opens up possibilities we're only beginning to explore.

## What This Means for the Future

Building this system taught me something important about the direction of AI development. We're moving beyond AI that just answers questions or generates content. We're entering an era where AI agents can be deployed to act autonomously on our behalf - processing documents, making decisions, executing transactions, coordinating with multiple parties.

The key is building the right architecture. Not a single monolithic AI, but a network of specialized agents, each with clear responsibilities, working together. Agents that can adapt to changing conditions. Agents that operate within well-defined guardrails. Agents you can trust to handle real-world tasks.

The sub-agent architecture pattern - where different agents handle different aspects of a workflow - is going to be fundamental. It's how you build systems that are both powerful and reliable. Each agent has a focused role, clear boundaries, and the ability to collaborate with others.

## The Holiday Learning

This holiday project reinforced something I've always believed: the best way to understand where technology is heading is to build something real. Not a demo or a proof of concept, but a system that solves an actual problem you face.

The experience of building autonomous agents that can process documents, extract information, generate invoices, execute payments, coordinate service providers, and handle entire workflows has given me new perspectives on how we'll build AI systems in the future. The patterns here - sub-agent architectures, delegated authority, autonomous decision-making within boundaries - apply far beyond property management.

If you're working in AI, I'd encourage you to build something that solves a real problem in your life. The constraints are different, the requirements are real, and the learnings are invaluable.

---

*What are your thoughts on building autonomous agents that can act on your behalf? Have you experimented with delegated authority patterns? I'd love to hear about your experiences.*

#AI #MachineLearning #AutonomousAgents #FinTech #PropertyTech #OpenBanking #Automation

