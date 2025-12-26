//----------------------------------------------------------------------------
//File:       ChatViewModel.swift
//Project:     cbc
//Created by:  Celaya Solutions, 2025
//Author:      Christopher Celaya <chris@chriscelaya.com>
//Description: Chat view model with optimized message handling
//Version:     1.0.0
//License:     MIT
//Last Update: November 2025
//----------------------------------------------------------------------------

import Foundation
import SwiftUI
import Combine

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

    // Cache regex to avoid recompiling on every call
    private static let projectTagRegex: NSRegularExpression? = {
        let pattern = "\\[PROJECT:([^\\]]+)\\]"
        return try? NSRegularExpression(pattern: pattern)
    }()
    
    private func parseProjectTags(from response: String) -> (String, [Project]) {
        guard let regex = ChatViewModel.projectTagRegex else {
            return (response, [])
        }
        
        var cleanedResponse = response
        var foundProjects: [Project] = []
        
        // Use NSString for better performance with NSRange
        let nsString = response as NSString
        let matches = regex.matches(in: response, range: NSRange(location: 0, length: nsString.length))

        // Collect all ranges first, then process in reverse
        var rangesToRemove: [NSRange] = []
        
        for match in matches {
            guard match.numberOfRanges > 1 else { continue }
            
            let projectNameRange = match.range(at: 1)
            let projectName = nsString.substring(with: projectNameRange)

            // Find project in knowledge base
            if let project = KnowledgeBase.shared.activeProjects.first(where: { 
                $0.name.lowercased() == projectName.lowercased() 
            }) {
                foundProjects.append(project)
            }
            
            rangesToRemove.append(match.range)
        }

        // Remove tags in reverse order to maintain indices
        for range in rangesToRemove.reversed() {
            if let swiftRange = Range(range, in: cleanedResponse) {
                cleanedResponse.removeSubrange(swiftRange)
            }
        }

        return (cleanedResponse.trimmingCharacters(in: .whitespacesAndNewlines), foundProjects)
    }

    func clearMessages() {
        messages = []
        errorMessage = nil
    }
}
