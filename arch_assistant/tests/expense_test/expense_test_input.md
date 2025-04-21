**Expenses Tech Design**

**New microservice with separate database (option number 5):**

![][image1]

Pros:

* Separation of concerns. Each service has a clear focus and independent business logic  
* Less complex business logic, smaller services.  
* Failure in one microservice doesn't cause the entire application to fail.

Cons:

* The new service's configuration must be done from scratch. Even with the help of AI, it will take time to test whether everything is working as expected.  
* Need to consume events from other domains to enrich data.  
* Manual expenses will need to be created from the new service, and Accounting will consume related events to continue with JE (journal entries) and charges, leading to additional orchestration work.  
* Issues may span multiple services, making it harder to pinpoint the root cause.

The main flow, in case of “option 5” is therefore:  
![][image2]

**New service inside Accounting Repo working with Accounting database (option number 4):**

![][image3]

Pros:

* We can start working faster on a new service on top of accounting, we will have everything configured.  
* If we work on top of the accounting database, we can use existing tables to create reports and debug.  
* Keeping related functionality within the same service helps avoid scattering logic across multiple microservices.

Cons:

* Coupling between Expenses and Accounting, although development should be done in a way that can be easily extracted in the future if needed.  
* Adding expenses-related functionality may bloat the Accounting service, making it harder to maintain.

The flow w/ option 4:  
![][image4]

**Preferred solution:**

After evaluating the available options, we decided to move forward with a hybrid approach \- **Option number 4**\- utilizing the existing Accounting repository while also developing a separate microservice for handling Expenses. 

These are the reasons why we think a new microservice with a new database is not the best option now:

**Challenges and Considerations:**

* **Increased Integration Effort:**

  * More time is required to integrate the new microservice with the Accounting system, primarily by setting up event-based communication using producers, consumers, and message queues.

* **Higher Cross-Team Coordination:**

  * This setup increases complexity since it necessitates syncing across multiple teams working with shared contracts and event schemas, which could make required ANZ changes harder to implement.

* **Manual Review and Potential AI Limitations:**

  * Although AI-generated boilerplate code can speed up initial development, manual review and testing are still essential to avoid unexpected issues.

* **Need for Enhanced Monitoring:**

  * A new database will require additional monitoring tools and infrastructure to ensure reliability, performance, and visibility.

* **Asynchronous Processing Delays:**

  * Working in an asynchronous environment may lead to delays in displaying updated information on the UI, which could negatively affect the user experience by making users wait to see real-time changes.

* **Increased Transaction Complexity:**

  * Managing transactions becomes more challenging when asynchronous systems are involved, increasing the risk of partial failures, inconsistent data states, and complexity in maintaining overall data integrity.

Mar 27, 2025

## Expenses \- challenges

Invited [Lior Schejter](mailto:lior.schejter@guesty.com) [Andrey Smirnov](mailto:andrei.smirnov@guesty.com)

