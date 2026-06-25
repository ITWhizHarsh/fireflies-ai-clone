# Requirements Document

## Introduction

This document defines the requirements for a functional clone of the Fireflies.ai meeting-assistant web application. The system replicates the design, user experience, and core post-meeting workflows of Fireflies, allowing users to browse a library of meetings, view interactive transcripts with speaker labels and timestamps, read AI-generated summaries and action items, search across transcripts, and manage meeting data.

Real speech-to-text transcription is out of scope. Transcript and summary data may be seeded, mocked, accepted via uploaded transcript files (.txt/.vtt/.json), or optionally generated from existing transcript text using an LLM. The application assumes a single default logged-in user; real authentication is out of scope.

The system consists of a Next.js (TypeScript) frontend and a Python (FastAPI or Django) backend backed by a SQLite database.

## Glossary

- **System**: The complete Fireflies clone application, including frontend, backend, and database.
- **Frontend**: The Next.js TypeScript client application that renders the user interface.
- **Backend**: The Python (FastAPI or Django) server that exposes the application API and manages persistence.
- **Database**: The SQLite data store that persists meetings, transcripts, summaries, action items, and related entities.
- **Meeting**: A record representing a past meeting, including metadata (title, date, duration), participants, a transcript, a summary, and action items.
- **Transcript**: An ordered collection of Transcript_Segments belonging to a single Meeting.
- **Transcript_Segment**: A single line of the transcript, containing a speaker label, a start timestamp, an optional end timestamp, and spoken text.
- **Speaker_Label**: The name or identifier of the participant who spoke a Transcript_Segment.
- **Timestamp**: A time offset, in seconds, relative to the start of the Meeting media.
- **Summary**: AI-generated or seeded text that summarizes the content of a Meeting.
- **Action_Item**: A task extracted from or associated with a Meeting, having a description and a completion status.
- **Key_Topic**: A topic, outline entry, or chapter associated with a Meeting.
- **Media_Player**: The frontend component that plays placeholder or sample audio/video and exposes a seek bar.
- **Meetings_Library**: The dashboard view that lists Meetings.
- **Transcript_Detail_View**: The view that displays a single Meeting's transcript, media player, summary, and action items.
- **Default_User**: The single assumed logged-in user; no authentication is performed.
- **Transcript_File**: An uploaded file in .txt, .vtt, or .json format containing transcript content.
- **Toast**: A transient notification displayed to the user in response to an action.
- **Comment**: A free-text note authored by the Default_User and attached to a specific Transcript_Segment.
- **Highlight**: A visual marker applied by the Default_User to a Transcript_Segment to flag it as notable.
- **Soundbite**: A saved clip reference that spans one or more contiguous Transcript_Segments of a single Meeting, identified by a start Timestamp and an end Timestamp.
- **Tag**: A short text label applied by the Default_User to a Meeting for categorization and filtering.
- **Export_Document**: A generated file representing a Meeting's Transcript or Summary in PDF, Markdown, or TXT format.
- **Global_Search**: A search capability that queries titles, transcripts, and summaries across all Meetings from a single search field.
- **Meeting_Chat**: A chat interface in which the Default_User asks natural-language questions about a single Meeting and receives Backend-generated answers derived from the Meeting transcript text.
- **Theme**: The visual color scheme applied by the Frontend, having a value of either light or dark.

## Requirements

### Requirement 1: Meetings Library / Dashboard

**User Story:** As a Default_User, I want to browse a library of my past meetings, so that I can quickly find and open a meeting of interest.

#### Acceptance Criteria

1. WHEN the Meetings_Library is opened, THE Frontend SHALL display a list of Meetings, where each entry shows the Meeting title, date, duration, and participant names.
2. WHEN the Meetings_Library is opened, THE Frontend SHALL display the Meetings sorted by date in descending order by default, and WHERE two or more Meetings share the same date, THE Frontend SHALL order those Meetings by title in ascending alphabetical order.
3. WHEN the Default_User enters text in the meetings search field, THE Frontend SHALL display, within 1 second of the last keystroke, only Meetings whose title or any participant name contains the entered text using case-insensitive partial matching.
4. WHEN the Default_User selects a date filter value, THE Frontend SHALL display only Meetings whose date falls within the selected filter range, retaining any active search text as an additional filter applied together with the date filter.
5. WHEN the Default_User selects a Meeting from the list, THE Frontend SHALL navigate to the Transcript_Detail_View for the selected Meeting within 2 seconds.
6. IF no Meetings match the active search or filter criteria, THEN THE Frontend SHALL display an empty-state message indicating no Meetings were found, while retaining the search field and filter controls in their current state.
7. WHILE the list of Meetings is being retrieved from the Backend, THE Frontend SHALL display a loading indicator.
8. IF the retrieval of Meetings from the Backend fails, THEN THE Frontend SHALL display an error message indicating that Meetings could not be loaded and SHALL provide a control to retry the retrieval.
9. THE Frontend SHALL display a navigation bar containing profile and settings placeholder controls.

