IMPORTANT: Please completely improve and standardize the navigation, scrolling behavior, and workflow positioning throughout the entire website.

The current workflow still has inconsistent scroll positions. Sometimes when the user moves to a new page or section, the page remains at the previous scroll position instead of starting from the top.

I want the entire website to follow this navigation behavior:

1. EVERY TIME THE USER MOVES TO A NEW PAGE OR MAIN SECTION, THE PAGE MUST AUTOMATICALLY START FROM THE TOP.

Whenever the user navigates to a different page, learning section, activity, or main step, automatically reset the scroll position to the very top of the new page.

For example:

- Homepage → click “Mulai Belajar” → the next page must open from the very top.
- The title or first content of the next page must immediately be visible without requiring the user to manually scroll upward.
- If the next page contains a heading such as “Pilih Materi”, that heading should be visible immediately when the page opens.
- Vocabulary → next vocabulary page → start from the top.
- Vocabulary → Istima' → start from the top.
- Istima' → Kalam → start from the top.
- Kalam → Kitabah → start from the top.
- Kitabah → Mini Game → start from the top.
- Mini Game → Evaluation → start from the top.
- Evaluation → Reflection → start from the top.
- Reflection → Result page → start from the top.
- Returning to Homepage → start from the top.

Do not preserve the previous page's scroll position when navigating to a new main page or section.

Every new page or major learning section should always begin with:

scroll position = top

This must work consistently across the ENTIRE website, including desktop, laptop, tablet, and mobile devices.

2. IMPLEMENT CONTEXT-AWARE AUTO-SCROLL DURING USER INTERACTIONS.

Inside a page, the scrolling behavior should adapt to the activity the student is currently performing.

The website should intelligently scroll to the relevant interactive element instead of forcing the student to manually search for it.

For example:

RECORDING ACTIVITY:
When the student clicks a button such as “Tekan untuk Rekam” or starts a voice recording activity, automatically scroll the page so the recording container or recording interface is positioned comfortably in the center or near the center of the visible screen.

The active recording area should be clearly visible without being too close to the top or bottom edge of the screen.

The student should immediately be able to focus on the recording interaction.

After the recording is completed or submitted:
- automatically scroll to the result, feedback, confirmation message, or next action
- if a “Lanjut” button appears after submitting the recording, automatically scroll to that button so it becomes clearly visible

TEXT INPUT ACTIVITY:
When the student submits a written answer:
- automatically scroll to the feedback or confirmation message
- if the next action is a “Lanjut” button, automatically scroll to the “Lanjut” button
- make sure the button is fully visible and easy to click

VOCABULARY ACTIVITY:
After clicking “Lanjut”:
- automatically move to the next vocabulary content
- reset the next vocabulary view to the appropriate top position
- the main vocabulary word should be immediately visible
- do not leave the student at the old scroll position

LISTENING ACTIVITY:
When the student interacts with audio or completes a listening activity:
- automatically scroll to the next relevant question, activity, feedback, or button
- keep the active interaction area comfortably visible

SPEAKING ACTIVITY:
When the student starts recording:
- automatically bring the recording container into the center or optimal visible area of the screen

When the student finishes or submits the recording:
- automatically scroll to the feedback or “Lanjut” button

WRITING ACTIVITY:
When the student finishes typing or completing a writing task:
- automatically scroll to the feedback, confirmation message, or next button

DRAWING ACTIVITY:
When the student finishes submitting their drawing:
- automatically scroll to the completion message
- then automatically guide the student toward the next available action or “Lanjut” button

Do not leave the student at an unrelated scroll position after submitting the drawing.

MINI GAME:
After completing a mini game:
- automatically scroll to the completion feedback
- automatically reveal and position the next button or next activity clearly on screen

EVALUATION:
After answering or submitting an evaluation question:
- automatically scroll to the relevant feedback or next question
- when moving to another evaluation page or section, start from the top of that new page

REFLECTION:
After completing the reflection:
- automatically scroll to the result or completion section
- if navigating to a new result page, that page must start from the top

3. USE TWO DIFFERENT SCROLL BEHAVIORS.

Please distinguish between:

A. PAGE NAVIGATION SCROLL

When changing to a completely new page or major section:

→ Always reset the scroll position to the TOP.

The new page should never inherit the scroll position from the previous page.

B. INTERACTION SCROLL

When the user interacts with an element inside the same page:

→ Automatically scroll to the relevant interactive element, feedback, result, or next action.

The active element should preferably be positioned comfortably in the visible viewport, ideally around the center or upper-middle area depending on the available screen space.

Examples:
- clicking a recording button → recording container becomes visible and centered
- submitting text → feedback or “Lanjut” button becomes visible
- finishing a recording → next action becomes visible
- completing a drawing → completion message and next button become visible

4. APPLY THIS SYSTEM TO THE ENTIRE WEBSITE, NOT ONLY THE 4 MAHARAH SECTIONS.

This navigation and scrolling system must be applied globally to ALL pages and features, including:

- Homepage
- Student information page
- Avatar selection
- Class selection
- Mindful learning questions
- Material selection
- Vocabulary pages
- All vocabulary interactions
- Istima'
- Kalam
- Qira'ah
- Kitabah
- Audio interactions
- Recording interactions
- Text input activities
- Drawing activities
- Mini Games
- Evaluation
- Reflection
- Learning result page
- Navigation menu pages
- Any future or existing interactive activity

Please do not apply this behavior only to one or two sections.

The entire website must have one consistent navigation and scrolling system.

5. PRIORITIZE MOBILE AND TABLET USER EXPERIENCE.

The website is frequently used on mobile phones and tablets, so the auto-scroll behavior must work properly on smaller screens.

Make sure:

- important content is not hidden behind the browser interface
- buttons are fully visible after auto-scrolling
- interactive containers are not positioned too close to the bottom of the screen
- the screen does not stop at awkward positions
- users do not need to manually scroll upward to find the beginning of a newly opened page
- users do not need to manually search for the next button after completing an activity

The scrolling should feel smooth, natural, and intentional.

6. DO NOT CREATE RANDOM OR EXCESSIVE AUTO-SCROLLING.

Auto-scroll should only happen when:

- entering a new page or main section
- starting an interaction
- completing an interaction
- submitting an answer
- finishing an activity
- revealing feedback
- revealing a “Lanjut” button
- moving to the next relevant learning step

Avoid unnecessary scrolling while the student is simply reading or interacting normally.

FINAL WORKFLOW RULE:

NEW PAGE OR NEW MAIN SECTION
→ Always start from the TOP.

INTERACTION INSIDE THE SAME PAGE
→ Automatically scroll to the currently relevant interactive element.

ACTIVITY COMPLETED
→ Automatically scroll to feedback, completion message, or next action.

“LANJUT” BUTTON APPEARS
→ Automatically make the button clearly visible.

CLICKING “LANJUT”
→ The next page or main section starts again from the TOP.

Please apply this workflow consistently to the entire website so the learning experience feels smooth, guided, interactive, and does not require students to constantly manually scroll up and down to find the next content.