# Christopher Celaya Portal App - Setup Guide

## Quick Start

### 1. API Key Configuration

The app requires an Anthropic Claude API key to function. You have two options:

#### Option A: Environment Variable (Recommended for Development)
```bash
# In Xcode, edit the scheme:
# Product > Scheme > Edit Scheme > Run > Arguments > Environment Variables
# Add: ANTHROPIC_API_KEY = your_api_key_here
```

#### Option B: Hardcode (For Testing Only)
In `cbc/Services/ClaudeService.swift`, replace line 18:
```swift
self.apiKey = "your_api_key_here"  // Replace ProcessInfo line
```

### 2. Build & Run
1. Open `cbc.xcodeproj` in Xcode
2. Select your target device (iPhone simulator or physical device)
3. Press `⌘R` to build and run

### 3. Demo Queries to Test

Once running, try these queries to test the conversational interface:

- "What are you working on?"
- "Tell me about your background"
- "Show me your projects"
- "What's CLOS?"
- "Tell me about CLOS"
- "What's your approach to AI?"
- "Show me everything"

## Project Structure

```
cbc/
├── Models/
│   ├── Message.swift           # Chat message model
│   ├── Project.swift           # Project card model
│   └── KnowledgeBase.swift     # Christopher's complete knowledge base
├── ViewModels/
│   └── ChatViewModel.swift     # Chat state management
├── Views/
│   ├── MessageBubbleView.swift # Message display
│   ├── ProjectCardView.swift   # Project card display
│   ├── ChatInputView.swift     # Input field
│   └── TypingIndicatorView.swift # Loading animation
├── Services/
│   └── ClaudeService.swift     # Claude API integration
├── Extensions/
│   └── Color+Hex.swift         # Hex color support
├── ContentView.swift           # Main app view
└── cbcApp.swift               # App entry point
```

## Features Implemented

### ✓ Core Features
- [x] Full-screen dark theme (#0A0A0A background)
- [x] Clean header with name and pulsing status
- [x] Conversational chat interface
- [x] Claude API integration with system prompt
- [x] Project card rendering inline with messages
- [x] Typing indicator during API calls
- [x] Auto-scrolling to latest message
- [x] Knowledge base with all projects and bio

### ✓ Visual Design
- [x] SF Pro Display typography
- [x] Dark color scheme (#0A0A0A, #1A1A1A, #0066FF)
- [x] Smooth animations
- [x] Rounded corners and shadows on cards
- [x] Flow layout for tech tags
- [x] Pulsing status indicator

### ✓ Technical
- [x] Native SwiftUI
- [x] Async/await API calls
- [x] MVVM architecture
- [x] Project tag parsing ([PROJECT:name])
- [x] Error handling
- [x] Message persistence in memory

## How It Works

### Conversation Flow
1. User types a question in the chat input
2. Message appears in chat immediately
3. Typing indicator shows while waiting for Claude
4. Claude responds using the knowledge base
5. Response can include inline project cards using `[PROJECT:name]` tags
6. Cards are parsed and rendered beautifully

### Project Card Rendering
When Claude includes `[PROJECT:CLOS]` in a response:
- The tag is parsed and removed from text
- The project is looked up in the knowledge base
- A rich card is rendered showing name, description, status, and tech stack
- Multiple project cards can appear in one response

### Knowledge Base
All of Christopher's work is defined in `KnowledgeBase.swift`:
- Bio and background
- 4 active projects (CLOS, Neural Child, Cognitive Artifacts, C-Cell Music)
- Philosophy and methodology
- Upcoming ventures (Celaya Solutions)

The knowledge base is injected into Claude's system prompt so it can answer intelligently.

## Customization

### Update Current Status
Edit `ContentView.swift` line 105:
```swift
Text("Currently: Your new status here")
```

### Add New Projects
Edit `KnowledgeBase.swift` and add to the `activeProjects` array.

### Modify Colors
All colors are defined inline using hex codes:
- `#0A0A0A` - Main background
- `#1A1A1A` - Card backgrounds, input field
- `#FFFFFF` - Primary text
- `#A0A0A0` - Secondary text
- `#0066FF` - Accent color (links, buttons, status)

### Adjust System Prompt
Edit `ClaudeService.swift` starting at line 34 to modify Claude's behavior.

## Troubleshooting

### "Missing API Key" Error
- Make sure ANTHROPIC_API_KEY is set in your environment
- Check Xcode scheme environment variables
- Verify the API key is valid

### Messages Not Appearing
- Check console for API errors
- Verify internet connection
- Ensure Claude API endpoint is accessible

### Build Errors
- Clean build folder: `⌘⇧K`
- Ensure all Swift files are in the Xcode project
- Check minimum iOS version is set to iOS 17.0+

## Next Steps

### To Make Production-Ready
1. Add API key configuration UI
2. Implement Notion API integration for live data
3. Add media playback (music, video)
4. Persist chat history to disk
5. Add pull-to-refresh to reload knowledge base
6. Implement user settings
7. Add share functionality
8. Create app icon and launch screen

### To Extend Functionality
- Voice input for queries
- Suggested questions chips
- Rich media embeds
- Deep linking to specific projects
- Export conversations
- Multi-language support

## Demo Recording Checklist

Before recording your demo:
- [ ] API key is configured
- [ ] App builds without errors
- [ ] Test all demo queries work
- [ ] Dark mode looks correct
- [ ] Animations are smooth
- [ ] Project cards render properly
- [ ] Status indicator pulses
- [ ] No console errors
- [ ] Running on physical device (not just simulator)

## Support

For questions about the codebase, refer to the inline comments in each Swift file.

Built with SwiftUI for iOS 17.0+
Claude API: Sonnet 4 (claude-sonnet-4-20250514)