### Requirement 2: Meeting / Transcript Detail View

**User Story:** As a Default_User, I want to view an interactive transcript synchronized with a media player, so that I can navigate the meeting content efficiently.

#### Acceptance Criteria

1. WHEN the Transcript_Detail_View is opened for a Meeting that contains at least one Transcript_Segment, THE Frontend SHALL display every Transcript_Segment of that Meeting in ascending Timestamp order, each showing its Speaker_Label, Timestamp formatted as HH:MM:SS, and text.
2. IF the Transcript_Detail_View is opened for a Meeting that contains no Transcript_Segment, THEN THE Frontend SHALL display a message indicating that no transcript is available and SHALL still render the Media_Player.
3. WHEN the Transcript_Detail_View is opened for a Meeting, THE Frontend SHALL display a Media_Player with a seek bar within 3 seconds of the view opening.
4. IF the media source for the Meeting fails to load within 10 seconds, THEN THE Frontend SHALL display an error indication that the media could not be loaded while preserving the displayed Transcript_Segments.
5. WHEN the Default_User selects a Transcript_Segment, THE Media_Player SHALL set its playback position to the Timestamp of the selected Transcript_Segment within 500 milliseconds.
6. WHILE the Media_Player is playing, THE Frontend SHALL highlight exactly one Transcript_Segment, the Transcript_Segment whose Timestamp range contains the current playback position, updating the highlight within 500 milliseconds of the position entering a new Transcript_Segment range.
7. WHEN the Default_User enters at least 1 character in the transcript search field, THE Frontend SHALL highlight every occurrence of the entered text, matched case-insensitively, within the displayed Transcript_Segments within 1 second.
8. IF the entered transcript search text (1 to 200 characters) matches no Transcript_Segment, THEN THE Frontend SHALL display an indication that no matches were found.
9. WHEN the Default_User clears the transcript search field, THE Frontend SHALL remove all search-result highlights from the displayed Transcript_Segments.

### Requirement 3: AI Summary and Notes

**User Story:** As a Default_User, I want to read an AI-generated summary, action items, and key topics for a meeting, so that I can understand the outcomes without reading the full transcript.

#### Acceptance Criteria

1. WHEN the Transcript_Detail_View is opened for a Meeting that has an associated Summary, THE Frontend SHALL display the Summary text associated with the Meeting within 3 seconds of the view loading.
2. WHEN the Transcript_Detail_View is opened for a Meeting that has one or more associated Action_Items, THE Frontend SHALL display the full list of Action_Items associated with the Meeting.
3. WHEN the Transcript_Detail_View is opened for a Meeting that has one or more associated Key_Topics, THE Frontend SHALL display the full list of Key_Topics associated with the Meeting.
4. WHERE an LLM summary generation option is enabled, WHEN a Meeting transcript text becomes available, THE Backend SHALL generate a Summary, a list of Action_Items, and a list of Key_Topics from the Meeting transcript text.
5. IF a Meeting has no associated Summary, THEN THE Frontend SHALL display a placeholder message indicating that no summary is available.
6. IF a Meeting has no associated Action_Items or no associated Key_Topics, THEN THE Frontend SHALL display a placeholder message indicating that no action items or no key topics are available, respectively.
7. IF the Backend fails to generate a Summary, Action_Items, or Key_Topics from the Meeting transcript text, THEN THE Backend SHALL retain the existing Meeting data without modification and record an error indication that generation failed.

### Requirement 4: Meeting Creation

**User Story:** As a Default_User, I want to create a meeting by uploading or pasting a transcript or filling a form, so that I can add meetings to my library.

#### Acceptance Criteria