Attachments [Expenses - challenges](https://www.google.com/calendar/event?eid=NXNkbW1zZ3NmY3Q1aDY1NXJuNmVndHBldWwgbGlvci5zY2hlanRlckBndWVzdHkuY29t) 

Meeting records [Transcript](?tab=t.wresgplouo75) 

### Summary

Lior Schejter and Andrey Smirnov reviewed the expense calculation design, analyzing two database structure options: a shared database (Option 4\) and separate databases (Option 5).  While the initial preference leaned towards separation for management reasons,  justification proved insufficient due to tight coupling between expenses and accounting, impacting scalability and reporting.  Lior Schejter will discuss the business justifications for separation with product managers Alisa and Elanit, and the participants will share the diagram and diagramming tool used.

### Details

* **Meeting Objective:** Lior Schejter and Andrey Smirnov reviewed a technical design document regarding expenses and charges calculation, focusing on the separation of concerns between services and databases ([00:00:00](?tab=t.wresgplouo75#heading=h.qpa975oqzflh)) ([00:02:18](?tab=t.wresgplouo75#heading=h.nmt763npm8mx)).  They aimed to understand the workflow and justify the design choices ([00:02:18](?tab=t.wresgplouo75#heading=h.nmt763npm8mx)) ([00:21:56](?tab=t.wresgplouo75#heading=h.93al9fdy0omw)).

* **Expense Calculation Workflow:** They meticulously mapped out the main expense calculation flow.  An external event (e.g., "money updated") triggers the process. The business model retrieves rules from a database and, depending on the chosen option (shared or separate databases for expenses), either accesses a shared accounting database or a separate expenses service to retrieve expense rules.  The business model then produces expenses and charges, sending these to the accounting service for persistence in the accounting database ([00:04:37](?tab=t.wresgplouo75#heading=h.wt36ohw0feaf)) ([00:07:26](?tab=t.wresgplouo75#heading=h.w6fnfyir1cnb)).

* **Database Structure Options:** Two options for database structure were discussed. Option 4 used a shared database for accounting and expenses, simplifying data access but potentially creating tighter coupling. Option 5 maintained separate databases for expenses and accounting, allowing for greater independence but requiring additional data synchronization ([00:10:05](?tab=t.wresgplouo75#heading=h.a2xq4uwkavtb)) ([00:17:14](?tab=t.wresgplouo75#heading=h.o0xi73kahr0s)).

* **Expenses Service Justification:**  Andrey Smirnov initially cited management's desire for separation as the reason for a separate expenses service (Option 4),  but later acknowledged they couldn’t fully justify it ([00:21:56](?tab=t.wresgplouo75#heading=h.93al9fdy0omw)) ([00:34:42](?tab=t.wresgplouo75#heading=h.ua72jfhypwvc)). They considered potential future scalability and AI-driven development as indirect arguments but acknowledged their limited weight in the tradeoff ([00:36:05](?tab=t.wresgplouo75#heading=h.jph42nt5dygx)). Lior Schejter questioned the necessity given the tight coupling between expenses and accounting ([00:32:22](?tab=t.wresgplouo75#heading=h.yzgkx0mtyz0w)) ([00:38:33](?tab=t.wresgplouo75#heading=h.hjj4ym6ks8tn)).

* **Coupling of Expenses and Accounting:**  Andrey Smirnov explained that expenses and accounting are tightly coupled, both in code and in business logic, due to dependencies in the calculation process ([00:29:37](?tab=t.wresgplouo75#heading=h.isdyjn678ic8)).  Changes to one often require changes to the other.  This coupling raises concerns about the complexity introduced by attempts to separate them ([00:28:22](?tab=t.wresgplouo75#heading=h.o06z8qvo0ia6)) ([00:31:03](?tab=t.wresgplouo75#heading=h.n24s55bwazer)).

* **Reporting Considerations:** The discussion highlighted the reporting aspect where keeping expenses within the accounting database simplified report generation due to existing data availability and related tables ([00:15:26](?tab=t.wresgplouo75#heading=h.3ctnv24c9opx)). This was deemed a practical advantage over a separate database solution.

* **Alternative Approaches:** Lior Schejter suggested keeping expenses and accounting completely separate, potentially performing calculations solely within the expenses service ([00:29:37](?tab=t.wresgplouo75#heading=h.isdyjn678ic8)).  Andrey Smirnov noted that the current implementation's tight coupling presented challenges to this alternative.

* **Decision & Next Steps:** The meeting concluded without a definitive decision on the expenses service separation. Lior Schejter planned to discuss the matter further with relevant product managers (Alisa and Elanit) to clarify the business justifications for separation and the overall design ([00:37:19](?tab=t.wresgplouo75#heading=h.asqy678r0orw)) ([00:39:39](?tab=t.wresgplouo75#heading=h.qmycvgud4je4)).  They agreed on sharing the diagram and the used diagramming tool ([00:40:38](?tab=t.wresgplouo75#heading=h.ni0qkutwdogd)).

### Suggested next steps

- [ ] Lior Schejter will add the diagrams to the document.  
- [ ] Lior Schejter will discuss with Elanit and Alisa to clarify the motivation for a separate expenses service.

*You should review Gemini's notes to make sure they're accurate. [Get tips and learn how Gemini takes notes](https://support.google.com/meet/answer/14754931)*

*Please provide feedback about using Gemini to take notes in a [short survey.](https://google.qualtrics.com/jfe/form/SV_9vK3UZEaIQKKE7A?confid=IYMtsnF3S60hKBQKB-ArDxIROA8MCwMyBwiKAiAAGAEI)*