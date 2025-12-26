//
//  ChatViewModel.swift
//  cbc
//
//  Created by Christopher Celaya on 12/25/25.
//

import Foundation
import SwiftUI

@MainActor
class ChatViewModel: ObservableObject {
    @Published var messages: [Message] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func sendMessage(_ text: String) async {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        let userMessage = Message(content: text, isUser: true)
        messages.append(userMessage)

        isLoading = true
        errorMessage = nil

        do {
            let response = try await ClaudeService.shared.sendMessage(text, conversationHistory: messages)

            // Parse response for project tags
            let (cleanedResponse, projects) = parseProjectTags(from: response)

            let assistantMessage = Message(
                content: cleanedResponse,
                isUser: false,
                projectCards: projects.isEmpty ? nil : projects
            )
            messages.append(assistantMessage)

        } catch {
            errorMessage = error.localizedDescription
            let errorMsg = Message(
                content: "Sorry, I encountered an error: \(error.localizedDescription)",
                isUser: false
            )
            messages.append(errorMsg)
        }

        isLoading = false
    }

    private func parseProjectTags(from response: String) -> (String, [Project]) {
        var cleanedResponse = response
        var foundProjects: [Project] = []

        let pattern = "\\[PROJECT:([^\\]]+)\\]"
        guard let regex = try? NSRegularExpression(pattern: pattern) else {
            return (response, [])
        }

        let matches = regex.matches(in: response, range: NSRange(response.startIndex..., in: response))

        for match in matches.reversed() {
            guard let range = Range(match.range, in: response),
                  let projectNameRange = Range(match.range(at: 1), in: response) else {
                continue
            }

            let projectName = String(response[projectNameRange])

            // Find project in knowledge base
            if let project = KnowledgeBase.shared.activeProjects.first(where: { $0.name.lowercased() == projectName.lowercased() }) {
                foundProjects.insert(project, at: 0)
            }

            // Remove the tag from the response
            cleanedResponse = cleanedResponse.replacingCharacters(in: range, with: "")
        }

        return (cleanedResponse.trimmingCharacters(in: .whitespacesAndNewlines), foundProjects)
    }

    func clearMessages() {
        messages = []
        errorMessage = nil
    }
}