1. WHEN the Default_User submits the create-meeting form with a title of 1 to 200 characters, a valid calendar date, and 0 to 100 participants, THE Backend SHALL create a Meeting record and persist it to the Database within 5 seconds.
2. IF the Default_User submits the create-meeting form with a missing title, a title outside 1 to 200 characters, an absent or invalid date, or more than 100 participants, THEN THE Backend SHALL reject the submission, SHALL NOT create a Meeting record, and SHALL return an error indicating which field failed validation.
3. WHEN the Default_User uploads a Transcript_File in .txt, .vtt, or .json format of up to 10 MB, THE Backend SHALL parse the Transcript_File into Transcript_Segments and persist them to the Database within 30 seconds.
4. WHEN the Default_User pastes transcript text of 1 to 1,000,000 characters into the create-meeting form, THE Backend SHALL parse the pasted text into Transcript_Segments and persist them to the Database within 30 seconds.
5. IF an uploaded Transcript_File exceeds 10 MB, has an extension other than .txt, .vtt, or .json, or cannot be parsed into at least one Transcript_Segment, THEN THE Backend SHALL return an error indicating the reason for the failure and SHALL NOT create a Meeting record or persist any Transcript_Segment.
6. WHEN a Meeting is created successfully, THE Frontend SHALL display a confirmation Toast within 2 seconds.

### Requirement 5: Meeting Metadata Management

**User Story:** As a Default_User, I want to edit and delete meetings, so that I can keep my meeting library accurate.

#### Acceptance Criteria

1. WHEN the Default_User submits edited Meeting metadata with a title between 1 and 200 characters and between 0 and 50 participants, THE Backend SHALL update the corresponding Meeting record in the Database with the new title and participants.
2. IF the Default_User submits edited Meeting metadata with an empty title, a title exceeding 200 characters, or more than 50 participants, THEN THE Backend SHALL reject the update, leave the existing Meeting record unchanged in the Database, and return an error response indicating the validation failure.
3. IF the Default_User submits edited metadata for a Meeting that does not exist in the Database, THEN THE Backend SHALL reject the update and return an error response indicating the Meeting was not found.
4. WHEN the Default_User confirms deletion of a Meeting, THE Backend SHALL remove the Meeting record and its associated Transcript, Summary, and Action_Items from the Database.
5. IF the deletion of a Meeting record or any of its associated Transcript, Summary, or Action_Items fails, THEN THE Backend SHALL retain all of the Meeting's records in the Database and return an error response indicating the deletion failure.
6. WHEN the Default_User initiates deletion of a Meeting, THE Frontend SHALL display a confirmation prompt before the deletion is performed.
7. WHEN a Meeting is updated or deleted successfully, THE Frontend SHALL display a confirmation Toast within 2 seconds of receiving the Backend success response.
8. IF the Backend returns an error response for a Meeting update or deletion, THEN THE Frontend SHALL display a Toast indicating the failure.

### Requirement 6: Action Item Management

**User Story:** As a Default_User, I want to add, edit, and complete action items, so that I can track tasks arising from meetings.

#### Acceptance Criteria

1. WHEN the Default_User adds an Action_Item to a Meeting with a description containing 1 to 500 characters, THE Backend SHALL create the Action_Item record with completion status set to incomplete and persist it to the Database.
2. IF the Default_User adds or edits an Action_Item with a description that is empty, contains only whitespace, or exceeds 500 characters, THEN THE Backend SHALL reject the operation, leave the Database unchanged, and return an error indicating the description is invalid.
3. IF the Backend cannot persist an Action_Item create, edit, or completion-status change to the Database, THEN THE Backend SHALL leave the existing Action_Item record unchanged and return an error indicating the operation failed.
4. WHEN the Default_User edits an Action_Item description to a value containing 1 to 500 characters, THE Backend SHALL update the Action_Item record in the Database.
5. WHEN the Default_User marks an Action_Item as complete, THE Backend SHALL set the completion status of the Action_Item to complete in the Database.
6. WHEN the Default_User marks a completed Action_Item as incomplete, THE Backend SHALL set the completion status of the Action_Item to incomplete in the Database.
7. WHEN the Transcript_Detail_View is opened, THE Frontend SHALL display each Action_Item belonging to the Meeting with its description and completion status, ordered by creation time from oldest to newest.
8. WHEN the Transcript_Detail_View is opened for a Meeting that has no Action_Item records, THE Frontend SHALL display an empty-state indication that no action items exist.

### Requirement 7: Transcript File Parsing and Serialization

