# Christopher Celaya Portal App

A native iOS app that serves as a conversational portal to Christopher Celaya's complete intellectual ecosystem. Built with SwiftUI and powered by Claude AI.

## 🎯 What This Is

This is NOT a portfolio app. It's a living, AI-powered interface that replaces scattered social media presence with one unified, self-hosted platform.

**The app IS Christopher, not a representation of Christopher.**

## ✨ Features

### Conversational Interface
- Natural language interaction powered by Claude Sonnet 4
- Answers questions about Christopher's work, background, and expertise
- Maintains technical, systematic voice across all responses
- Honest about what's in progress vs. complete

### Project Cards
- Rich, inline display of active projects
- Automatically rendered when mentioned in conversation
- Shows project name, description, status, and tech stack
- Beautiful dark theme with smooth animations

### Knowledge Base
- **CLOS**: Cognitive Life Operating System
- **Neural Child**: Developmental AI architecture
- **Cognitive Artifacts**: Sophisticated reasoning prompts
- **C-Cell Music Production**: AI-enhanced flow state sessions

### Visual Design
- Full-screen dark theme (#0A0A0A)
- SF Pro typography
- Pulsing status indicator
- Smooth, intentional animations
- Cards with shadows and rounded corners

## 🏗️ Architecture

### Tech Stack
- **SwiftUI** - Native iOS interface
- **Claude API** - Conversational intelligence
- **MVVM** - Clean architecture pattern
- **Async/Await** - Modern Swift concurrency

### Project Structure
```
cbc/
├── Models/              # Data models
│   ├── Message.swift
│   ├── Project.swift
│   └── KnowledgeBase.swift
├── ViewModels/          # Business logic
│   └── ChatViewModel.swift
├── Views/               # UI components
│   ├── MessageBubbleView.swift
│   ├── ProjectCardView.swift
│   ├── ChatInputView.swift
│   └── TypingIndicatorView.swift
├── Services/            # API integration
│   └── ClaudeService.swift
└── Extensions/          # Utilities
    └── Color+Hex.swift
```

## 🚀 Getting Started

### Prerequisites
- Xcode 15.0+
- iOS 17.0+ target device or simulator
- Anthropic API key

### Setup
1. Clone the repository
2. Open `cbc.xcodeproj` in Xcode
3. Configure your Anthropic API key:
   - Edit Scheme > Run > Arguments > Environment Variables
   - Add `ANTHROPIC_API_KEY` with your key
4. Build and run (`⌘R`)

See [SETUP.md](SETUP.md) for detailed configuration instructions.

## 💬 Sample Queries

Try these questions to explore the app:

- "What are you working on?"
- "Tell me about your background"
- "Show me your projects"
- "What's CLOS?"
- "Tell me about Neural Child"
- "What's your approach to AI?"
- "How do you think about cognitive optimization?"

## 🎨 Design System

### Colors
- `#0A0A0A` - Background
- `#1A1A1A` - Cards and inputs
- `#FFFFFF` - Primary text
- `#A0A0A0` - Secondary text
- `#0066FF` - Accent (links, buttons)

### Typography
- **Headings**: SF Pro Display, Bold
- **Body**: SF Pro Text, Regular
- **Code**: SF Mono

### Spacing
- Base unit: 8px
- Multiples: 16px, 24px, 32px, 48px

## 🧠 How It Works

### Conversation Flow
1. User types a question
2. Message appears immediately in chat
3. Typing indicator shows during API call
4. Claude responds using knowledge base
5. Project cards render inline when tagged
6. Auto-scroll to latest message

### Project Tagging
Claude can include `[PROJECT:name]` tags in responses:
```
Claude: "I'm working on CLOS right now. [PROJECT:CLOS]"
```
The tag is parsed, removed from text, and the project card is rendered.

### System Prompt
Claude is configured with a comprehensive system prompt that:
- Defines role and personality
- Provides full knowledge base as context
- Specifies response formatting
- Sets tone (confident, technical, honest)
- Enforces boundaries (no making up projects)

## 📱 Demo Screenshots

*App opens to clean dark screen with name and status*
- Christopher Celaya
- Currently: Building CLOS cognitive optimization systems
- Chat input ready

*Ask about projects*
- Conversational responses
- Inline project cards
- Tech stack badges
- Status indicators

## 🔮 Future Enhancements

### Phase 2
- [ ] Notion API integration for live data
- [ ] Media playback (music, video)
- [ ] Persistent chat history
- [ ] Voice input support

### Phase 3
- [ ] MCP server integration
- [ ] Deep linking to projects
- [ ] Export conversations
- [ ] Settings and preferences

### Production
- [ ] API key configuration UI
- [ ] App icon and branding
- [ ] App Store submission
- [ ] Analytics and monitoring

## 🛠️ Development

### Building
```bash
# Open in Xcode
open cbc.xcodeproj

# Or via command line
xcodebuild -project cbc.xcodeproj -scheme cbc -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

### Testing
All components include SwiftUI previews for rapid iteration:
```swift
#Preview {
    ProjectCardView(project: Project(...))
}
```

## 📝 Technical Details

### API Integration
- Endpoint: `https://api.anthropic.com/v1/messages`
- Model: `claude-sonnet-4-20250514`
- Max tokens: 1000 per response
- Version: `2023-06-01`

### State Management
- `@StateObject` for view models
- `@Published` for reactive updates
- `@State` for local UI state
- SwiftUI's built-in observation

### Error Handling
- Network errors caught and displayed
- Missing API key detection
- Graceful failure with user feedback
- Console logging for debugging

## 👤 About

Built by Christopher Celaya - Industrial Electrical Technician, AI researcher, systems thinker, and music producer.

This app represents a new paradigm for personal digital presence: not a static portfolio, but a dynamic, conversational interface to a complete intellectual ecosystem.

## 📄 License

Private project - All rights reserved

## 🙏 Acknowledgments

- Claude API by Anthropic
- SwiftUI by Apple
- Inspired by the vision of AI as cognitive extension, not replacement

---

**Built in one session on December 25, 2024**
**Time investment: ~5 hours**
**Lines of code: ~1000+**
**Technologies: SwiftUI, Claude AI, MVVM, Async/Await**

*The hard part isn't the code - it's the vision.*
