//
//  MessageBubbleView.swift
//  cbc
//
//  Created by Christopher Celaya on 12/25/25.
//

import SwiftUI

struct MessageBubbleView: View {
    let message: Message

    var body: some View {
        VStack(alignment: message.isUser ? .trailing : .leading, spacing: 12) {
            // Message text
            Text(message.content)
                .font(.body)
                .foregroundColor(.white)
                .padding(16)
                .background(message.isUser ? Color(hex: "0066FF") : Color(hex: "1A1A1A"))
                .cornerRadius(16)
                .frame(maxWidth: .infinity, alignment: message.isUser ? .trailing : .leading)

            // Project cards if any
            if let projects = message.projectCards, !projects.isEmpty {
                LazyVStack(spacing: 16) {
                    ForEach(projects) { project in
                        ProjectCardView(project: project)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .drawingGroup() // Optimize rendering for complex views
    }
}

#Preview {
    VStack(spacing: 16) {
        MessageBubbleView(message: Message(
            content: "What are you working on?",
            isUser: true
        ))

        MessageBubbleView(message: Message(
            content: "I'm currently focused on several key projects. Let me show you CLOS, my primary focus right now.",
            isUser: false,
            projectCards: [
                Project(
                    name: "CLOS",
                    description: "Cognitive Life Operating System - AI-augmented cognitive optimization using voice journaling and multi-modal analysis",
                    status: "90-day self-experimentation protocol active",
                    tech: ["iOS Shortcuts", "Voice transcription", "Pattern analysis"]
                )
            ]
        ))
    }
    .background(Color(hex: "0A0A0A"))
}