**User Story:** As a Default_User, I want transcript files to be parsed reliably, so that uploaded transcripts display correctly and consistently.

#### Acceptance Criteria

1. WHEN a valid .txt, .vtt, or .json Transcript_File of up to 10 MB is provided, THE Backend SHALL parse it into an ordered collection of Transcript_Segments preserving source order, each containing a non-empty Speaker_Label, a Timestamp, and text.
2. IF a Transcript_File contains content that does not conform to its declared format, THEN THE Backend SHALL reject the file, return an error indicating the nature and location of the nonconformity, and SHALL NOT persist any Transcript_Segment.
3. IF a Transcript_File exceeds 10 MB or yields zero parseable Transcript_Segments, THEN THE Backend SHALL return an error indicating the reason and SHALL NOT persist any Transcript_Segment.
4. THE Backend SHALL serialize a collection of Transcript_Segments into a normalized JSON representation that preserves segment ordering and includes the Speaker_Label, Timestamp, and text of each Transcript_Segment.
5. FOR ALL valid Transcript_Segment collections, parsing a serialized representation SHALL produce a Transcript_Segment collection that is equivalent to the original, having an identical segment count, identical ordering, and identical Speaker_Label, Timestamp, and text values for each segment (round-trip property).

### Requirement 8: Data Persistence

**User Story:** As a Default_User, I want all my meeting data to persist, so that my data remains available across sessions.

#### Acceptance Criteria

1. WHEN a Meeting, Transcript, Summary, or Action_Item is created or updated, THE Backend SHALL persist the created or updated record in the Database such that it survives System restarts.
2. IF persistence of a Meeting, Transcript, Summary, or Action_Item to the Database fails, THEN THE Backend SHALL return an error indication to the caller and SHALL NOT report the create or update operation as successful.
3. WHEN the System is restarted, THE Backend SHALL retrieve all previously persisted Meetings, Transcripts, Summaries, and Action_Items from the Database without loss or modification of any persisted record.
4. IF retrieval of previously persisted records from the Database fails during System startup, THEN THE Backend SHALL return an error indication and SHALL NOT delete or overwrite the existing persisted records.
5. WHEN the Database is initialized, THE Backend SHALL seed the Database with at least 3 Meetings, where each seeded Meeting has exactly one complete Transcript, exactly one Summary, and at least 1 Action_Item.

### Requirement 9: Fireflies Experience and Layout

**User Story:** As a Default_User, I want the application to look and feel like Fireflies, so that the experience is familiar and productivity-focused.

#### Acceptance Criteria

1. THE Frontend SHALL present a layout consisting of a Meetings_Library view and a Transcript_Detail_View, where the Meetings_Library view lists all available Meetings and selecting a Meeting opens its Transcript_Detail_View.
2. THE Frontend SHALL present the transcript and summary as two distinct, separately labeled panels within the Transcript_Detail_View, each independently scrollable.
3. WHEN the Default_User completes a create, edit, or delete action successfully, THE Frontend SHALL display a Toast indicating the action succeeded within 1 second of completion and SHALL automatically dismiss the Toast after no fewer than 3 seconds and no more than 5 seconds.
4. IF a create, edit, or delete action fails, THEN THE Frontend SHALL display a Toast indicating that the action failed, identifying which action failed, and SHALL retain any user-entered data in the originating form or modal.
5. THE Frontend SHALL provide a form or modal for Meeting creation and a form or modal for Meeting editing, where the editing form is pre-populated with the selected Meeting's current values.
6. WHERE a feature is out of scope, THE Frontend SHALL display a "Coming Soon" placeholder in place of that feature's interactive controls.

### Requirement 10: Mocked and Placeholder Sections

**User Story:** As a Default_User, I want out-of-scope features represented as placeholders, so that the interface communicates the full product vision without implementing every capability.

#### Acceptance Criteria

1. WHERE the real-time meeting bot feature is presented, THE Frontend SHALL display a visually labeled "Coming Soon" placeholder element that contains no interactive controls capable of initiating the feature.
2. WHERE third-party integrations (Zoom, Google Meet, calendar, CRM) are presented, THE Frontend SHALL display a visually labeled "Coming Soon" placeholder element for each listed integration, with no controls that initiate an actual connection to the external service.
3. WHERE team sharing and collaboration features are presented, THE Frontend SHALL display a visually labeled "Coming Soon" placeholder element that contains no interactive controls capable of initiating sharing or collaboration.
4. IF a Default_User activates a control within any "Coming Soon" placeholder, THEN THE Frontend SHALL take no action that initiates the underlying feature and SHALL leave the current view state unchanged.
5. THE System SHALL treat all stored and retrieved data as belonging to a single Default_User and SHALL NOT present any login, sign-up, or credential-entry step before granting access to application data.
6. WHEN the application is opened, THE Frontend SHALL grant the Default_User access to all application data without requiring any authentication input.

