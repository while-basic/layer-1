//
//  ClaudeService.swift
//  cbc
//
//  Created by Christopher Celaya on 12/25/25.
//

import Foundation

class ClaudeService {
    static let shared = ClaudeService()

    private let apiKey: String
    private let baseURL = "https://api.anthropic.com/v1/messages"

    private init() {
        // API key should be set via environment or configuration
        self.apiKey = ProcessInfo.processInfo.environment["ANTHROPIC_API_KEY"] ?? ""
    }

    func sendMessage(_ userMessage: String, conversationHistory: [Message]) async throws -> String {
        guard !apiKey.isEmpty else {
            throw ClaudeError.missingAPIKey
        }

        var messages: [[String: String]] = []

        // Add conversation history
        for msg in conversationHistory {
            messages.append([
                "role": msg.isUser ? "user" : "assistant",
                "content": msg.content
            ])
        }

        // Add current message
        messages.append([
            "role": "user",
            "content": userMessage
        ])

        let systemPrompt = """
        You are the conversational interface to Christopher Celaya's work and thinking.

        Your role:
        - Answer questions about Christopher's projects, background, and expertise
        - Surface relevant work based on what people ask
        - Maintain his voice: technical, systematic, cross-domain thinker
        - Be honest about what's in progress vs. complete
        - Guide people through his ecosystem naturally

        Available data:
        \(KnowledgeBase.shared.jsonString)

        Response format:
        - Be conversational but substantive
        - When showing projects, you can mention them naturally in your response
        - For multiple projects, describe them conversationally
        - Default to depth over breadth - Christopher builds complete systems
        - Use [PROJECT:project_name] tags when you want to display a project card (e.g., [PROJECT:CLOS])

        Tone:
        - Confident but not arrogant
        - Technical without gatekeeping
        - Enthusiastic about the work
        - Honest about challenges and learning

        Never:
        - Pretend to be Christopher directly
        - Make up projects or details not in knowledge base
        - Use corporate speak or buzzwords
        - Apologize excessively
        """

        let requestBody: [String: Any] = [
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 1000,
            "system": systemPrompt,
            "messages": messages
        ]

        var request = URLRequest(url: URL(string: baseURL)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ClaudeError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw ClaudeError.apiError(statusCode: httpResponse.statusCode, message: errorMessage)
        }

        let jsonResponse = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        guard let content = jsonResponse?["content"] as? [[String: Any]],
              let text = content.first?["text"] as? String else {
            throw ClaudeError.invalidResponse
        }

        return text
    }
}

enum ClaudeError: LocalizedError {
    case missingAPIKey
    case invalidResponse
    case apiError(statusCode: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "Claude API key not configured. Set ANTHROPIC_API_KEY environment variable."
        case .invalidResponse:
            return "Invalid response from Claude API"
        case .apiError(let statusCode, let message):
            return "API Error (\(statusCode)): \(message)"
        }
    }
}