## Bonus Requirements (Optional Enhancements)

The following requirements (Requirement 11 through Requirement 16) describe optional bonus enhancements. Implementation of these requirements is not required for the core product and may be deferred or omitted without affecting Requirements 1 through 10.

### Requirement 11: Comments, Highlights, and Soundbites (Bonus)

**User Story:** As a Default_User, I want to comment on, highlight, and clip transcript segments, so that I can capture and revisit the most important moments of a meeting. This is a bonus enhancement.

#### Acceptance Criteria

1. WHEN the Default_User submits a Comment containing 1 to 1,000 characters on a Transcript_Segment, THE Backend SHALL create a Comment record associated with that Transcript_Segment and persist it to the Database within 3 seconds.
2. IF the Default_User submits a Comment that is empty, contains only whitespace, or exceeds 1,000 characters, THEN THE Backend SHALL reject the operation, leave the Database unchanged, and return an error indicating the Comment text is invalid.
3. WHEN the Default_User applies a Highlight to a Transcript_Segment, THE Backend SHALL create a Highlight record associated with that Transcript_Segment and persist it to the Database within 3 seconds.
4. WHEN the Default_User removes an existing Highlight from a Transcript_Segment, THE Backend SHALL delete the corresponding Highlight record from the Database.
5. WHEN the Default_User creates a Soundbite by selecting a start Transcript_Segment and an end Transcript_Segment within the same Meeting, THE Backend SHALL create a Soundbite record storing the start Timestamp and end Timestamp and persist it to the Database within 3 seconds.
6. IF the Default_User creates a Soundbite whose end Timestamp is less than its start Timestamp, or whose start and end Transcript_Segments belong to different Meetings, THEN THE Backend SHALL reject the operation, leave the Database unchanged, and return an error indicating the Soundbite range is invalid.
7. WHEN the Transcript_Detail_View is opened for a Meeting that has one or more associated Comments, Highlights, or Soundbites, THE Frontend SHALL display each Comment, Highlight, and Soundbite alongside its associated Transcript_Segment within 3 seconds of the view loading.
8. IF persistence of a Comment, Highlight, or Soundbite to the Database fails, THEN THE Backend SHALL return an error indication to the caller and SHALL NOT report the operation as successful.

### Requirement 12: Export Transcript or Summary (Bonus)

**User Story:** As a Default_User, I want to export a meeting's transcript or summary to a file, so that I can share or archive meeting content outside the application. This is a bonus enhancement.

#### Acceptance Criteria

1. WHEN the Default_User requests an export of a Meeting's Transcript in PDF, Markdown, or TXT format, THE Backend SHALL generate an Export_Document in the selected format within 10 seconds.
2. WHEN the Default_User requests an export of a Meeting's Summary in PDF, Markdown, or TXT format, THE Backend SHALL generate an Export_Document in the selected format within 10 seconds.
3. THE Backend SHALL include in each generated Export_Document the Meeting title, the Meeting date, the participant names, and the selected Transcript or Summary content.
4. WHEN an Export_Document is generated successfully, THE Frontend SHALL initiate a download of the Export_Document and display a confirmation Toast within 2 seconds.
5. IF the Default_User requests an export in a format other than PDF, Markdown, or TXT, THEN THE Backend SHALL reject the request and return an error indicating the requested format is unsupported.
6. IF generation of an Export_Document fails, THEN THE Backend SHALL return an error indication and THE Frontend SHALL display a Toast indicating the export failed.

### Requirement 13: Global Search Across Meetings (Bonus)

**User Story:** As a Default_User, I want to search across all of my meetings at once, so that I can find content regardless of which meeting it belongs to. This is a bonus enhancement.

#### Acceptance Criteria

1. WHEN the Default_User enters 1 to 200 characters in the Global_Search field, THE Backend SHALL return, within 2 seconds of the last keystroke, all Meetings whose title, Summary text, or any Transcript_Segment text contains the entered text using case-insensitive partial matching.
2. WHEN Global_Search results are returned, THE Frontend SHALL display each matching Meeting with the Meeting title and a matching context excerpt that contains the matched text.
3. WHEN the Default_User selects a Global_Search result, THE Frontend SHALL navigate to the Transcript_Detail_View of the corresponding Meeting within 2 seconds.
4. IF the Global_Search text matches no Meeting, THEN THE Frontend SHALL display an empty-state message indicating that no Meetings matched the search.
5. WHILE Global_Search results are being retrieved from the Backend, THE Frontend SHALL display a loading indicator.
6. IF the Global_Search retrieval from the Backend fails, THEN THE Frontend SHALL display an error message indicating that the search could not be completed and SHALL provide a control to retry the search.

### Requirement 14: Tags and Filtering (Bonus)

**User Story:** As a Default_User, I want to tag meetings by topic and filter by those tags, so that I can organize and locate related meetings. This is a bonus enhancement.

#### Acceptance Criteria

1. WHEN the Default_User adds a Tag containing 1 to 50 characters to a Meeting, THE Backend SHALL associate the Tag with the Meeting and persist the association to the Database within 3 seconds.
2. IF the Default_User adds a Tag that is empty, contains only whitespace, exceeds 50 characters, or duplicates an existing Tag on the same Meeting, THEN THE Backend SHALL reject the operation, leave the Database unchanged, and return an error indicating the Tag is invalid.
3. WHEN the Default_User removes an existing Tag from a Meeting, THE Backend SHALL delete the Tag association from the Database.
4. WHEN the Default_User selects one or more Tags as a filter in the Meetings_Library, THE Frontend SHALL display only Meetings associated with all of the selected Tags within 1 second of the selection.
5. WHEN the Transcript_Detail_View or the Meetings_Library is opened for a Meeting that has one or more associated Tags, THE Frontend SHALL display each associated Tag of that Meeting.
6. IF no Meeting is associated with all of the selected Tags, THEN THE Frontend SHALL display an empty-state message indicating that no Meetings match the selected Tags.
7. IF persistence of a Tag association to the Database fails, THEN THE Backend SHALL return an error indication to the caller and SHALL NOT report the operation as successful.

### Requirement 15: Ask a Question About This Meeting (Bonus)

**User Story:** As a Default_User, I want to ask natural-language questions about a meeting and receive answers, so that I can get information without reading the entire transcript. This is a bonus enhancement.

#### Acceptance Criteria

1. WHEN the Default_User submits a question containing 1 to 1,000 characters in the Meeting_Chat for a Meeting, THE Backend SHALL generate an answer derived from that Meeting's transcript text and return the answer within 30 seconds.
2. WHEN the Backend returns an answer, THE Frontend SHALL display the answer in the Meeting_Chat within 1 second of receiving the Backend response.
3. WHILE the Backend is generating an answer to a submitted question, THE Frontend SHALL display a loading state in the Meeting_Chat.
4. IF the Default_User submits a question that is empty, contains only whitespace, or exceeds 1,000 characters, THEN THE Frontend SHALL reject the submission and display an indication that the question text is invalid, and THE Backend SHALL NOT be invoked.
5. IF the Backend fails to generate an answer, THEN THE Backend SHALL return an error indication and THE Frontend SHALL display a message indicating that the answer could not be generated while retaining the submitted question text.
6. WHEN the Meeting_Chat is opened for a Meeting that has no associated transcript text, THE Frontend SHALL display a message indicating that no transcript is available to answer questions.

### Requirement 16: Dark Mode (Bonus)

**User Story:** As a Default_User, I want to switch between light and dark themes, so that I can use the application comfortably in different lighting conditions. This is a bonus enhancement.

#### Acceptance Criteria

1. WHEN the Default_User toggles the Theme control, THE Frontend SHALL switch the active Theme between light and dark within 500 milliseconds.
2. WHEN the active Theme changes, THE Frontend SHALL apply the selected Theme to the Meetings_Library, the Transcript_Detail_View, and all other application views.
3. WHEN the Default_User selects a Theme, THE Frontend SHALL persist the selected Theme such that it survives session restarts.
4. WHEN the application is opened and a previously persisted Theme exists, THE Frontend SHALL apply the persisted Theme.
5. WHERE no Theme has been previously persisted, THE Frontend SHALL apply the light Theme as the default.
